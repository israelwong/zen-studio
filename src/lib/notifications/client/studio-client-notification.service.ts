'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateClientNotificationInput } from './types';

/**
 * Crea una notificación para un cliente (contacto)
 * IMPORTANTE: No construimos la ruta aquí, guardamos el template y route_params
 * La ruta se construye en el cliente cuando el usuario hace click
 */
export async function createClientNotification(input: CreateClientNotificationInput) {
  // NO construir la ruta aquí, guardar el template y params tal cual
  // La ruta se construirá en el cliente usando buildRoute
  const route: string | null = input.route ?? null;

  const notification = await prisma.studio_client_notifications.create({
    data: {
      contact_id: input.contact_id,
      studio_id: input.studio_id,
      type: input.type,
      title: input.title,
      message: input.message,
      category: input.category || 'general',
      priority: input.priority || 'MEDIUM',
      route,
      route_params: input.route_params as Prisma.InputJsonValue,
      metadata: input.metadata as Prisma.InputJsonValue,
      promise_id: input.promise_id,
      event_id: input.event_id,
      payment_id: input.payment_id,
      quote_id: input.quote_id,
      deliverable_id: input.deliverable_id,
      contract_id: input.contract_id,
      expires_at: input.expires_at,
      is_active: true,
    },
  });

  // El trigger de base de datos maneja el broadcast automáticamente

  return notification;
}

/**
 * Marca notificación como leída
 */
export async function markAsRead(notificationId: string, contactId: string) {
  return prisma.studio_client_notifications.updateMany({
    where: {
      id: notificationId,
      contact_id: contactId,
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Marca notificación como clickeada y leída
 */
export async function markAsClicked(notificationId: string, contactId: string) {
  return prisma.studio_client_notifications.updateMany({
    where: {
      id: notificationId,
      contact_id: contactId,
    },
    data: {
      clicked_at: new Date(),
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Obtiene notificaciones de un cliente
 */
export async function getClientNotifications(
  contactId: string,
  studioId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  }
) {
  return prisma.studio_client_notifications.findMany({
    where: {
      contact_id: contactId,
      studio_id: studioId,
      is_active: true,
      ...(options?.unreadOnly && { is_read: false }),
    },
    orderBy: { created_at: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * Obtiene conteo de notificaciones no leídas
 */
export async function getUnreadCount(contactId: string, studioId: string) {
  return prisma.studio_client_notifications.count({
    where: {
      contact_id: contactId,
      studio_id: studioId,
      is_active: true,
      is_read: false,
    },
  });
}

/**
 * Elimina/desactiva una notificación
 */
export async function deleteNotification(notificationId: string, contactId: string) {
  return prisma.studio_client_notifications.updateMany({
    where: {
      id: notificationId,
      contact_id: contactId,
    },
    data: {
      is_active: false,
    },
  });
}

/**
 * Obtiene historial completo de notificaciones con paginación
 */
export async function getNotificationsHistory(
  contactId: string,
  studioId: string,
  options?: {
    includeInactive?: boolean;
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    category?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }
) {
  const limit = options?.limit || 50;
  const now = new Date();
  let startDate: Date | undefined;

  // Calcular fecha de inicio según período
  if (options?.period && options.period !== 'all') {
    startDate = new Date();
    switch (options.period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
  }

  const where: Prisma.studio_client_notificationsWhereInput = {
    contact_id: contactId,
    studio_id: studioId,
    ...(options?.includeInactive === false ? { is_active: true } : {}),
    ...(startDate ? { created_at: { gte: startDate } } : {}),
    ...(options?.category ? { category: options.category } : {}),
    ...(options?.search
      ? {
        OR: [
          { title: { contains: options.search, mode: 'insensitive' } },
          { message: { contains: options.search, mode: 'insensitive' } },
        ],
      }
      : {}),
    ...(options?.cursor
      ? {
        created_at: {
          lt: new Date(options.cursor),
        },
      }
      : {}),
  };

  const notifications = await prisma.studio_client_notifications.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1, // +1 para saber si hay más
  });

  const hasMore = notifications.length > limit;
  const data = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].created_at.toISOString() : null;

  return {
    notifications: data,
    hasMore,
    nextCursor,
  };
}

