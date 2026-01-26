import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseRouteState, getPublicPromiseNegociacion, getPublicPromiseMetadata, getPublicPromiseBasicData, getPublicPromiseNegociacionBasic } from '@/lib/actions/public/promesas.actions';
import { isRouteValid } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';
import { PromisePageProvider } from '@/components/promise/PromisePageContext';
import { NegociacionPageBasic } from './NegociacionPageBasic';
import { NegociacionPageDeferred } from './NegociacionPageDeferred';

interface NegociacionPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function NegociacionPage({ params }: NegociacionPageProps) {
  const { slug, promiseId } = await params;

  // ✅ 1. Validación temprana: verificar estado antes de cargar datos pesados
  // ⚠️ OPTIMIZADO: Usa caché compartido con dispatcher
  const routeState = await getPublicPromiseRouteState(slug, promiseId);

  if (!routeState.success || !routeState.data || routeState.data.length === 0) {
    console.log('❌ /negociacion: No hay cotizaciones disponibles. Redirigiendo al raíz.');
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ✅ 2. Control de acceso: verificar si hay cotización en cierre (prioridad más alta)
  // Si hay cotización en cierre, redirigir a cierre en lugar de mostrar error
  const cotizacionEnCierre = routeState.data.find((cot) => {
    const normalizedStatus = cot.status === 'cierre' ? 'en_cierre' : cot.status;
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
    console.log('🔄 /negociacion: Cotización en cierre detectada, redirigiendo a /cierre');
    redirect(`/${slug}/promise/${promiseId}/cierre`);
  }

  // ✅ 3. Control de acceso: usar función unificada isRouteValid
  const currentPath = `/${slug}/promise/${promiseId}/negociacion`;
  const isValid = isRouteValid(currentPath, routeState.data);

  if (!isValid) {
    console.log('❌ Validación fallida en /negociacion: Redirigiendo al raíz.', {
      cotizacionesCount: routeState.data.length,
      cotizaciones: routeState.data.map(c => ({ id: c.id, status: c.status })),
    });
    redirect(`/${slug}/promise/${promiseId}`);
  }

  // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
  const [basicData, priceData] = await Promise.all([
    getPublicPromiseBasicData(slug, promiseId),
    getPublicPromiseNegociacionBasic(slug, promiseId),
  ]);

  if (!basicData.success || !basicData.data || !priceData.success || !priceData.data) {
    redirect(`/${slug}/promise/${promiseId}`);
  }

  const { promise: promiseBasic, studio: studioBasic } = basicData.data;
  const { totalPrice } = priceData.data;

  // ⚠️ STREAMING: Crear promesa para datos pesados (NO await - deferred)
  const deferredDataPromise = getPublicPromiseNegociacion(slug, promiseId);

  return (
    <PromisePageProvider>
      {/* ⚠️ STREAMING: Parte A - Instantánea (datos básicos + precio total) */}
      <NegociacionPageBasic
        promise={promiseBasic}
        studio={studioBasic}
        totalPrice={totalPrice}
        studioSlug={slug}
        promiseId={promiseId}
      />
      
      {/* ⚠️ STREAMING: Parte B - Deferred (datos pesados con Suspense) */}
      <Suspense fallback={<PromisePageSkeleton />}>
        <NegociacionPageDeferred
          dataPromise={deferredDataPromise}
          basicPromise={{ promise: promiseBasic, studio: studioBasic }}
          studioSlug={slug}
          promiseId={promiseId}
        />
      </Suspense>
    </PromisePageProvider>
  );
}

export async function generateMetadata({
  params,
}: NegociacionPageProps): Promise<Metadata> {
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
    const description = `Revisa la propuesta de negociación para tu ${event_type_name || 'evento'} con ${studio_name}`;

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
      description: 'La información solicitada no está disponible',
    };
  }
}
