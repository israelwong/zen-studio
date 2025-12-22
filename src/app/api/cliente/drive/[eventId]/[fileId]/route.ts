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

    // Obtener el contenido del archivo
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
      }
    );

    // Convertir stream a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Determinar content type
    const contentType = file.data.mimeType || 'application/octet-stream';

    // Retornar el archivo con headers apropiados
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${file.data.name || 'file'}"`,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
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

