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

    if (!routeStateResult.success || !routeStateResult.data) {
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

    if (targetRoute === `/${slug}/promise/${promiseId}`) {
      return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
    }

    return NextResponse.json({ redirect: targetRoute });
  } catch (error) {
    console.error('[PromiseRedirectAPI] Error:', error);
    return NextResponse.json({ redirect: `/${slug}/promise/${promiseId}/pendientes` });
  }
}
