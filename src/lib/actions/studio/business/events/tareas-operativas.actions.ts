'use server';

import { prisma } from '@/lib/prisma';

export interface TareaOperativa {
  id: string;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  status: string;
  priority: string;
  category: string;
  google_event_id: string | null;
  google_calendar_id: string | null;
  event: {
    id: string;
    name: string;
    event_date: Date | null;
  };
  cotizacion_item: {
    assigned_to_crew_member: {
      id: string;
      name: string;
      email: string | null;
    } | null;
  } | null;
}

export interface TareasOperativasResponse {
  success: boolean;
  data?: TareaOperativa[];
  error?: string;
}

/**
 * Obtiene todas las tareas operativas sincronizadas con Google Calendar
 * @param studioSlug - Slug del estudio
 * @param eventId - ID del evento para filtrar (opcional)
 * @returns Lista de tareas sincronizadas
 */
export async function obtenerTareasOperativas(
  studioSlug: string,
  eventId?: string
): Promise<TareasOperativasResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { 
        id: true,
        google_calendar_secondary_id: true,
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const whereClause: any = {
      scheduler_instance: {
        event: {
          studio_id: studio.id,
        },
      },
      google_event_id: {
        not: null,
      },
      // Solo mostrar tareas que tienen un item asociado (tareas válidas)
      cotizacion_item_id: {
        not: null,
      },
      // Solo mostrar tareas cuyo item tiene personal asignado
      cotizacion_item: {
        assigned_to_crew_member_id: {
          not: null,
        },
      },
    };

    // Si el estudio tiene calendario secundario configurado, filtrar solo tareas de ese calendario
    // Esto asegura que solo se muestren tareas sincronizadas con el calendario secundario correcto
    if (studio.google_calendar_secondary_id) {
      whereClause.google_calendar_id = studio.google_calendar_secondary_id;
    }

    // Filtrar por evento si se proporciona
    if (eventId) {
      whereClause.scheduler_instance.event_id = eventId;
    }

    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
      where: whereClause,
      include: {
        scheduler_instance: {
          include: {
            event: {
              select: {
                id: true,
                event_date: true,
                promise: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        cotizacion_item: {
          include: {
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

    const tareasMapeadas: TareaOperativa[] = tareas.map((tarea) => ({
      id: tarea.id,
      name: tarea.name,
      description: tarea.description,
      start_date: tarea.start_date,
      end_date: tarea.end_date,
      status: tarea.status,
      priority: tarea.priority,
      category: tarea.category,
      google_event_id: tarea.google_event_id,
      google_calendar_id: tarea.google_calendar_id,
      event: {
        id: tarea.scheduler_instance.event.id,
        name: tarea.scheduler_instance.event.promise?.name || 'Evento sin nombre',
        event_date: tarea.scheduler_instance.event.event_date,
      },
      cotizacion_item: tarea.cotizacion_item
        ? {
            assigned_to_crew_member: tarea.cotizacion_item.assigned_to_crew_member
              ? {
                  id: tarea.cotizacion_item.assigned_to_crew_member.id,
                  name: tarea.cotizacion_item.assigned_to_crew_member.name,
                  email: tarea.cotizacion_item.assigned_to_crew_member.email,
                }
              : null,
          }
        : null,
    }));

    return {
      success: true,
      data: tareasMapeadas,
    };
  } catch (error) {
    console.error('[Tareas Operativas] Error obteniendo tareas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener tareas',
    };
  }
}

/**
 * Obtiene el contador de tareas pendientes sincronizadas
 * @param studioSlug - Slug del estudio
 * @returns Número de tareas pendientes
 */
export async function obtenerContadorTareasPendientes(
  studioSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const count = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
    });

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error('[Tareas Operativas] Error obteniendo contador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener contador',
    };
  }
}

