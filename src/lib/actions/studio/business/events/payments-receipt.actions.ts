'use server';

import { prisma } from '@/lib/prisma';

export interface ReceiptData {
  studio: {
    studio_name: string;
    address: string | null;
    email: string;
    phone: string | null;
    logo_url: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_holder: string | null;
    clabe_number: string | null;
  };
  contact: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
  payment: {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
    description: string | null;
  };
  balance: {
    total: number;
    paid: number;
    pending: number;
  };
}

export async function obtenerDatosComprobante(
  studioSlug: string,
  paymentId: string
): Promise<{ success: boolean; data?: ReceiptData; error?: string }> {
  try {
    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        email: true,
        address: true,
        logo_url: true,
        bank_name: true,
        account_number: true,
        account_holder: true,
        clabe_number: true,
        phones: {
          where: { is_active: true },
          select: { number: true },
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener pago con cotización
    const pago = await prisma.studio_pagos.findFirst({
      where: {
        id: paymentId,
        cotizaciones: {
          studio_id: studio.id,
        },
      },
      include: {
        cotizaciones: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
              },
            },
            pagos: {
              select: {
                id: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    const cotizacion = pago.cotizaciones;
    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Calcular balance
    const total = Number(cotizacion.price);
    const pagos = cotizacion.pagos.map(p => Number(p.amount));
    const paid = pagos.reduce((sum, amount) => sum + amount, 0);
    const pending = total - paid;

    // Datos del contacto
    const contact = cotizacion.contact ? {
      name: cotizacion.contact.name,
      phone: cotizacion.contact.phone,
      email: cotizacion.contact.email,
      address: cotizacion.contact.address,
    } : null;

    return {
      success: true,
      data: {
        studio: {
          studio_name: studio.studio_name,
          address: studio.address,
          email: studio.email,
          phone: studio.phones[0]?.number || null,
          logo_url: studio.logo_url,
          bank_name: studio.bank_name,
          account_number: studio.account_number,
          account_holder: studio.account_holder,
          clabe_number: studio.clabe_number,
        },
        contact,
        payment: {
          id: pago.id,
          amount: Number(pago.amount),
          payment_method: pago.metodo_pago,
          payment_date: pago.payment_date || pago.created_at,
          concept: pago.concept,
          description: pago.description,
        },
        balance: {
          total,
          paid,
          pending,
        },
      },
    };
  } catch (error) {
    console.error('[RECEIPT] Error obteniendo datos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener datos del comprobante',
    };
  }
}

