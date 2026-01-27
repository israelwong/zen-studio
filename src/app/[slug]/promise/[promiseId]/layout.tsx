import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { PublicPageFooterServer } from '@/components/shared/PublicPageFooterServer';
import { PromiseProfileLink } from '@/components/promise/PromiseProfileLink';
import { PromiseRouteGuard } from '@/components/promise/PromiseRouteGuard';
import { prisma } from '@/lib/prisma';
import { determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';

// Force-dynamic: Evitar caché para validación en tiempo real
export const dynamic = 'force-dynamic';

/**
 * Obtener estado de ruta en el servidor (sin caché)
 * Retorna la ruta objetivo y las cotizaciones formateadas
 */
async function getServerSideRouteState(
  studioSlug: string,
  promiseId: string
): Promise<{
  targetRoute: string;
  quotes: Array<{
    id: string;
    status: string;
    selected_by_prospect: boolean;
    visible_to_client: boolean;
    evento_id: string | null;
  }>;
}> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  // Consulta directa sin caché - Traer TODAS las cotizaciones asociadas al promiseId
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      studio_id: studio.id,
      status: {
        in: ['pendiente', 'negociacion', 'en_cierre', 'cierre', 'aprobada', 'autorizada', 'approved', 'contract_generated', 'contract_signed'],
      },
    },
    select: {
      id: true,
      status: true,
      selected_by_prospect: true,
      visible_to_client: true,
      evento_id: true,
    },
  });

  // Formatear cotizaciones para determinePromiseRoute
  const cotizacionesFormatted = cotizaciones.map(cot => ({
    id: cot.id,
    status: normalizeStatus(cot.status),
    selected_by_prospect: cot.selected_by_prospect,
    visible_to_client: cot.visible_to_client,
    evento_id: cot.evento_id,
  }));

  // Calcular ruta objetivo usando determinePromiseRoute
  const targetRoute = determinePromiseRoute(cotizacionesFormatted, studioSlug, promiseId);

  // Preparar quotes para el cliente
  const quotes = cotizacionesFormatted.map(cot => ({
    id: cot.id,
    status: cot.status,
    selected_by_prospect: cot.selected_by_prospect ?? false,
    visible_to_client: cot.visible_to_client ?? false,
    evento_id: cot.evento_id,
  }));

  return { targetRoute, quotes };
}

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

  // 1. Lógica de datos (fuera de try/catch para el redirect)
  // Obtener estado de ruta en el servidor
  let routeState;
  try {
    routeState = await getServerSideRouteState(slug, promiseId);
  } catch (error) {
    // Si hay error crítico, redirigir a la página del studio
    // redirect() debe estar fuera de try/catch para que Next.js lo maneje correctamente
    redirect(`/${slug}`);
  }

  const { targetRoute, quotes: initialQuotes } = routeState;

  // 2. No hacer redirect aquí en el layout - dejar que PromiseRouteGuard lo haga en el cliente
  // con los datos del servidor. Esto evita problemas con boundaries (error 500) y mantiene
  // la optimización (sin fetch inicial en el cliente, redirección instantánea)

  // Manejo robusto de errores: Obtener información básica del studio y platform config
  const [studioData, platformConfig] = await Promise.allSettled([
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
  const studioInfo = studioData.status === 'fulfilled' ? studioData.value : null;
  const platformConfigData = platformConfig.status === 'fulfilled' ? platformConfig.value : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header fijo */}
      {studioInfo && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {studioInfo.logo_url && (
                <img
                  src={studioInfo.logo_url}
                  alt={studioInfo.studio_name}
                  className="h-9 w-9 object-contain rounded-full"
                />
              )}
              <div>
                <h1 className="text-sm font-semibold text-white">
                  {studioInfo.studio_name}
                </h1>
                {studioInfo.slogan && (
                  <p className="text-[10px] text-zinc-400">
                    {studioInfo.slogan}
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
      {/* Layout Ultraligero: Solo pasa la información, no toma decisiones */}
      <PromiseRouteGuard 
        studioSlug={slug} 
        promiseId={promiseId}
        initialQuotes={initialQuotes}
        targetRoute={targetRoute}
      >
        {/* Contenido principal con padding-top para header y padding-bottom para notificación fija */}
        <div className="pt-[65px] pb-[10px]">
          {children}
        </div>
      </PromiseRouteGuard>

      {/* Footer by Zen - Server Component optimizado */}
      <PublicPageFooterServer
        companyName={platformConfigData?.company_name || 'Zenly México'}
        commercialName={platformConfigData?.commercial_name || platformConfigData?.company_name || 'Zenly Studio'}
        domain={platformConfigData?.domain || 'zenly.mx'}
      />
    </div>
  );
}

