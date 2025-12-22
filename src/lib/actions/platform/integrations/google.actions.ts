'use server';

import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/utils/encryption';
import type { GoogleOAuthCredentials } from '@/types/google-drive';

export interface GoogleCredentialsResult {
  success: boolean;
  data?: GoogleOAuthCredentials & { apiKey?: string };
  error?: string;
}

/**
 * Obtiene credenciales OAuth de Google desde platform_config
 * Si no están en DB, usa variables de entorno como fallback
 */
export async function obtenerCredencialesGoogle(): Promise<GoogleCredentialsResult> {
  try {
    // Intentar obtener desde platform_config
    const platformConfig = await prisma.platform_config.findFirst({
      select: {
        google_oauth_client_id: true,
        google_oauth_client_secret: true,
        google_oauth_redirect_uri: true,
        google_drive_api_key: true,
      },
    });

    if (
      platformConfig?.google_oauth_client_id &&
      platformConfig?.google_oauth_client_secret &&
      platformConfig?.google_oauth_redirect_uri
    ) {
      // Desencriptar client_secret si está encriptado
      let clientSecret = platformConfig.google_oauth_client_secret;
      try {
        // Intentar desencriptar (si falla, asumir que no está encriptado)
        clientSecret = await decryptToken(clientSecret);
      } catch {
        // Si falla, usar el valor tal cual (puede estar sin encriptar)
        clientSecret = platformConfig.google_oauth_client_secret;
      }

      return {
        success: true,
        data: {
          clientId: platformConfig.google_oauth_client_id,
          clientSecret,
          redirectUri: platformConfig.google_oauth_redirect_uri,
          apiKey: platformConfig.google_drive_api_key || undefined,
        },
      };
    }

    // Fallback a variables de entorno
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!clientId || !clientSecret || !redirectUri) {
      return {
        success: false,
        error: 'Credenciales de Google OAuth no configuradas. Configure en platform_config o variables de entorno.',
      };
    }

    return {
      success: true,
      data: {
        clientId,
        clientSecret,
        redirectUri,
        apiKey: apiKey || undefined,
      },
    };
  } catch (error) {
    console.error('[obtenerCredencialesGoogle] Error:', error);
    return {
      success: false,
      error: 'Error al obtener credenciales de Google',
    };
  }
}

