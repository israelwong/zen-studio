import { Prisma } from '@prisma/client';
import { CreateClientNotificationInput } from './types';
import type { studio_client_notifications } from '@prisma/client';

/**
 * Construye ruta dinámica desde template y params para clientes
 */
export function buildRoute(
  routeTemplate?: string | null,
  params?: CreateClientNotificationInput['route_params'] | Prisma.InputJsonValue | null,
  fallbackSlug?: string | null,
  notification?: Pick<studio_client_notifications, 'event_id' | 'payment_id' | 'deliverable_id' | 'contract_id'> | null
): string | null {
  if (!routeTemplate) return null;

  let route = routeTemplate;
  const paramsObj = (params as Record<string, string | null | undefined>) || {};

  // Asegurar que el slug esté presente
  if (!paramsObj.slug && fallbackSlug) {
    paramsObj.slug = fallbackSlug;
  }

  // Validar que el slug esté presente antes de construir la ruta
  if (!paramsObj.slug) {
    console.warn('[buildRoute] Slug no encontrado en params ni fallback');
    return null;
  }

  // Si faltan IDs en route_params pero están en la notificación, usarlos
  if (notification) {
    if (!paramsObj.eventId && notification.event_id) {
      paramsObj.eventId = notification.event_id;
    }
    if (!paramsObj.paymentId && notification.payment_id) {
      paramsObj.paymentId = notification.payment_id;
    }
    if (!paramsObj.deliverableId && notification.deliverable_id) {
      paramsObj.deliverableId = notification.deliverable_id;
    }
    if (!paramsObj.contractId && notification.contract_id) {
      paramsObj.contractId = notification.contract_id;
    }
  }

  // Si la ruta tiene placeholders, reemplazarlos
  if (route.includes('{')) {
    Object.entries(paramsObj).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        // Reemplazar todas las ocurrencias del placeholder
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        route = route.replace(regex, value);
      }
    });
  }

  // Validar que no queden placeholders sin reemplazar
  if (route.includes('{')) {
    const missingParams = route.match(/{(\w+)}/g);
    console.warn('[buildRoute] Ruta contiene placeholders sin reemplazar:', {
      route,
      missingParams,
      availableParams: Object.keys(paramsObj),
    });
    return null;
  }

  // Validar formato de ruta (debe empezar con /)
  if (!route.startsWith('/')) {
    return `/${route}`;
  }

  return route;
}

