'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface UpdateSchedulerTaskInput {
  start_date: Date;
  end_date: Date;
}

/**
 * Actualiza solo las fechas de una tarea del Scheduler (start_date, end_date)
 * Se ejecuta en el servidor para validar permisos y persistir en BD
 * Para actualizaciones completas (incluyendo isCompleted), usar actualizarSchedulerTask de events.actions.ts
 */
export async function actualizarSchedulerTaskFechas(
  studioSlug: string,
  eventId: string,
  taskId: string,
  data: UpdateSchedulerTaskInput
) {
  try {
    // Validar que las fechas sean válidas
    if (!data.start_date || !data.end_date) {
      return {
        success: false,
        error: 'Las fechas de inicio y fin son requeridas',
      };
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate > endDate) {
      return {
        success: false,
        error: 'La fecha de inicio no puede ser posterior a la fecha de fin',
      };
    }

    // Obtener la tarea actual para verificar si las fechas realmente cambiaron
    const currentTask = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        start_date: true,
        end_date: true,
        sync_status: true,
      },
    });

    if (!currentTask) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    // Verificar si las fechas realmente cambiaron
    const datesChanged =
      currentTask.start_date.getTime() !== startDate.getTime() ||
      currentTask.end_date.getTime() !== endDate.getTime();

    // Si las fechas cambiaron y la tarea estaba sincronizada, marcar como DRAFT
    const updateData: {
      start_date: Date;
      end_date: Date;
      sync_status?: 'DRAFT';
    } = {
      start_date: startDate,
      end_date: endDate,
    };

    if (datesChanged && (currentTask.sync_status === 'INVITED' || currentTask.sync_status === 'PUBLISHED')) {
      // Si estaba sincronizada/publicada y cambió, volver a DRAFT
      updateData.sync_status = 'DRAFT';
    }

    // Actualizar la tarea en BD
    const updatedTask = await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: updateData,
    });

    // Revalidar la página para reflejar cambios
    revalidatePath(`/[slug]/studio/business/events/[eventId]/scheduler`, 'page');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating scheduler task:', error);
    return {
      success: false,
      error: 'Error al actualizar la tarea',
    };
  }
}

/**
 * Obtiene todas las tareas de un evento
 */
export async function obtenerSchedulerTareas(studioSlug: string, eventId: string) {
  try {
    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        cotizacion_item: {
          cotizaciones: {
            evento_id: eventId,
          },
        },
      },
      include: {
        cotizacion_item: true,
      },
    });

    return {
      success: true,
      data: tareas,
    };
  } catch (error) {
    console.error('Error fetching scheduler tasks:', error);
    return {
      success: false,
      error: 'Error al obtener las tareas',
      data: [],
    };
  }
}

/**
 * Publica el cronograma de un evento
 * Opción 1: Solo Publicar - Cambia estado DRAFT a PUBLISHED (visible en plataforma)
 * Opción 2: Publicar e Invitar - Cambia a INVITED y sincroniza con Google Calendar
 */
