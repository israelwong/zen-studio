import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { getPaymentMethodsForAuthorization } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseStats } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
import { PromisePendienteClient } from './components/PromisePendienteClient';

interface PromisePendientePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePendientePage({ params }: PromisePendientePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  // Validar estado actual de la promesa y redirigir si no está en pendiente
  const stateResult = await determinePromiseState(promiseId);
  if (stateResult.success && stateResult.data) {
    const state = stateResult.data.state;
    if (state === 'cierre') {
      redirect(`/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`);
    } else if (state === 'autorizada') {
      redirect(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`);
    }
  }

  // ✅ OPTIMIZACIÓN: Cargar datos en paralelo incluyendo estadísticas
  const [condicionesResult, paymentMethodsResult, cotizacionesResult, statsResult] = await Promise.all([
    obtenerCondicionesComerciales(studioSlug),
    getPaymentMethodsForAuthorization(studioSlug),
    getCotizacionesByPromiseId(promiseId),
    getPromiseStats(promiseId), // ✅ Nueva query consolidada
  ]);

  const condicionesComerciales = condicionesResult.success && condicionesResult.data
    ? condicionesResult.data.map(cc => ({
        id: cc.id,
        name: cc.name,
        description: cc.description,
        advance_percentage: cc.advance_percentage,
        discount_percentage: cc.discount_percentage,
      }))
    : [];

  const paymentMethods = paymentMethodsResult.success && paymentMethodsResult.data
    ? paymentMethodsResult.data
    : [];

  // Encontrar la cotización aprobada
  const selectedCotizacion = cotizacionesResult.success && cotizacionesResult.data
    ? (() => {
        const approvedQuote = cotizacionesResult.data.find(
          (c) => c.status === 'aprobada' || c.status === 'autorizada' || c.status === 'approved'
        );
        return approvedQuote ? {
          id: approvedQuote.id,
          name: approvedQuote.name,
          price: approvedQuote.price,
          status: approvedQuote.status,
          selected_by_prospect: approvedQuote.selected_by_prospect ?? false,
          condiciones_comerciales_id: approvedQuote.condiciones_comerciales_id ?? null,
          condiciones_comerciales: approvedQuote.condiciones_comerciales ? {
            id: approvedQuote.condiciones_comerciales.id,
            name: approvedQuote.condiciones_comerciales.name,
          } : null,
        } : null;
      })()
    : null;

  // ✅ OPTIMIZACIÓN: Preparar estadísticas iniciales
  const initialStats = statsResult.success && statsResult.data
    ? statsResult.data
    : {
        views: {
          totalViews: 0,
          uniqueViews: 0,
          lastView: null,
        },
        cotizaciones: [],
        paquetes: [],
      };

  return (
    <PromisePendienteClient
      initialCondicionesComerciales={condicionesComerciales}
      initialPaymentMethods={paymentMethods}
      initialSelectedCotizacion={selectedCotizacion}
      initialCotizaciones={cotizacionesResult.success && cotizacionesResult.data ? cotizacionesResult.data : []}
      initialStats={initialStats}
    />
  );
}
