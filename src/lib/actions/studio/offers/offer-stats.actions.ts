"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
  GetOfferStatsSchema,
  type GetOfferStatsData,
} from "@/lib/actions/schemas/offer-schemas";
import type { OfferStatsResponse, OfferStats } from "@/types/offers";

/**
 * Obtiene estadísticas de múltiples ofertas en batch (elimina N+1 queries)
 * Retorna un mapa de offer_id -> stats
 */
export async function getOffersStatsBatch(
  offerIds: string[]
): Promise<{
  success: boolean;
  data?: Record<string, {
    total_visits: number;
    total_leadform_visits: number;
    total_submissions: number;
    conversion_rate: number;
  }>;
  error?: string;
}> {
  try {
    if (offerIds.length === 0) {
      return { success: true, data: {} };
    }

    return await retryDatabaseOperation(async () => {
      // Obtener conteos de visitas por tipo y oferta
      const landingVisits = await prisma.studio_offer_visits.groupBy({
        by: ['offer_id'],
        where: {
          offer_id: { in: offerIds },
          visit_type: 'landing',
        },
        _count: true,
      });

      const leadformVisits = await prisma.studio_offer_visits.groupBy({
        by: ['offer_id'],
        where: {
          offer_id: { in: offerIds },
          visit_type: 'leadform',
        },
        _count: true,
      });

      // Obtener conteos de submissions por oferta
      const submissions = await prisma.studio_offer_submissions.groupBy({
        by: ['offer_id'],
        where: {
          offer_id: { in: offerIds },
        },
        _count: true,
      });

      // Crear mapas para acceso rápido
      const landingVisitsMap = new Map(
        landingVisits.map(v => [v.offer_id, v._count])
      );
      const leadformVisitsMap = new Map(
        leadformVisits.map(v => [v.offer_id, v._count])
      );
      const submissionsMap = new Map(
        submissions.map(s => [s.offer_id, s._count])
      );

      // Construir resultado
      const statsMap: Record<string, {
        total_visits: number;
        total_leadform_visits: number;
        total_submissions: number;
        conversion_rate: number;
      }> = {};

      offerIds.forEach(offerId => {
        const landingCount = landingVisitsMap.get(offerId) || 0;
        const leadformCount = leadformVisitsMap.get(offerId) || 0;
        const submissionsCount = submissionsMap.get(offerId) || 0;
        const conversionRate = leadformCount > 0
          ? (submissionsCount / leadformCount) * 100
          : 0;

        statsMap[offerId] = {
          total_visits: landingCount,
          total_leadform_visits: leadformCount,
          total_submissions: submissionsCount,
          conversion_rate: conversionRate,
        };
      });

      return { success: true, data: statsMap };
    });
  } catch (error) {
    console.error("[getOffersStatsBatch] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener las estadísticas" };
  }
}

/**
 * Obtener estadísticas agregadas de una oferta
 */
