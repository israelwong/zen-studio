'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';

/**
 * Notifica cuando se agrega un entregable
 */
export async function notifyDeliverableAdded(
  deliverableId: string,
  deliverableName: string,
  deliverableType: string
) {
  // Obtener datos del evento y contacto
  const deliverable = await prisma.studio_event_deliverables.findUnique({
    where: { id: deliverableId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!deliverable || !deliverable.event) {
    return null;
  }

  const { event } = deliverable;
  const studioSlug = event.studio.slug;

  return createClientNotification({
    type: ClientNotificationType.DELIVERABLE_ADDED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Nuevo entregable disponible',
    message: `Se agregó "${deliverableName}" a tu evento`,
    category: 'deliverables',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/cliente/{clientId}/{eventId}/entrega-digital',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      deliverable_name: deliverableName,
      deliverable_type: deliverableType,
    },
    event_id: event.id,
    deliverable_id: deliverableId,
    promise_id: event.promise_id,
  });
}

/**
 * Notifica cuando se actualiza un entregable
 */
export async function notifyDeliverableUpdated(
  deliverableId: string,
  deliverableName: string,
  deliverableType: string
) {
  // Obtener datos del evento y contacto
  const deliverable = await prisma.studio_event_deliverables.findUnique({
    where: { id: deliverableId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!deliverable || !deliverable.event) {
    return null;
  }

  const { event } = deliverable;
  const studioSlug = event.studio.slug;

  return createClientNotification({
    type: ClientNotificationType.DELIVERABLE_UPDATED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Entregable actualizado',
    message: `Se actualizó "${deliverableName}" de tu evento`,
    category: 'deliverables',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/cliente/{clientId}/{eventId}/entrega-digital',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      deliverable_name: deliverableName,
      deliverable_type: deliverableType,
    },
    event_id: event.id,
    deliverable_id: deliverableId,
    promise_id: event.promise_id,
  });
}

/**
 * Notifica cuando se elimina un entregable
 */
export async function notifyDeliverableDeleted(
  eventId: string,
  deliverableName: string,
  studioId: string,
  contactId: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  if (!studio) {
    return null;
  }

  return createClientNotification({
    type: ClientNotificationType.DELIVERABLE_DELETED,
    studio_id: studioId,
    contact_id: contactId,
    title: 'Entregable eliminado',
    message: `Se eliminó "${deliverableName}" de tu evento`,
    category: 'deliverables',
    priority: NotificationPriority.LOW,
    route: '/{slug}/cliente/{clientId}/{eventId}/entrega-digital',
    route_params: {
      slug: studio.slug,
      clientId: contactId,
      eventId: eventId,
    },
    metadata: {
      deliverable_name: deliverableName,
    },
    event_id: eventId,
  });
}

