'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';

/**
 * Notifica cuando un contrato está disponible para revisión
 */
export async function notifyContractAvailable(
  contractId: string,
  contractVersion: number
) {
  // Obtener datos del contrato, evento y contacto
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
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

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  return createClientNotification({
    type: ClientNotificationType.CONTRACT_AVAILABLE,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Contrato disponible para revisión',
    message: `Hay un contrato disponible para que lo revises y autorices (Versión ${contractVersion})`,
    category: 'contracts',
    priority: NotificationPriority.URGENT,
    route: '/{slug}/cliente/{clientId}/{eventId}/contrato',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      contract_version: contractVersion,
    },
    event_id: event.id,
    contract_id: contractId,
    promise_id: event.promise_id,
  });
}

