"use server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

/**
 * Obtiene el base_cost protegido desde platform_config
 * Este valor NUNCA debe venir del webhook o del cliente
 */
export async function getInvitationBaseCost(): Promise<number> {
  const config = await prisma.platform_config.findFirst({
    orderBy: { createdAt: "desc" },
    select: { invitation_base_cost: true },
  });

  if (!config || !config.invitation_base_cost) {
    console.warn("⚠️ invitation_base_cost no configurado, usando 0");
    return 0;
  }

  return Number(config.invitation_base_cost);
}

/**
 * Crea un Payment Intent de Stripe para una invitación digital
 * @param params Parámetros para crear el payment intent
 * @returns Payment Intent creado
 */
export async function createInvitationPaymentIntent(params: {
  studioId: string;
  amount: number; // En pesos (MXN), se convierte a centavos
  currency?: string;
  schedulerTaskId?: string;
  eventId?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ success: boolean; paymentIntent?: Stripe.PaymentIntent; error?: string }> {
  try {
    // Validar que el studio existe y está activo
    const studio = await prisma.studios.findUnique({
      where: { id: params.studioId },
      select: { id: true, is_active: true, studio_name: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    if (!studio.is_active) {
      return { success: false, error: "Studio no está activo" };
    }

    // Validar que scheduler_task_id existe si se proporciona
    if (params.schedulerTaskId) {
      const task = await prisma.studio_scheduler_event_tasks.findUnique({
        where: { id: params.schedulerTaskId },
        select: { id: true },
      });

      if (!task) {
        return { success: false, error: "Tarea del scheduler no encontrada" };
      }
    }

    // Validar que event_id existe si se proporciona
    if (params.eventId) {
      const event = await prisma.studio_events.findUnique({
        where: { id: params.eventId },
        select: { id: true },
      });

      if (!event) {
        return { success: false, error: "Evento no encontrado" };
      }
    }

    // Crear metadata para el webhook
    const metadata: Record<string, string> = {
      studio_id: params.studioId,
      service_type: "invitation",
      ...params.metadata,
    };

    if (params.schedulerTaskId) {
      metadata.scheduler_task_id = params.schedulerTaskId;
    }

    if (params.eventId) {
      metadata.event_id = params.eventId;
    }

    // Crear Payment Intent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convertir a centavos
      currency: params.currency || "mxn",
      description: params.description || `Invitación digital - ${studio.studio_name}`,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return { success: true, paymentIntent };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando Payment Intent:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene las ventas de servicios externos de un studio
 */
export async function getStudioExternalServiceSales(
  studioId: string,
  filters?: {
    status?: string;
    serviceType?: string;
    fromDate?: Date;
    toDate?: Date;
  }
) {
  try {
    const sales = await prisma.studio_external_service_sales.findMany({
      where: {
        studio_id: studioId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.serviceType && { service_type: filters.serviceType }),
        ...(filters?.fromDate &&
          filters?.toDate && {
            payment_date: {
              gte: filters.fromDate,
              lte: filters.toDate,
            },
          }),
      },
      orderBy: { payment_date: "desc" },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            event_date: true,
          },
        },
        scheduler_task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { success: true, data: sales };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error obteniendo ventas:", err);
    return { success: false, error: err.message, data: [] };
  }
}