export async function publicarCronograma(
  studioSlug: string,
  eventId: string,
  opcion: 'solo_publicar' | 'publicar_e_invitar'
): Promise<{ success: boolean; publicado?: number; sincronizado?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (tareasDraft.length === 0) {
      return {
        success: true,
        publicado: 0,
        sincronizado: 0,
      };
    }

    let publicado = 0;
    let sincronizado = 0;

    if (opcion === 'solo_publicar') {
      // Solo cambiar estado a PUBLISHED
      await prisma.studio_scheduler_event_tasks.updateMany({
        where: {
          id: {
            in: tareasDraft.map(t => t.id),
          },
        },
        data: {
          sync_status: 'PUBLISHED',
        },
      });
      publicado = tareasDraft.length;
    } else {
      // Publicar e Invitar: sincronizar con Google Calendar
      const { tieneGoogleCalendarHabilitado, sincronizarTareaEnBackground } =
        await import('@/lib/integrations/google-calendar/helpers');

      const tieneGoogle = await tieneGoogleCalendarHabilitado(studioSlug);

      if (!tieneGoogle) {
        return {
          success: false,
          error: 'Google Calendar no está conectado. Conecta tu cuenta primero.',
        };
      }

      // Sincronizar cada tarea que tenga personal asignado
      for (const tarea of tareasDraft) {
        try {
          // Solo sincronizar si tiene personal asignado
          if (tarea.cotizacion_item?.assigned_to_crew_member_id) {
            await sincronizarTareaEnBackground(tarea.id, studioSlug);
            sincronizado++;

            // Actualizar estado a INVITED
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: {
                sync_status: 'INVITED',
                invitation_status: 'PENDING',
              },
            });
          } else {
            // Sin personal, solo marcar como PUBLISHED
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: {
                sync_status: 'PUBLISHED',
              },
            });
            publicado++;
          }
        } catch (error) {
          console.error(`[Publicar Cronograma] Error sincronizando tarea ${tarea.id}:`, error);
          // Continuar con las demás tareas aunque una falle
        }
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      publicado,
      sincronizado,
    };
  } catch (error) {
    console.error('[Publicar Cronograma] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al publicar cronograma',
    };
  }
}

/**
 * Obtiene el conteo de tareas DRAFT para mostrar en la barra de publicación
 */
export async function obtenerConteoTareasDraft(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // Contar tareas con sync_status DRAFT
    // Nota: sync_status tiene @default(DRAFT), por lo que todas las tareas tienen un valor
    const count = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
    });

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error('[Conteo Tareas DRAFT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al contar tareas',
    };
  }
}

/**
 * Obtiene el resumen detallado de cambios pendientes de publicación
 */
export async function obtenerResumenCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{
  success: boolean;
  data?: {
    totalTareas: number;
    tareasConPersonal: number;
    tareasSinPersonal: number;
    tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      category: string;
      tienePersonal: boolean;
      personalNombre?: string;
      personalEmail?: string;
    }>;
  };
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

    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    const tareas = tareasDraft.map((tarea) => ({
      id: tarea.id,
      name: tarea.name,
      startDate: tarea.start_date,
      endDate: tarea.end_date,
      status: tarea.status,
      category: tarea.category,
      tienePersonal: !!tarea.cotizacion_item?.assigned_to_crew_member_id,
      personalNombre: tarea.cotizacion_item?.assigned_to_crew_member?.name || undefined,
      personalEmail: tarea.cotizacion_item?.assigned_to_crew_member?.email || undefined,
    }));

    const tareasConPersonal = tareas.filter((t) => t.tienePersonal).length;
    const tareasSinPersonal = tareas.length - tareasConPersonal;

    return {
      success: true,
      data: {
        totalTareas: tareas.length,
        tareasConPersonal,
        tareasSinPersonal,
        tareas,
      },
    };
  } catch (error) {
    console.error('[Resumen Cambios] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener resumen',
    };
  }
}

/**
 * Verifica si un colaborador tiene tareas en un rango de fechas específico
 * Retorna el número de tareas que se solapan con el rango
 */
export async function verificarConflictosColaborador(
  studioSlug: string,
  eventId: string,
  crewMemberId: string,
  startDate: Date,
  endDate: Date,
  excludeTaskId?: string
): Promise<{ success: boolean; conflictCount?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar tareas del colaborador que se solapen con el rango de fechas
    const conflictTasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        cotizacion_item: {
          assigned_to_crew_member_id: crewMemberId,
        },
        // Excluir la tarea actual si se está editando
        ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
        // Verificar solapamiento de fechas
        OR: [
          // La tarea empieza dentro del rango
          {
            start_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea termina dentro del rango
          {
            end_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea contiene completamente el rango
          {
            start_date: { lte: startDate },
            end_date: { gte: endDate },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
      },
    });

    return {
      success: true,
      conflictCount: conflictTasks.length,
    };
  } catch (error) {
    console.error('[Verificar Conflictos] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al verificar conflictos',
    };
  }
}
