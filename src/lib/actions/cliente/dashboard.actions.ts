'use server';

import { prisma } from '@/lib/prisma';
import { getEventPipelineStages } from '@/lib/actions/studio/business/events/event-pipeline-stages.actions';
import type { ApiResponse } from '@/types/client';

export interface DashboardInfo {
  pipeline_stages: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    order: number;
    stage_type: string;
    is_current: boolean;
  }>;
  entregables_status: {
    has_entregables: boolean;
    entregados_count: number;
    total_count: number;
    last_delivery_date: string | null;
  };
  cotizacion?: {
    id: string;
    status: string;
    promise_id: string | null;
  } | null;
  contract?: {
    id: string;
    content: string;
    status: string;
    created_at: Date;
    signed_at: Date | null;
  } | null;
  contact?: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
}

/**
 * Obtener información del dashboard para el cliente
 */
export async function obtenerDashboardInfo(
  eventIdOrPromiseId: string,
  contactId: string,
  studioSlug: string
): Promise<ApiResponse<DashboardInfo>> {
  try {
    // Obtener el evento para saber el stage_id actual
    let currentStageId: string | null = null;
    let eventoId: string | null = null;

    const event = await prisma.studio_events.findFirst({
      where: {
        OR: [
          { id: eventIdOrPromiseId },
          { promise_id: eventIdOrPromiseId },
        ],
        contact_id: contactId,
      },
      select: {
        id: true,
        stage_id: true,
      },
    });

    if (event) {
      currentStageId = event.stage_id;
      eventoId = event.id;
    }

    // Obtener todos los pipeline stages del studio
    const stagesResult = await getEventPipelineStages(studioSlug);
    const allStages = stagesResult.success && stagesResult.data ? stagesResult.data : [];

    // Mapear stages con indicador de cuál es el actual
    const pipeline_stages = allStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
      stage_type: stage.stage_type,
      is_current: stage.id === currentStageId,
    }));

    // Obtener estado de entregables
    let entregables_status = {
      has_entregables: false,
      entregados_count: 0,
      total_count: 0,
      last_delivery_date: null as string | null,
    };

    if (eventoId) {
      // Obtener entregables directamente desde la BD para obtener fecha
      const entregables = await prisma.studio_event_deliverables.findMany({
        where: {
          event_id: eventoId,
        },
        select: {
          id: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      entregables_status = {
        has_entregables: entregables.length > 0,
        entregados_count: entregables.length,
        total_count: entregables.length,
        last_delivery_date: entregables.length > 0 
          ? entregables[0].created_at.toISOString()
          : null,
      };
    }

    // Obtener cotización autorizada (si existe)
    let cotizacion = null;
    let contract = null;
    let contact = null;

    if (event) {
      // Buscar cotización asociada al evento
      const cotizacionData = await prisma.studio_cotizaciones.findFirst({
        where: {
          OR: [
            { evento_id: event.id },
            { promise_id: eventIdOrPromiseId },
          ],
          status: {
            in: ['contract_pending', 'contract_generated', 'contract_signed', 'autorizada', 'aprobada'],
          },
        },
        select: {
          id: true,
          status: true,
          promise_id: true,
        },
        orderBy: {
          updated_at: 'desc',
        },
      });

      if (cotizacionData) {
        cotizacion = cotizacionData;

        // Si la cotización está en estados de contrato, buscar el contrato
        if (['contract_generated', 'contract_signed'].includes(cotizacionData.status)) {
          const contractData = await prisma.studio_event_contracts.findFirst({
            where: {
              event_id: event.id,
              status: {
                not: 'CANCELLED',
              },
            },
            select: {
              id: true,
              content: true,
              status: true,
              created_at: true,
              signed_at: true,
            },
            orderBy: {
              created_at: 'desc',
            },
          });

          if (contractData) {
            contract = contractData;
          }
        }
      }

      // Obtener información del contacto
      const contactData = await prisma.studio_contacts.findUnique({
        where: {
          id: contactId,
        },
        select: {
          name: true,
          phone: true,
          email: true,
          address: true,
        },
      });

      if (contactData) {
        contact = contactData;
      }
    }

    return {
      success: true,
      data: {
        pipeline_stages,
        entregables_status,
        cotizacion,
        contract,
        contact,
      },
    };
  } catch (error) {
    console.error('[DASHBOARD] Error obteniendo información:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener información del dashboard',
    };
  }
}

