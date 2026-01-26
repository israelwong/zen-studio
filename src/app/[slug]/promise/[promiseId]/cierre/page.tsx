import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseCierre, getPublicPromiseMetadata, getPublicPromiseBasicData, getPublicPromiseCierreBasic } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { CierrePageSkeleton } from './CierrePageSkeleton';
import { CierrePageBasic } from './CierrePageBasic';
import { CierrePageDeferred } from './CierrePageDeferred';

interface CierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function CierrePage({ params }: CierrePageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación temprana: verificar estado antes de cargar datos pesados
  // ⚠️ OPTIMIZADO: Usa caché compartido con dispatcher
  const routeState = await getPublicPromiseRouteState(slug, promiseId);

  if (!routeState.success || !routeState.data || routeState.data.length === 0) {
    console.log('❌ /cierre: No hay cotizaciones disponibles. Redirigiendo al raíz.');
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 2. Control de acceso: verificar si hay cotización en negociación (prioridad más alta)
  // Si hay cotización en negociación, redirigir a negociación en lugar de permitir acceso a cierre
  const cotizacionNegociacion = routeState.data.find((cot) => {
    const normalizedStatus = cot.status === 'cierre' ? 'en_cierre' : cot.status;
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return normalizedStatus === 'negociacion' && selectedByProspect !== true;
  });

  if (cotizacionNegociacion) {
    console.log('🔄 /cierre: Cotización en negociación detectada, redirigiendo a /negociacion');
    redirect(`/${slug}/promise/${promiseId}/negociacion`);
  }

  // ✅ 3. Control de acceso: usar función unificada isRouteValid
  const currentPath = `/${slug}/promise/${promiseId}/cierre`;
  const isValid = isRouteValid(currentPath, routeState.data);

  if (!isValid) {
    console.log('❌ Validación fallida en /cierre: Redirigiendo al raíz.', {
      cotizacionesCount: routeState.data.length,
      cotizaciones: routeState.data.map(c => ({ id: c.id, status: c.status })),
    });
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
  const [basicData, priceData] = await Promise.all([
    getPublicPromiseBasicData(slug, promiseId),
    getPublicPromiseCierreBasic(slug, promiseId),
  ]);

  if (!basicData.success || !basicData.data || !priceData.success || !priceData.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const { promise: promiseBasic, studio: studioBasic } = basicData.data;
  const { totalPrice } = priceData.data;

  // ⚠️ STREAMING: Crear promesa para datos pesados (NO await - deferred)
  const deferredDataPromise = getPublicPromiseCierre(slug, promiseId);

  return (
    <>
      {/* ⚠️ STREAMING: Parte A - Instantánea (datos básicos + precio total) */}
      <CierrePageBasic
        promise={promiseBasic}
        studio={studioBasic}
        totalPrice={totalPrice}
        studioSlug={slug}
        promiseId={promiseId}
      />
      
      {/* ⚠️ STREAMING: Parte B - Deferred (datos pesados con Suspense) */}
      <Suspense fallback={<CierrePageSkeleton />}>
        <CierrePageDeferred
          dataPromise={deferredDataPromise}
          basicPromise={{ promise: promiseBasic, studio: studioBasic }}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </>
  );
}


export async function generateMetadata({
  params,
}: CierrePageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    // Para metadata, usar función ultra-ligera
    const getCachedMetadata = unstable_cache(
      async () => {
        return getPublicPromiseMetadata(slug, promiseId);
      },
      ['public-promise-metadata', slug, promiseId],
      {
        tags: [`public-promise-metadata-${slug}-${promiseId}`],
        revalidate: 3600, // Cachear por 1 hora
      }
    );

    const result = await getCachedMetadata();

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La información solicitada no está disponible',
      };
    }

    const { event_name, event_type_name, studio_name, logo_url } = result.data;
    const eventType = event_type_name || 'Evento';
    const eventName = event_name || '';
    const studioName = studio_name;

    const title = eventName
      ? `${eventType} ${eventName} | ${studioName}`
      : `${eventType} | ${studioName}`;
    const description = `Completa tu contratación para tu ${event_type_name || 'evento'} con ${studio_name}`;

    const icons = logo_url
      ? {
        icon: [
          { url: logo_url, type: 'image/png' },
          { url: logo_url, sizes: '32x32', type: 'image/png' },
          { url: logo_url, sizes: '16x16', type: 'image/png' },
        ],
        apple: [{ url: logo_url, sizes: '180x180', type: 'image/png' }],
        shortcut: logo_url,
      }
      : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Promesa no encontrada',
      description: 'La informaci?n solicitada no est? disponible',
    };
  }
}
