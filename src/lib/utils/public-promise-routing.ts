import type { PublicCotizacion } from '@/types/public-promise';

/**
 * Normaliza el status de una cotización para comparación
 * EXPORTADO para uso en validaciones
 */
export function normalizeStatus(status: string): string {
  if (status === 'cierre') return 'en_cierre';
  return status;
}

/**
 * Tipo para cotizaciones con estado (acepta tanto formato completo como simplificado)
 */
type CotizacionConStatus = 
  | (PublicCotizacion & { status: string; selected_by_prospect?: boolean })
  | { id: string; status: string; selected_by_prospect?: boolean | null };

/**
 * Determina la ruta de redirección basada en el estado de las cotizaciones
 * Prioridad: Negociación > Cierre > Pendientes
 * Acepta tanto formato completo (PublicCotizacion) como simplificado (solo estado)
 */
export function determinePromiseRoute(
  cotizaciones: Array<CotizacionConStatus>,
  slug: string,
  promiseId: string
): string {
  // ⚠️ DEBUG: Log de entrada
  if (process.env.NODE_ENV === 'development') {
    console.log('[determinePromiseRoute] Entrada:', {
      cotizaciones: cotizaciones.map(c => ({ id: c.id, status: c.status, selected: c.selected_by_prospect })),
      slug,
      promiseId,
    });
  }

  // Buscar cotización en negociación (prioridad más alta)
  // Negociación: status === 'negociacion' y NO debe tener selected_by_prospect: true
  const cotizacionNegociacion = cotizaciones.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    const selectedByProspect = cot.selected_by_prospect ?? false;
    const isNegociacion = normalizedStatus === 'negociacion' && selectedByProspect !== true;
    
    // ⚠️ DEBUG: Log de cada cotización evaluada
    if (process.env.NODE_ENV === 'development') {
      console.log(`[determinePromiseRoute] Evaluando cotización ${cot.id}:`, {
        status: cot.status,
        normalizedStatus,
        selectedByProspect,
        isNegociacion,
      });
    }
    
    return isNegociacion;
  });

  if (cotizacionNegociacion) {
    const route = `/${slug}/promise/${promiseId}/negociacion`;
    if (process.env.NODE_ENV === 'development') {
      console.log('[determinePromiseRoute] ✅ Cotización en negociación encontrada, ruta:', route);
    }
    return route;
  }

  // Buscar cotización en cierre (segunda prioridad)
  // Cierre: status === 'en_cierre' o 'cierre' (acepta selección manual del estudio o del prospecto)
  const cotizacionEnCierre = cotizaciones.find((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'en_cierre';
  });

  if (cotizacionEnCierre) {
    return `/${slug}/promise/${promiseId}/cierre`;
  }

  // Verificar si hay cotizaciones pendientes válidas
  const hasPendientes = cotizaciones.some((cot) => {
    const normalizedStatus = normalizeStatus(cot.status);
    return normalizedStatus === 'pendiente';
  });

  // ✅ CASO DE USO: Si no hay cotizaciones válidas, permitir acceso a /pendientes para ver paquetes
  // Esto permite que el prospecto vea paquetes disponibles incluso sin cotizaciones
  if (!hasPendientes) {
    return `/${slug}/promise/${promiseId}/pendientes`;
  }

  // Default: Cotizaciones pendientes
  return `/${slug}/promise/${promiseId}/pendientes`;
}

/**
 * Valida si una ruta es válida para las cotizaciones dadas
 * Usa la misma lógica que determinePromiseRoute para garantizar consistencia
 * 
 * ✅ CASO DE USO: Si no hay cotizaciones, /pendientes es válida para ver paquetes disponibles
 */
export function isRouteValid(
  currentPath: string,
  cotizaciones: Array<CotizacionConStatus>
): boolean {
  // Extraer la ruta base (sin slug y promiseId)
  const pathParts = currentPath.split('/');
  const routeType = pathParts[pathParts.length - 1]; // 'pendientes', 'negociacion', 'cierre'

  // ✅ CASO ESPECIAL: Si no hay cotizaciones, /pendientes es válida para ver paquetes
  if (!cotizaciones || cotizaciones.length === 0) {
    return routeType === 'pendientes';
  }

  // Normalizar estados antes de validar
  const normalizedCotizaciones = cotizaciones.map(cot => ({
    ...cot,
    status: normalizeStatus(cot.status),
  }));

  // Verificar prioridades primero (Negociación > Cierre > Pendientes)
  const hasNegociacion = normalizedCotizaciones.some((cot) => {
    const selectedByProspect = cot.selected_by_prospect ?? false;
    return cot.status === 'negociacion' && selectedByProspect !== true;
  });

  const hasCierre = normalizedCotizaciones.some((cot) => {
    return cot.status === 'en_cierre';
  });

  const hasPendientes = normalizedCotizaciones.some((cot) => {
    return cot.status === 'pendiente';
  });

  switch (routeType) {
    case 'negociacion': {
      // Negociación es válida solo si hay cotización en negociación Y no hay nada con mayor prioridad
      return hasNegociacion;
    }

    case 'cierre': {
      // Cierre es válido solo si hay cotización en cierre Y no hay negociación (mayor prioridad)
      return hasCierre && !hasNegociacion;
    }

    case 'pendientes': {
      // Pendientes es válido solo si hay cotizaciones pendientes Y no hay negociación ni cierre (mayor prioridad)
      return hasPendientes && !hasNegociacion && !hasCierre;
    }

    default:
      // Si es la ruta raíz, siempre es válida (el dispatcher decidirá)
      return true;
  }
}
