'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';

/**
 * Notifica cuando se recibe/registra un pago
 */
export async function notifyPaymentReceived(
  paymentId: string,
  amount: number,
  paymentMethod: string
) {
  // Obtener datos del pago, evento y contacto
  const payment = await prisma.studio_pagos.findUnique({
    where: { id: paymentId },
    include: {
      promise: {
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
      },
    },
  });

  if (!payment || !payment.promise || !payment.promise.event) {
    return null;
  }

  const { event } = payment.promise;
  const studioSlug = event.studio.slug;
  const formattedAmount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);

  return createClientNotification({
    type: ClientNotificationType.PAYMENT_RECEIVED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Pago recibido',
    message: `Se registró un pago de ${formattedAmount} por ${paymentMethod}`,
    category: 'payments',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}/pagos',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    event_id: event.id,
    payment_id: paymentId,
    promise_id: event.promise_id,
  });
}

/**
 * Notifica cuando se cancela un pago
 */
export async function notifyPaymentCancelled(
  paymentId: string,
  amount: number,
  paymentMethod: string
) {
  // Obtener datos del pago, evento y contacto
  const payment = await prisma.studio_pagos.findUnique({
    where: { id: paymentId },
    include: {
      promise: {
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
      },
    },
  });

  if (!payment || !payment.promise || !payment.promise.event) {
    return null;
  }

  const { event } = payment.promise;
  const studioSlug = event.studio.slug;
  const formattedAmount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);

  return createClientNotification({
    type: ClientNotificationType.PAYMENT_CANCELLED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Pago cancelado',
    message: `Se canceló un pago de ${formattedAmount} por ${paymentMethod}`,
    category: 'payments',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}/pagos',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    event_id: event.id,
    payment_id: paymentId,
    promise_id: event.promise_id,
  });
}

