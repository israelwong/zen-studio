'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyQuoteApproved(
  studioId: string,
  quoteId: string,
  contactName: string,
  amount: number,
  eventoId?: string | null,
  promiseId?: string | null
) {
  console.log('[notifyQuoteApproved] 📋 Parámetros recibidos:', {
    studioId,
    quoteId,
    contactName,
    amount,
    eventoId,
    promiseId,
    eventoIdType: typeof eventoId,
    eventoIdTruthy: !!eventoId,
  });

  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  // Si hay eventoId, la ruta debe apuntar al evento, sino a la promesa
  const route = eventoId
    ? '/{slug}/studio/business/events/{event_id}'
    : promiseId
      ? '/{slug}/studio/commercial/promises/{promise_id}'
      : '/{slug}/studio/commercial/promises';

  const routeParams: Record<string, string | null | undefined> = {
    slug: studio?.slug,
  };

  if (eventoId) {
    routeParams.event_id = eventoId;
    console.log('[notifyQuoteApproved] ✅ Usando ruta de evento con event_id:', eventoId);
  } else if (promiseId) {
    routeParams.promise_id = promiseId;
    console.log('[notifyQuoteApproved] ✅ Usando ruta de promesa con promise_id:', promiseId);
  } else {
    routeParams.quote_id = quoteId;
    console.log('[notifyQuoteApproved] ⚠️ No hay eventoId ni promiseId, usando ruta de promesas');
  }

  console.log('[notifyQuoteApproved] 🛣️ Ruta y params finales:', {
    route,
    routeParams,
    event_id: eventoId || undefined,
    promise_id: promiseId || undefined,
  });

  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.QUOTE_APPROVED,
    studio_id: studioId,
    title: 'Cotización autorizada',
    message: `La cotización de ${contactName} por $${amount.toLocaleString()} ha sido autorizada`,
    category: 'quotes',
    priority: NotificationPriority.HIGH,
    route,
    route_params: routeParams,
    metadata: {
      contact_name: contactName,
      amount: amount,
    },
    quote_id: quoteId,
    event_id: eventoId || undefined,
    promise_id: promiseId || undefined,
  });
}

