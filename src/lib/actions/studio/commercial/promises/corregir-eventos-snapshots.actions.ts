'use server';

import { prisma } from '@/lib/prisma';
import { autorizarYCrearEvento } from './cotizaciones-cierre.actions';
import { cancelarEvento } from '../business/events/events.actions';

/**
 * Corrige eventos que fueron creados sin snapshots de contrato
 * Cancela el evento y lo vuelve a crear con la lógica corregida
 */
export async function corregirEventoSinSnapshots(
  studioSlug: string,
  eventoId: string
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    evento_id_anterior: string;
    evento_id_nuevo: string;
    cotizacion_id: string;
  };
}> {
  try {
    // 1. Obtener evento y verificar que existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const evento = await prisma.studio_events.findFirst({
      where: {
        id: eventoId,
        studio_id: studio.id,
      },
      include: {
        cotizacion: {
          select: {
            id: true,
            promise_id: true,
            contract_template_id_snapshot: true,
            contract_content_snapshot: true,
            status: true,
          },
        },
        promise: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' };
    }

    if (!evento.cotizacion_id || !evento.promise_id) {
      return { success: false, error: 'Evento no tiene cotización o promesa asociada' };
    }

    // 2. Verificar si el evento necesita corrección
    // Si ya tiene snapshots de contrato, no necesita corrección
    if (evento.cotizacion.contract_content_snapshot) {
      return { success: false, error: 'El evento ya tiene snapshots de contrato guardados' };
    }

    // 3. Verificar que existe registro de cierre con contrato definido
    const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
      where: { cotizacion_id: evento.cotizacion_id },
      include: {
        contract_template: {
          select: {
            id: true,
            name: true,
            content: true,
          },
        },
      },
    });

    if (!registroCierre) {
      return { success: false, error: 'No se encontró registro de cierre' };
    }

    // Solo corregir si el contrato está definido pero no se guardó en snapshots
    if (!registroCierre.contrato_definido || !registroCierre.contract_template_id) {
      return { success: false, error: 'El contrato no está definido en el registro de cierre' };
    }

    // 4. Cancelar el evento actual
    const cancelResult = await cancelarEvento(studioSlug, eventoId);
    if (!cancelResult.success) {
      return { success: false, error: `Error al cancelar evento: ${cancelResult.error}` };
    }

    // 5. Esperar un momento para asegurar que la transacción se complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 6. Volver a crear el evento con la lógica corregida
    // Esto guardará los snapshots correctamente
    const recreateResult = await autorizarYCrearEvento(
      studioSlug,
      evento.promise_id,
      evento.cotizacion_id,
      {
        // No registrar pago automáticamente, ya que debería estar registrado
        registrarPago: false,
      }
    );

    if (!recreateResult.success) {
      return { 
        success: false, 
        error: `Error al recrear evento: ${recreateResult.error}` 
      };
    }

    return {
      success: true,
      data: {
        evento_id_anterior: eventoId,
        evento_id_nuevo: recreateResult.data!.evento_id,
        cotizacion_id: evento.cotizacion_id,
      },
    };
  } catch (error) {
    console.error('[CORREGIR_EVENTO_SNAPSHOTS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al corregir evento',
    };
  }
}

/**
 * Encuentra todos los eventos que necesitan corrección (sin snapshots de contrato)
 */
export async function encontrarEventosSinSnapshots(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    evento_id: string;
    cotizacion_id: string;
    promise_id: string;
    tiene_registro_cierre: boolean;
    contrato_definido: boolean;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar eventos activos sin snapshots de contrato
    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studio.id,
        status: 'ACTIVE',
        cotizacion: {
          contract_content_snapshot: null, // Sin snapshot de contrato
        },
      },
      select: {
        id: true,
        cotizacion_id: true,
        promise_id: true,
        cotizacion: {
          select: {
            id: true,
          },
        },
      },
    });

    // Verificar registro de cierre para cada evento
    const eventosConDetalle = await Promise.all(
      eventos.map(async (evento) => {
        if (!evento.cotizacion_id) {
          return null;
        }

        const registroCierre = await prisma.studio_cotizaciones_cierre.findUnique({
          where: { cotizacion_id: evento.cotizacion_id },
          select: {
            contrato_definido: true,
            contract_template_id: true,
          },
        });

        return {
          evento_id: evento.id,
          cotizacion_id: evento.cotizacion_id,
          promise_id: evento.promise_id || '',
          tiene_registro_cierre: !!registroCierre,
          contrato_definido: registroCierre?.contrato_definido || false,
        };
      })
    );

    const eventosFiltrados = eventosConDetalle.filter(
      (e): e is NonNullable<typeof e> => 
        e !== null && e.tiene_registro_cierre && e.contrato_definido
    );

    return {
      success: true,
      data: eventosFiltrados,
    };
  } catch (error) {
    console.error('[ENCONTRAR_EVENTOS_SIN_SNAPSHOTS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

