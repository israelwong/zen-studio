'use server';

import { prisma } from '@/lib/prisma';

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generar código corto único (5-6 caracteres alfanuméricos)
 */
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // Generar código de 6 caracteres
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Generar o obtener URL corta para una promesa
 */
export async function getOrCreateShortUrl(
  studioSlug: string,
  promiseId: string
): Promise<ActionResponse<{ shortUrl: string; shortCode: string }>> {
  try {
    // Obtener studio y promise
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { id: true, studio_id: true },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    if (promise.studio_id !== studio.id) {
      return { success: false, error: 'La promesa no pertenece al studio' };
    }

    // Verificar si ya existe una URL corta para esta promesa
    const existing = await prisma.studio_short_urls.findFirst({
      where: {
        studio_id: studio.id,
        promise_id: promiseId,
      },
      select: {
        short_code: true,
      },
    });

    if (existing) {
      return {
        success: true,
        data: {
          shortCode: existing.short_code,
          shortUrl: '', // Se construye en el cliente con window.location.origin
        },
      };
    }

    // Generar código único
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = generateShortCode();
      const exists = await prisma.studio_short_urls.findUnique({
        where: { short_code: shortCode },
        select: { id: true },
      });

      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return { success: false, error: 'Error al generar código único' };
    }

    // Crear registro
    const originalUrl = `/${studioSlug}/promise/${promiseId}`;
    
    await prisma.studio_short_urls.create({
      data: {
        short_code: shortCode,
        original_url: originalUrl,
        studio_id: studio.id,
        promise_id: promiseId,
        studio_slug: studioSlug,
      },
    });

    return {
      success: true,
      data: {
        shortCode,
        shortUrl: '', // Se construye en el cliente
      },
    };
  } catch (error) {
    console.error('[SHORT_URL] Error generando URL corta:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar URL corta',
    };
  }
}

/**
 * Generar o obtener URL corta para un post
 */
export async function getOrCreatePostShortUrl(
  studioSlug: string,
  postId: string
): Promise<ActionResponse<{ shortUrl: string; shortCode: string }>> {
  try {
    // Obtener studio y post
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const post = await prisma.studio_posts.findUnique({
      where: { id: postId },
      select: { id: true, studio_id: true },
    });

    if (!post) {
      return { success: false, error: 'Post no encontrado' };
    }

    if (post.studio_id !== studio.id) {
      return { success: false, error: 'El post no pertenece al studio' };
    }

    // Verificar si ya existe una URL corta para este post
    const existing = await prisma.studio_short_urls.findFirst({
      where: {
        studio_id: studio.id,
        post_id: postId,
      },
      select: {
        short_code: true,
      },
    });

    if (existing) {
      return {
        success: true,
        data: {
          shortCode: existing.short_code,
          shortUrl: '', // Se construye en el cliente con window.location.origin
        },
      };
    }

    // Generar código único
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = generateShortCode();
      const exists = await prisma.studio_short_urls.findUnique({
        where: { short_code: shortCode },
        select: { id: true },
      });

      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return { success: false, error: 'Error al generar código único' };
    }

    // Crear registro
    const originalUrl = `/${studioSlug}?post=${postId}`;
    
    await prisma.studio_short_urls.create({
      data: {
        short_code: shortCode,
        original_url: originalUrl,
        studio_id: studio.id,
        post_id: postId,
        studio_slug: studioSlug,
      },
    });

    return {
      success: true,
      data: {
        shortCode,
        shortUrl: '', // Se construye en el cliente
      },
    };
  } catch (error) {
    console.error('[SHORT_URL] Error generando URL corta para post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar URL corta',
    };
  }
}

/**
 * Resolver URL corta y redirigir
 * Funciona tanto para promesas como para posts (usa original_url genérico)
 */
export async function resolveShortUrl(
  shortCode: string
): Promise<ActionResponse<{ originalUrl: string; studioSlug: string; promiseId?: string; postId?: string }>> {
  try {
    const shortUrl = await prisma.studio_short_urls.findUnique({
      where: { short_code: shortCode },
      select: {
        original_url: true,
        studio_slug: true,
        promise_id: true,
        post_id: true,
      },
    });

    if (!shortUrl) {
      return { success: false, error: 'URL corta no encontrada' };
    }

    // Incrementar contador de clicks
    await prisma.studio_short_urls.update({
      where: { short_code: shortCode },
      data: {
        clicks: { increment: 1 },
      },
    });

    return {
      success: true,
      data: {
        originalUrl: shortUrl.original_url,
        studioSlug: shortUrl.studio_slug,
        promiseId: shortUrl.promise_id || undefined,
        postId: shortUrl.post_id || undefined,
      },
    };
  } catch (error) {
    console.error('[SHORT_URL] Error resolviendo URL corta:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al resolver URL corta',
    };
  }
}
