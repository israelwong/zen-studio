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

  // Usar promise_id en la ruta para consistencia con el resto de la aplicación
  // El promise_id es el ID principal usado en ClientEvent y navegación
  const promiseId = event.promise_id || payment.promise.id;

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
      eventId: promiseId, // Usar promise_id en lugar de event.id
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    event_id: event.id,
    payment_id: paymentId,
    promise_id: promiseId,
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

  // Usar promise_id en la ruta para consistencia con el resto de la aplicación
  const promiseId = event.promise_id || payment.promise.id;

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
      eventId: promiseId, // Usar promise_id en lugar de event.id
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    event_id: event.id,
    payment_id: paymentId,
    promise_id: promiseId,
  });
}

/**
 * Notifica cuando se actualiza/edita un pago
 */
export async function notifyPaymentUpdated(
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

  // Usar promise_id en la ruta para consistencia con el resto de la aplicación
  const promiseId = event.promise_id || payment.promise.id;

  return createClientNotification({
    type: ClientNotificationType.PAYMENT_UPDATED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Pago actualizado',
    message: `Se actualizó un pago de ${formattedAmount} por ${paymentMethod}`,
    category: 'payments',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}/pagos',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: promiseId,
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    event_id: event.id,
    payment_id: paymentId,
    promise_id: promiseId,
  });
}

/**
 * Notifica cuando se elimina un pago
 */
export async function notifyPaymentDeleted(
  paymentId: string,
  amount: number,
  paymentMethod: string,
  promiseId: string,
  contactId: string,
  studioId: string,
  studioSlug: string
) {
  const formattedAmount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);

  return createClientNotification({
    type: ClientNotificationType.PAYMENT_DELETED,
    studio_id: studioId,
    contact_id: contactId,
    title: 'Pago eliminado',
    message: `Se eliminó un pago de ${formattedAmount} por ${paymentMethod}`,
    category: 'payments',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}/pagos',
    route_params: {
      slug: studioSlug,
      clientId: contactId,
      eventId: promiseId,
    },
    metadata: {
      payment_amount: amount,
      payment_method: paymentMethod,
    },
    payment_id: paymentId,
    promise_id: promiseId,
  });
}

