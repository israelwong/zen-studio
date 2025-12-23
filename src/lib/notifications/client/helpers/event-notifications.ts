'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';

/**
 * Notifica cuando cambia la etapa/estatus de un evento
 */
export async function notifyEventStageChanged(
  eventId: string,
  newStageName: string,
  previousStageName?: string
) {
  // Obtener datos del evento y contacto
  const event = await prisma.studio_events.findUnique({
    where: { id: eventId },
    include: {
      studio: {
        select: { id: true, slug: true },
      },
      contact: {
        select: { id: true },
      },
      stage: {
        select: { name: true },
      },
    },
  });

  if (!event) {
    return null;
  }

  const studioSlug = event.studio.slug;
  const eventName = event.promise?.name || 'tu evento';

  let message = `El estatus de "${eventName}" cambió a "${newStageName}"`;
  if (previousStageName) {
    message = `El estatus de "${eventName}" cambió de "${previousStageName}" a "${newStageName}"`;
  }

  return createClientNotification({
    type: ClientNotificationType.EVENT_STAGE_CHANGED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Cambio de estatus del evento',
    message,
    category: 'events',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      event_name: eventName,
      event_stage: newStageName,
      event_stage_previous: previousStageName,
    },
    event_id: eventId,
    promise_id: event.promise_id,
  });
}