export async function getOfferStats(
  data: GetOfferStatsData
): Promise<OfferStatsResponse> {
  try {
    const validatedData = GetOfferStatsSchema.parse(data);

    return await retryDatabaseOperation(async () => {
      // Verificar que la oferta existe
      const offer = await prisma.studio_offers.findUnique({
        where: { id: validatedData.offer_id },
        select: { id: true },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Construir filtros de fecha
      const dateFilter =
        validatedData.start_date || validatedData.end_date
          ? {
            created_at: {
              ...(validatedData.start_date
                ? { gte: validatedData.start_date }
                : {}),
              ...(validatedData.end_date
                ? { lte: validatedData.end_date }
                : {}),
            },
          }
          : {};

      // Obtener conteos totales
      const [landingVisits, leadformVisits, submissions] = await Promise.all([
        prisma.studio_offer_visits.count({
          where: {
            offer_id: validatedData.offer_id,
            visit_type: "landing",
            ...dateFilter,
          },
        }),
        prisma.studio_offer_visits.count({
          where: {
            offer_id: validatedData.offer_id,
            visit_type: "leadform",
            ...dateFilter,
          },
        }),
        prisma.studio_offer_submissions.count({
          where: {
            offer_id: validatedData.offer_id,
            ...dateFilter,
          },
        }),
      ]);

      // Calcular tasas
      const conversionRate =
        leadformVisits > 0 ? (submissions / leadformVisits) * 100 : 0;
      const clickThroughRate =
        landingVisits > 0 ? (leadformVisits / landingVisits) * 100 : 0;

      // Obtener todas las visitas y submissions para agrupar por fecha
      const [allVisits, allSubmissions] = await Promise.all([
        prisma.studio_offer_visits.findMany({
          where: {
            offer_id: validatedData.offer_id,
            ...dateFilter,
          },
          select: {
            visit_type: true,
            created_at: true,
          },
        }),
        prisma.studio_offer_submissions.findMany({
          where: {
            offer_id: validatedData.offer_id,
            ...dateFilter,
          },
          select: {
            created_at: true,
          },
        }),
      ]);

      // Agrupar visitas por fecha
      const visitsByDateMap = new Map<string, {
        date: string;
        landing_visits: number;
        leadform_visits: number;
        submissions: number;
      }>();

      allVisits.forEach((visit) => {
        const date = visit.created_at.toISOString().split('T')[0];
        const existing = visitsByDateMap.get(date) || {
          date,
          landing_visits: 0,
          leadform_visits: 0,
          submissions: 0,
        };
        if (visit.visit_type === 'landing') {
          existing.landing_visits++;
        } else {
          existing.leadform_visits++;
        }
        visitsByDateMap.set(date, existing);
      });

      // Agrupar submissions por fecha
      allSubmissions.forEach((submission) => {
        const date = submission.created_at.toISOString().split('T')[0];
        const existing = visitsByDateMap.get(date) || {
          date,
          landing_visits: 0,
          leadform_visits: 0,
          submissions: 0,
        };
        existing.submissions++;
        visitsByDateMap.set(date, existing);
      });

      const visitsByDateArray = Array.from(visitsByDateMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date)
      );

      // Obtener visitas y submissions con UTM para agrupar
      const [utmVisits, utmSubmissions] = await Promise.all([
        prisma.studio_offer_visits.findMany({
          where: {
            offer_id: validatedData.offer_id,
            ...dateFilter,
          },
          select: {
            visit_type: true,
            utm_source: true,
            utm_medium: true,
            utm_campaign: true,
          },
        }),
        prisma.studio_offer_submissions.findMany({
          where: {
            offer_id: validatedData.offer_id,
            ...dateFilter,
          },
          select: {
            utm_source: true,
            utm_medium: true,
            utm_campaign: true,
          },
        }),
      ]);

      // Agrupar por UTM
      const utmMap = new Map<string, {
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        landing_visits: number;
        leadform_visits: number;
        submissions: number;
      }>();

      utmVisits.forEach((visit) => {
        const key = `${visit.utm_source || "null"}_${visit.utm_medium || "null"}_${visit.utm_campaign || "null"}`;
        const existing = utmMap.get(key) || {
          utm_source: visit.utm_source,
          utm_medium: visit.utm_medium,
          utm_campaign: visit.utm_campaign,
          landing_visits: 0,
          leadform_visits: 0,
          submissions: 0,
        };
        if (visit.visit_type === "landing") {
          existing.landing_visits++;
        } else {
          existing.leadform_visits++;
        }
        utmMap.set(key, existing);
      });

      utmSubmissions.forEach((submission) => {
        const key = `${submission.utm_source || "null"}_${submission.utm_medium || "null"}_${submission.utm_campaign || "null"}`;
        const existing = utmMap.get(key) || {
          utm_source: submission.utm_source,
          utm_medium: submission.utm_medium,
          utm_campaign: submission.utm_campaign,
          landing_visits: 0,
          leadform_visits: 0,
          submissions: 0,
        };
        existing.submissions++;
        utmMap.set(key, existing);
      });

      const visitsByUtmArray = Array.from(utmMap.values());

      const stats: OfferStats = {
        offer_id: validatedData.offer_id,
        total_landing_visits: landingVisits,
        total_leadform_visits: leadformVisits,
        total_submissions: submissions,
        conversion_rate: conversionRate,
        click_through_rate: clickThroughRate,
        visits_by_date: visitsByDateArray,
        visits_by_utm: visitsByUtmArray,
      };

      return { success: true, data: stats };
    });
  } catch (error) {
    console.error("[getOfferStats] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener las estadísticas" };
  }
}
