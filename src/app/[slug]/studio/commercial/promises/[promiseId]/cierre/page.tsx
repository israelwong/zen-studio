import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PromiseCierreClient } from './components/PromiseCierreClient';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface PromiseCierrePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromiseCierrePage({ params }: PromiseCierrePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  // ✅ OPTIMIZACIÓN: Paralelizar queries independientes
  const [stateResult, cotizacionesResult] = await Promise.all([
    determinePromiseState(promiseId),
    getCotizacionesByPromiseId(promiseId),
  ]);

  // Validar estado actual de la promesa y redirigir si no está en cierre
  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    if (state === 'pendiente') {
      redirect(`/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`);
    } else if (state === 'autorizada') {
      redirect(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`);
    }
  }

  // Buscar cotización en cierre o aprobada sin evento
  const cotizacionEnCierre: CotizacionListItem | null = cotizacionesResult.success && cotizacionesResult.data
    ? (() => {
        const enCierre = cotizacionesResult.data.find(c => c.status === 'en_cierre');
        const aprobada = cotizacionesResult.data.find(
          c => (c.status === 'aprobada' || c.status === 'approved') && !c.evento_id
        );
        return enCierre || aprobada || null;
      })()
    : null;

  return (
    <PromiseCierreClient
      initialCotizacionEnCierre={cotizacionEnCierre}
    />
  );
}
