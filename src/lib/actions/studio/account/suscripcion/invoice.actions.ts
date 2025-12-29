"use server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

interface GetStripeInvoiceResult {
  success: boolean;
  data?: {
    id: string;
    number: string | null;
    created: Date;
    amount: number;
    amount_paid: number;
    currency: string;
    status: string;
    description: string | null;
    period_start: Date | null;
    period_end: Date | null;
    subtotal: number;
    tax: number;
    paid_at: Date | null;
    invoice_pdf: string | null;
    invoice_url: string | null;
    plan?: {
      name: string;
      slug: string;
    };
    studio?: {
      studio_name: string;
      email: string | null;
    };
  } | null;
  error?: string;
}

/**
 * Obtiene una factura de Stripe por su ID
 */
export async function getStripeInvoice(
  studioSlug: string,
  invoiceId: string
): Promise<GetStripeInvoiceResult> {
  try {
    // Verificar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        email: true,
        stripe_customer_id: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Obtener la factura desde Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ["subscription", "payment_intent"],
    });

    // Verificar que la factura pertenece al customer del studio
    if (
      typeof invoice.customer === "string" &&
      invoice.customer !== studio.stripe_customer_id
    ) {
      return {
        success: false,
        error: "La factura no pertenece a este estudio",
      };
    }

    // Obtener información del plan si hay suscripción
    let planInfo = null;
    if (invoice.subscription) {
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription.id;

      const subscription = await prisma.subscriptions.findFirst({
        where: { stripe_subscription_id: subscriptionId },
        include: {
          plans: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });

      if (subscription?.plans) {
        planInfo = {
          name: subscription.plans.name,
          slug: subscription.plans.slug,
        };
      }
    }

    return {
      success: true,
      data: {
        id: invoice.id,
        number: invoice.number,
        created: new Date(invoice.created * 1000),
        amount: invoice.amount_due / 100, // Convertir de centavos
        amount_paid: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status || "open",
        description: invoice.description || invoice.lines.data[0]?.description || null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        subtotal: invoice.subtotal / 100,
        tax: invoice.tax ? invoice.tax / 100 : 0,
        paid_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        invoice_pdf: invoice.invoice_pdf || null,
        invoice_url: invoice.hosted_invoice_url || null,
        plan: planInfo || undefined,
        studio: {
          studio_name: studio.studio_name,
          email: studio.email,
        },
      },
    };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error obteniendo factura de Stripe:", err);
    return {
      success: false,
      error: err.message || "Error al obtener factura",
    };
  }
}

