import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicPageFooterServer } from '@/components/shared/PublicPageFooterServer';
import { PromiseProfileLink } from '@/components/promise/PromiseProfileLink';
import { PromiseRouteGuard } from '@/components/promise/PromiseRouteGuard';
import { prisma } from '@/lib/prisma';

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Obtener platform config con caché (una vez por request)
 */
async function getPlatformConfigCached() {
  const getCachedConfig = unstable_cache(
    async () => {
      try {
        const config = await prisma.platform_config.findFirst({
          orderBy: { createdAt: 'desc' },
          select: {
            company_name: true,
            company_name_long: true,
            commercial_name: true,
            commercial_name_short: true,
            domain: true,
          },
        });
        return config;
      } catch (error) {
        console.error('[getPlatformConfigCached] Error:', error);
        return null;
      }
    },
    ['platform-config'],
    {
      tags: ['platform-config'],
      revalidate: 3600, // Cachear por 1 hora
    }
  );

  return getCachedConfig();
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug, promiseId } = await params;

  // Manejo robusto de errores: Evitar que errores aborten boundaries
  // Obtener información básica del studio y platform config
  // NO necesitamos routeState aquí - el Direct Navigator lo obtiene del servidor
  const [studio, platformConfig] = await Promise.allSettled([
    prisma.studios.findUnique({
      where: { slug },
      select: {
        studio_name: true,
        slogan: true,
        logo_url: true,
      },
    }),
    getPlatformConfigCached(),
  ]);

  // Extraer valores de las promesas resueltas
  const studioData = studio.status === 'fulfilled' ? studio.value : null;
  const platformConfigData = platformConfig.status === 'fulfilled' ? platformConfig.value : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      {studioData && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {studioData.logo_url && (
                <img
                  src={studioData.logo_url}
                  alt={studioData.studio_name}
                  className="h-9 w-9 object-contain rounded-full"
                />
              )}
              <div>
                <h1 className="text-sm font-semibold text-white">
                  {studioData.studio_name}
                </h1>
                {studioData.slogan && (
                  <p className="text-[10px] text-zinc-400">
                    {studioData.slogan}
                  </p>
                )}
              </div>
            </div>
            <PromiseProfileLink
              href={`/${slug}`}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Ver perfil
            </PromiseProfileLink>
          </div>
        </header>
      )}

      {/* Guardián de ruta: Verifica que el usuario esté en la ruta correcta según el estado de las cotizaciones */}
      <PromiseRouteGuard studioSlug={slug} promiseId={promiseId} />

      {/* Contenido principal con padding-top para header y padding-bottom para notificación fija */}
      <div className="pt-[65px] pb-[10px]">
        {children}
      </div>

      {/* Footer by Zen - Server Component optimizado */}
      <PublicPageFooterServer
        companyName={platformConfigData?.company_name || 'Zenly México'}
        commercialName={platformConfigData?.commercial_name || platformConfigData?.company_name || 'Zenly Studio'}
        domain={platformConfigData?.domain || 'zenly.mx'}
      />
    </div>
  );
}

