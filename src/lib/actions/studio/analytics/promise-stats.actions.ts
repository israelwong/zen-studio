"use server";

import { prisma } from "@/lib/prisma";

export interface PromiseStatsOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PromiseStatsData {
  // Status actual
  currentStatus: {
    pending: number;
    negotiation: number;
    closing: number;
    approved: number;
    archived: number;
    canceled: number;
  };
  // Conversiones en período
  conversions: {
    total: number;
    totalValue: number;
    byDate: Array<{ date: string; count: number; value: number }>;
  };
  // Canceladas en período
  canceled: {
    total: number;
    byDate: Array<{ date: string; count: number }>;
  };
  // Cambios de stage en período
  stageChanges: {
    total: number;
    byStage: Array<{ stageSlug: string; stageName: string; count: number }>;
    byDate: Array<{ date: string; count: number }>;
  };
  // Promesas creadas en período
  created: {
    total: number;
    byDate: Array<{ date: string; count: number }>;
  };
}

export async function getPromiseStats(
  studioId: string,
  options?: PromiseStatsOptions
): Promise<{ success: boolean; data?: PromiseStatsData; error?: string }> {
  try {
    const dateFrom = options?.dateFrom || (() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    const dateTo = options?.dateTo || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    })();

    // Obtener stages del studio
    const stages = await prisma.studio_promise_pipeline_stages.findMany({
      where: {
        studio_id: studioId,
        is_active: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const stageMap = new Map(stages.map(s => [s.slug, s]));

    // 1. Status actual de promesas
    const currentPromises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studioId,
        is_test: false,
        pipeline_stage_id: { not: null },
      },
      select: {
        pipeline_stage: {
          select: {
            slug: true,
          },
        },
      },
    });

    const currentStatus = {
      pending: 0,
      negotiation: 0,
      closing: 0,
      approved: 0,
      archived: 0,
      canceled: 0,
    };

    currentPromises.forEach(p => {
      const slug = p.pipeline_stage?.slug || 'pending';
      if (slug in currentStatus) {
        currentStatus[slug as keyof typeof currentStatus]++;
      }
    });

    // 2. Conversiones (promesas que pasaron a "approved" en el período)
    const conversionsHistory = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        to_stage_slug: 'approved',
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
        promise_id: true,
        promise: {
          select: {
            quotes: {
              where: {
                status: { in: ['aprobada', 'autorizada', 'approved'] },
                archived: false,
              },
              select: {
                price: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    // Agrupar conversiones por fecha
    const conversionsByDate = new Map<string, { count: number; value: number }>();
    conversionsHistory.forEach(entry => {
      const dateKey = entry.created_at.toISOString().split('T')[0];
      const current = conversionsByDate.get(dateKey) || { count: 0, value: 0 };
      const quoteValue = entry.promise.quotes[0]?.price || 0;
      conversionsByDate.set(dateKey, {
        count: current.count + 1,
        value: current.value + Number(quoteValue),
      });
    });

    const conversionsByDateArray = Array.from(conversionsByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Canceladas en período
    const canceledHistory = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        to_stage_slug: 'canceled',
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
      },
    });

    const canceledByDate = new Map<string, number>();
    canceledHistory.forEach(entry => {
      const dateKey = entry.created_at.toISOString().split('T')[0];
      canceledByDate.set(dateKey, (canceledByDate.get(dateKey) || 0) + 1);
    });

    const canceledByDateArray = Array.from(canceledByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Cambios de stage en período
    const stageChanges = await prisma.studio_promise_status_history.findMany({
      where: {
        promise: {
          studio_id: studioId,
        },
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        to_stage_slug: true,
        created_at: true,
      },
    });

    const changesByStage = new Map<string, number>();
    const changesByDate = new Map<string, number>();

    stageChanges.forEach(change => {
      const slug = change.to_stage_slug;
      changesByStage.set(slug, (changesByStage.get(slug) || 0) + 1);

      const dateKey = change.created_at.toISOString().split('T')[0];
      changesByDate.set(dateKey, (changesByDate.get(dateKey) || 0) + 1);
    });

    const changesByStageArray = Array.from(changesByStage.entries())
      .map(([slug, count]) => ({
        stageSlug: slug,
        stageName: stageMap.get(slug)?.name || slug,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const changesByDateArray = Array.from(changesByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Promesas creadas en período
    const createdPromises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studioId,
        is_test: false,
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        created_at: true,
      },
    });

    const createdByDate = new Map<string, number>();
    createdPromises.forEach(promise => {
      const dateKey = promise.created_at.toISOString().split('T')[0];
      createdByDate.set(dateKey, (createdByDate.get(dateKey) || 0) + 1);
    });

    const createdByDateArray = Array.from(createdByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalConversionValue = conversionsHistory.reduce((sum, entry) => {
      const quoteValue = entry.promise.quotes[0]?.price || 0;
      return sum + Number(quoteValue);
    }, 0);

    return {
      success: true,
      data: {
        currentStatus,
        conversions: {
          total: conversionsHistory.length,
          totalValue: totalConversionValue,
          byDate: conversionsByDateArray,
        },
        canceled: {
          total: canceledHistory.length,
          byDate: canceledByDateArray,
        },
        stageChanges: {
          total: stageChanges.length,
          byStage: changesByStageArray,
          byDate: changesByDateArray,
        },
        created: {
          total: createdPromises.length,
          byDate: createdByDateArray,
        },
      },
    };
  } catch (error) {
    console.error('[getPromiseStats] Error:', error);
    return {
      success: false,
      error: 'Error al obtener estadísticas de promesas',
    };
  }
}

export interface AcquisitionChannelStats {
  channelId: string;
  channelName: string;
  count: number;
}

export interface ReferrerStats {
  referrerId: string | null;
  referrerName: string;
  count: number;
}

export interface SocialNetworkStats {
  networkId: string;
  networkName: string;
  count: number;
}

export interface PromiseAcquisitionStatsData {
  channels: AcquisitionChannelStats[];
  referrers: ReferrerStats[];
  socialNetworks: SocialNetworkStats[];
}

export async function getPromiseAcquisitionStats(
  studioId: string,
  options?: PromiseStatsOptions
): Promise<{ success: boolean; data?: PromiseAcquisitionStatsData; error?: string }> {
  try {
    const dateFrom = options?.dateFrom || (() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    const dateTo = options?.dateTo || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    })();

    // Obtener todas las promesas con datos de adquisición
    const promises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studioId,
        is_test: false,
        created_at: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      include: {
        contact: {
          select: {
            acquisition_channel_id: true,
            social_network_id: true,
            referrer_contact_id: true,
            referrer_name: true,
            acquisition_channel: {
              select: {
                id: true,
                name: true,
              },
            },
            social_network: {
              select: {
                id: true,
                name: true,
              },
            },
            referrer_contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Estadísticas por canal de adquisición
    const channelsMap = new Map<string, { name: string; count: number }>();
    promises.forEach(promise => {
      const channelId = promise.contact.acquisition_channel_id;
      const channelName = promise.contact.acquisition_channel?.name || 'Sin canal';
      if (channelId) {
        const current = channelsMap.get(channelId) || { name: channelName, count: 0 };
        channelsMap.set(channelId, { name: channelName, count: current.count + 1 });
      }
    });

    const channels: AcquisitionChannelStats[] = Array.from(channelsMap.entries())
      .map(([channelId, data]) => ({
        channelId,
        channelName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Estadísticas por referido
    // Normalizar nombre: trim, lowercase para comparación
    const normalizeName = (name: string): string => {
      return name.trim().toLowerCase();
    };

    // Separar referidos CON contacto y SIN contacto
    // Referidos CON contacto: agrupar por referrer_contact_id
    const referrersWithContactMap = new Map<string, { id: string; name: string; count: number }>();
    
    // Referidos SIN contacto: agrupar por nombre normalizado
    const referrersWithoutContactMap = new Map<string, { name: string; count: number }>();
    
    promises.forEach(promise => {
      const referrerId = promise.contact.referrer_contact_id;
      const referrerName = promise.contact.referrer_contact?.name || promise.contact.referrer_name;
      
      if (!referrerName || referrerName.trim() === '') return;

      const displayName = referrerName.trim();

      if (referrerId) {
        // Tiene contacto: agrupar por ID
        const existing = referrersWithContactMap.get(referrerId);
        if (existing) {
          existing.count += 1;
        } else {
          referrersWithContactMap.set(referrerId, {
            id: referrerId,
            name: displayName,
            count: 1,
          });
        }
      } else {
        // No tiene contacto: agrupar por nombre normalizado
        const normalizedName = normalizeName(displayName);
        const existing = referrersWithoutContactMap.get(normalizedName);
        if (existing) {
          existing.count += 1;
        } else {
          referrersWithoutContactMap.set(normalizedName, {
            name: displayName,
            count: 1,
          });
        }
      }
    });

    // Combinar ambos grupos
    const referrersWithContact: ReferrerStats[] = Array.from(referrersWithContactMap.values())
      .map((data) => ({
        referrerId: data.id,
        referrerName: data.name,
        count: data.count,
      }));

    const referrersWithoutContact: ReferrerStats[] = Array.from(referrersWithoutContactMap.values())
      .map((data) => ({
        referrerId: null,
        referrerName: data.name,
        count: data.count,
      }));

    // Combinar y ordenar por conteo
    const referrers: ReferrerStats[] = [...referrersWithContact, ...referrersWithoutContact]
      .sort((a, b) => b.count - a.count);

    // Estadísticas por red social
    const socialNetworksMap = new Map<string, { name: string; count: number }>();
    promises.forEach(promise => {
      const networkId = promise.contact.social_network_id;
      const networkName = promise.contact.social_network?.name || 'Sin red social';
      if (networkId) {
        const current = socialNetworksMap.get(networkId) || { name: networkName, count: 0 };
        socialNetworksMap.set(networkId, { name: networkName, count: current.count + 1 });
      }
    });

    const socialNetworks: SocialNetworkStats[] = Array.from(socialNetworksMap.entries())
      .map(([networkId, data]) => ({
        networkId,
        networkName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: {
        channels,
        referrers,
        socialNetworks,
      },
    };
  } catch (error) {
    console.error('[getPromiseAcquisitionStats] Error:', error);
    return {
      success: false,
      error: 'Error al obtener estadísticas de adquisición',
    };
  }
}

/**
 * Actualizar referrer_contact_id para todos los contactos que tienen un referrer_name específico
 */
export async function updateReferrerAssociation(
  studioId: string,
  referrerName: string,
  referrerContactId: string
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Normalizar nombre para buscar
    const normalizeName = (name: string): string => {
      return name.trim().toLowerCase();
    };
    const normalizedReferrerName = normalizeName(referrerName);

    // Buscar todos los contactos que tienen este referrer_name (sin referrer_contact_id)
    const contactsToUpdate = await prisma.studio_contacts.findMany({
      where: {
        studio_id: studioId,
        referrer_name: { not: null },
        referrer_contact_id: null, // Solo los que no tienen contacto asociado
      },
      select: {
        id: true,
        referrer_name: true,
      },
    });

    // Filtrar por nombre normalizado
    const matchingContacts = contactsToUpdate.filter(
      (contact) => contact.referrer_name && normalizeName(contact.referrer_name) === normalizedReferrerName
    );

    if (matchingContacts.length === 0) {
      return { success: false, error: 'No se encontraron contactos con ese referido' };
    }

    // Actualizar todos los contactos que coinciden
    const result = await prisma.studio_contacts.updateMany({
      where: {
        id: { in: matchingContacts.map((c) => c.id) },
      },
      data: {
        referrer_contact_id: referrerContactId,
        referrer_name: null, // Limpiar referrer_name ya que ahora tiene referrer_contact_id
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  } catch (error) {
    console.error('[updateReferrerAssociation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar asociación de referido',
    };
  }
}

export interface ReferrerDetailItem {
  promiseId: string;
  contactName: string;
  eventId: string | null;
  eventDate: Date | null;
  closingAmount: number | null;
  eventTypeName: string | null;
}

/**
 * Obtener detalles de promesas/eventos de un referido específico
 */
export async function getReferrerDetails(
  studioId: string,
  referrerId: string | null,
  referrerName: string
): Promise<{ success: boolean; data?: ReferrerDetailItem[]; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Normalizar nombre para buscar
    const normalizeName = (name: string): string => {
      return name.trim().toLowerCase();
    };
    const normalizedReferrerName = normalizeName(referrerName);

    // Buscar promesas que tienen este referido
    const whereClause: any = {
      studio_id: studioId,
      is_test: false,
    };

    if (referrerId) {
      // Si tiene ID, buscar por referrer_contact_id
      whereClause.contact = {
        referrer_contact_id: referrerId,
      };
    } else {
      // Si no tiene ID, buscar por referrer_name normalizado
      whereClause.contact = {
        referrer_name: { not: null },
        referrer_contact_id: null,
      };
    }

    const promises = await prisma.studio_promises.findMany({
      where: whereClause,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            referrer_contact_id: true,
            referrer_name: true,
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            event_date: true,
          },
        },
        quotes: {
          where: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
            evento_id: { not: null },
            archived: false,
          },
          select: {
            id: true,
            price: true,
            evento_id: true,
          },
          take: 1,
        },
      },
    });

    // Filtrar por nombre normalizado si no hay ID
    const filteredPromises = referrerId
      ? promises
      : promises.filter(
          (p) =>
            p.contact.referrer_name &&
            normalizeName(p.contact.referrer_name) === normalizedReferrerName
        );

    const details: ReferrerDetailItem[] = filteredPromises.map((promise) => {
      const approvedQuote = promise.quotes[0];
      return {
        promiseId: promise.id,
        contactName: promise.contact.name,
        eventId: promise.event?.id || approvedQuote?.evento_id || null,
        eventDate: promise.event?.event_date || null,
        closingAmount: approvedQuote?.price ? Number(approvedQuote.price) : null,
        eventTypeName: promise.event_type?.name || null,
      };
    });

    return {
      success: true,
      data: details,
    };
  } catch (error) {
    console.error('[getReferrerDetails] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener detalles del referido',
    };
  }
}
