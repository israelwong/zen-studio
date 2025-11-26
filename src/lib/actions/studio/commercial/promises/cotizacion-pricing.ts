'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';

/**
 * Guarda la estructura completa + precios de una cotización en el momento de autorización
 * 
 * Esto crea un "snapshot" histórico que:
 * - Perpetúa sección, categoría, nombre, precios en ese momento
 * - Protege contra cambios futuros en el catálogo
 * - Permite auditoría: "¿qué se cobró en enero?"
 * 
 * @param tx Transacción Prisma
 * @param cotizacionId ID de la cotización
 * @param studioId ID del estudio
 * @throws Error si no encuentra configuración de precios
 */
export async function guardarEstructuraCotizacionAutorizada(
  tx: any,
  cotizacionId: string,
  studioId: string
): Promise<void> {
  try {
    // Paso 1: Obtener items de la cotización con relaciones completas
    const cotizacionItems = await tx.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            cost: true,
            expense: true,
            utility_type: true,
          },
        },
        service_categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (cotizacionItems.length === 0) {
      // Si no hay items, no hay nada que guardar
      return;
    }

    // Paso 2: Obtener configuración de precios del estudio
    const config = await tx.studio_catalogo_utilidad.findFirst({
      where: { studio_id: studioId },
    });

    if (!config) {
      throw new Error('No se encontró configuración de precios para guardar estructura de cotización');
    }

    // Convertir configuración a ConfiguracionPrecios
    const configuracionPrecios: ConfiguracionPrecios = {
      utilidad_servicio: Number(config.utilidad_servicio) || 0,
      utilidad_producto: Number(config.utilidad_producto) || 0,
      comision_venta: Number(config.comision_venta) || 0,
      sobreprecio: Number(config.sobreprecio) || 0,
    };

    // Paso 3: Para cada item, calcular y guardar estructura completa
    for (const item of cotizacionItems) {
      // Saltar si no tiene relaciones
      if (!item.items || !item.service_categories) {
        continue;
      }

      try {
        // Calcular precios usando la configuración del estudio
        const precios = calcularPrecio(
          item.items.cost || 0,
          item.items.expense || 0,
          item.items.utility_type === 'service' ? 'servicio' : 'producto',
          configuracionPrecios
        );

        // Actualizar item con campos operacionales + snapshots
        // OPERACIONALES: Mutable si se re-edita la cotización
        // SNAPSHOTS: Inmutable después de autorización (para auditoría)
        await tx.studio_cotizacion_items.update({
          where: { id: item.id },
          data: {
            // OPERACIONALES (Actuales - mutable)
            name: item.items.name,
            category_name: item.service_categories.name,
            unit_price: precios.precio_final,
            subtotal: precios.precio_final * item.quantity,
            cost: item.items.cost || 0,
            expense: item.items.expense || 0,
            profit: precios.utilidad_base,
            public_price: precios.precio_final,
            profit_type: item.items.utility_type === 'service' ? 'servicio' : 'producto',

            // SNAPSHOTS (Inmutables después de autorización - CRÍTICO para auditoría)
            name_snapshot: item.items.name,
            category_name_snapshot: item.service_categories.name,
            unit_price_snapshot: precios.precio_final,
            subtotal_snapshot: precios.precio_final * item.quantity,
            cost_snapshot: item.items.cost || 0,
            expense_snapshot: item.items.expense || 0,
            profit_snapshot: precios.utilidad_base,
            public_price_snapshot: precios.precio_final,
            profit_type_snapshot: item.items.utility_type === 'service' ? 'servicio' : 'producto',
          },
        });
      } catch (itemError) {
        console.error(
          `[COTIZACION PRICING] Error guardando estructura para item ${item.id}:`,
          itemError
        );
        // Continuar con siguiente item pero loguear error
        throw new Error(
          `Error guardando estructura para item ${item.id}: ${
            itemError instanceof Error ? itemError.message : 'Error desconocido'
          }`
        );
      }
    }
  } catch (error) {
    console.error(
      '[COTIZACION PRICING] Error en guardarEstructuraCotizacionAutorizada:',
      error
    );
    throw error;
  }
}

