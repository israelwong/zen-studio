import { NextRequest, NextResponse } from 'next/server';
import { procesarCallbackGoogle } from '@/lib/actions/studio/integrations/google-drive.actions';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Si hay error de Google
    if (error) {
      console.error('[Google OAuth Callback] Error de Google:', error);
      return NextResponse.redirect(
        new URL(`/error?message=${encodeURIComponent('Error al conectar con Google')}`, request.url)
      );
    }

    // Validar que tenemos code y state
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/error?message=${encodeURIComponent('Faltan parámetros de OAuth')}`, request.url)
      );
    }

    // Procesar callback
    const result = await procesarCallbackGoogle(code, state);

    if (!result.success) {
      console.error('[Google OAuth Callback] Error procesando:', result.error);
      return NextResponse.redirect(
        new URL(
          `/error?message=${encodeURIComponent(result.error || 'Error al procesar OAuth')}`,
          request.url
        )
      );
    }

    // Si hay returnUrl, redirigir ahí (ej: volver al modal de entregables)
    if (result.returnUrl) {
      try {
        const returnUrl = new URL(result.returnUrl, request.url);
        return NextResponse.redirect(returnUrl);
      } catch {
        // Si la URL es inválida, continuar con el flujo normal
      }
    }

    // Redirigir a página de configuración de integraciones
    const studioSlug = result.studioSlug;
    if (studioSlug) {
      return NextResponse.redirect(
        new URL(`/${studioSlug}/studio/config/integraciones`, request.url)
      );
    }

    // Fallback
    return NextResponse.redirect(new URL('/error?message=Studio no encontrado', request.url));
  } catch (error) {
    console.error('[Google OAuth Callback] Error inesperado:', error);
    return NextResponse.redirect(
      new URL(`/error?message=${encodeURIComponent('Error inesperado')}`, request.url)
    );
  }
}

