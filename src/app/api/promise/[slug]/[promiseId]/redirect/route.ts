import { NextRequest, NextResponse } from 'next/server';
import { getPublicPromiseRouteState } from '@/lib/actions/public/promesas.actions';
import { determinePromiseRoute } from '@/lib/utils/public-promise-routing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; promiseId: string }> }
) {
  const { slug, promiseId } = await params;

  try {
    const routeStateResult = await getPublicPromiseRouteState(slug, promiseId);

    // ✅ CASO DE USO: Si no hay cotizaciones, redirigir a /pendientes para ver paquetes disponibles
    if (!routeStateResult.success || !routeStateResult.data || routeStateResult.data.length === 0) {
      console.log('[PromiseRedirectAPI] No hay cotizaciones, redirigiendo a /pendientes para ver paquetes');
      return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
    }

    const cotizaciones = routeStateResult.data;

    // Verificar si hay cotización aprobada
    const cotizacionAprobada = cotizaciones.find(cot =>
      cot.status === 'aprobada' || cot.status === 'autorizada' || cot.status === 'approved'
    );

    if (cotizacionAprobada) {
      return NextResponse.json({ redirect: `/${slug}/cliente` });
    }

    // Determinar ruta
    const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId);

    // determinePromiseRoute siempre devuelve una ruta válida (incluyendo /pendientes si no hay cotizaciones válidas)
    return NextResponse.json({ redirect: targetRoute });
  } catch (error) {
    console.error('[PromiseRedirectAPI] Error:', error);
    // En caso de error, redirigir a /pendientes para permitir ver paquetes
    return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
  }
}
