import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { decryptToken } from '@/lib/utils/encryption';

/**
 * Endpoint API para servir archivos de Google Drive como proxy
 * Valida acceso del cliente y sirve el archivo con autenticación del servidor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; fileId: string }> }
) {
  try {
    const { eventId, fileId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const clientIdParam = searchParams.get('clientId');

    if (!clientIdParam) {
      return NextResponse.json(
        { error: 'clientId requerido' },
        { status: 400 }
      );
    }

    // Validar que el evento pertenezca al cliente
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: eventId,
        contact_id: clientIdParam,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        event: {
          select: {
            studio: {
              select: {
                slug: true,
                is_google_connected: true,
              },
            },
          },
        },
        studio: {
          select: {
            slug: true,
            is_google_connected: true,
          },
        },
      },
    });

    if (!promise) {
      return NextResponse.json(
        { error: 'Evento no encontrado o sin acceso' },
        { status: 403 }
      );
    }

    const studioSlug = promise.event?.studio?.slug || promise.studio?.slug;
    const isGoogleConnected = promise.event?.studio?.is_google_connected ?? promise.studio?.is_google_connected ?? false;

    if (!studioSlug || !isGoogleConnected) {
      return NextResponse.json(
        { error: 'Google Drive no está conectado' },
        { status: 403 }
      );
    }

    // Obtener credenciales OAuth compartidas
    const credentialsResult = await obtenerCredencialesGoogle();
    if (!credentialsResult.success || !credentialsResult.data) {
      return NextResponse.json(
        { error: 'Credenciales de Google no disponibles' },
        { status: 500 }
      );
    }

    // Extraer credenciales sin desestructuración para evitar conflictos de nombres
    const creds = credentialsResult.data;
    const oauthClientId = creds.clientId;
    const oauthClientSecret = creds.clientSecret;
    const oauthRedirectUri = creds.redirectUri;

    // Obtener studio y su refresh token
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        google_oauth_refresh_token: true,
      },
    });

    if (!studio || !studio.google_oauth_refresh_token) {
      return NextResponse.json(
        { error: 'Studio no tiene Google conectado' },
        { status: 403 }
      );
    }

    // Desencriptar refresh token
    const refreshToken = await decryptToken(studio.google_oauth_refresh_token);

    // Crear OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      oauthClientId,
      oauthClientSecret,
      oauthRedirectUri
    );

    // Configurar refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Crear cliente de Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Obtener información del archivo
    const file = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, webContentLink, size',
    });

    // Obtener el contenido del archivo como stream
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
      }
    );

    // Determinar content type
    const contentType = file.data.mimeType || 'application/octet-stream';

    // Convertir Node.js stream a ReadableStream para Next.js
    // Esto permite streaming sin cargar todo el archivo en memoria
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response.data) {
            controller.enqueue(new Uint8Array(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Retornar el stream con headers de caché optimizados
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.data.name || 'file')}"`,
        // Caché agresivo: 24 horas para archivos, revalidación en background
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        // Headers adicionales para Vercel Edge Cache
        'CDN-Cache-Control': 'public, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('[API /cliente/drive] Error:', error);
    
    if (error?.code === 404 || error?.response?.status === 404) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener archivo' },
      { status: 500 }
    );
  }
}

