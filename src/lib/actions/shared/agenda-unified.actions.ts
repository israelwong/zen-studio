'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// =============================================================================
// SCHEMAS
// =============================================================================

const createAgendaSchema = z.object({
    contexto: z.enum(['promise', 'evento']),
    promise_id: z.string().optional(),
    evento_id: z.string().optional(),
    date: z.coerce.date(),
    time: z.string().optional(),
    address: z.string().optional(),
    concept: z.string().optional(),
    description: z.string().optional(),
    google_maps_url: z.string().optional(),
    agenda_tipo: z.string().optional(),
    user_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateAgendaSchema = createAgendaSchema.partial().extend({
    id: z.string(),
});

const getAgendaUnifiedSchema = z.object({
    filtro: z.enum(['all', 'promises', 'eventos']).optional().default('all'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type CreateAgendaData = z.infer<typeof createAgendaSchema>;
export type UpdateAgendaData = z.infer<typeof updateAgendaSchema>;
export type GetAgendaUnifiedParams = z.infer<typeof getAgendaUnifiedSchema>;

export interface AgendaItem {
    id: string;
    date: Date;
    time?: string | null;
    address?: string | null;
    concept?: string | null;
    description?: string | null;
    google_maps_url?: string | null;
    status: string;
    contexto: 'promise' | 'evento' | null;
    promise_id?: string | null;
    evento_id?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    // Datos relacionados
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_avatar_url?: string | null;
    event_name?: string | null;
    promise_status?: string | null;
    evento_status?: string | null;
}

export interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface AgendaListResponse {
    success: boolean;
    data?: AgendaItem[];
    error?: string;
}

export interface AgendaResponse {
    success: boolean;
    data?: AgendaItem;
    error?: string;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Obtener agenda unificada (promises + eventos)
 */
export async function obtenerAgendaUnificada(
    studioSlug: string,
    params?: GetAgendaUnifiedParams
): Promise<AgendaListResponse> {
    try {
        const validatedParams = getAgendaUnifiedSchema.parse(params || {});
        const { filtro, startDate, endDate } = validatedParams;

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Construir where clause
        const where: {
            studio_id: string;
            date?: { gte?: Date; lte?: Date };
            contexto?: string | null;
            OR?: Array<{ contexto: string | null }>;
        } = {
            studio_id: studio.id,
        };

        // Filtro por contexto
        if (filtro === 'promises') {
            where.contexto = 'promise';
        } else if (filtro === 'eventos') {
            where.contexto = 'evento';
        }

        // Filtro por rango de fechas
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        const agendas = await prisma.studio_agenda.findMany({
            where,
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                        cliente_id: true,
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        const items: AgendaItem[] = agendas.map((agenda) => ({
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            google_maps_url: agenda.google_maps_url,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            evento_status: agenda.eventos?.status || null,
        }));

        return {
            success: true,
            data: items,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agenda:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agenda',
        };
    }
}

/**
 * Obtener agendamiento por ID
 */
export async function obtenerAgendamientoPorId(
    studioSlug: string,
    agendaId: string
): Promise<AgendaResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const agenda = await prisma.studio_agenda.findFirst({
            where: {
                id: agendaId,
                studio_id: studio.id,
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        if (!agenda) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            google_maps_url: agenda.google_maps_url,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            evento_status: agenda.eventos?.status || null,
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agendamiento',
        };
    }
}

/**
 * Obtener agendamiento por promise_id
 */
export async function obtenerAgendamientoPorPromise(
    studioSlug: string,
    promiseId: string
): Promise<AgendaResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const agenda = await prisma.studio_agenda.findFirst({
            where: {
                studio_id: studio.id,
                promise_id: promiseId,
                contexto: 'promise',
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        if (!agenda) {
            return { success: true, data: undefined };
        }

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            google_maps_url: agenda.google_maps_url,
            status: agenda.status,
            contexto: 'promise',
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            promise_status: 'pending',
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agendamiento por promise:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agendamiento',
        };
    }
}

/**
 * Crear agendamiento
 */
export async function crearAgendamiento(
    studioSlug: string,
    data: CreateAgendaData
): Promise<AgendaResponse> {
    try {
        const validatedData = createAgendaSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Validar que al menos uno de promise_id o evento_id esté presente
        if (!validatedData.promise_id && !validatedData.evento_id) {
            return { success: false, error: 'Debe especificar promise_id o evento_id' };
        }

        // Validar que promise_id existe si se proporciona
        if (validatedData.promise_id) {
            const promise = await prisma.studio_promises.findUnique({
                where: { id: validatedData.promise_id },
                select: { studio_id: true },
            });

            if (!promise || promise.studio_id !== studio.id) {
                return { success: false, error: 'Promise no encontrada o no pertenece al studio' };
            }
        }

        // Validar que evento_id existe si se proporciona
        if (validatedData.evento_id) {
            const evento = await prisma.studio_eventos.findUnique({
                where: { id: validatedData.evento_id },
                select: { studio_id: true },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }
        }

        const agenda = await prisma.studio_agenda.create({
            data: {
                studio_id: studio.id,
                contexto: validatedData.contexto,
                promise_id: validatedData.promise_id || null,
                evento_id: validatedData.evento_id || null,
                date: validatedData.date,
                time: validatedData.time || null,
                address: validatedData.address || null,
                concept: validatedData.concept || null,
                description: validatedData.description || null,
                google_maps_url: validatedData.google_maps_url || null,
                agenda_tipo: validatedData.agenda_tipo || null,
                user_id: validatedData.user_id || null,
                metadata: validatedData.metadata ? (validatedData.metadata as Prisma.InputJsonValue) : undefined,
                status: 'pendiente',
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            google_maps_url: agenda.google_maps_url,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
        };

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error creando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear agendamiento',
        };
    }
}

/**
 * Actualizar agendamiento
 */
export async function actualizarAgendamiento(
    studioSlug: string,
    data: UpdateAgendaData
): Promise<AgendaResponse> {
    try {
        const validatedData = updateAgendaSchema.parse(data);
        const { id, ...updateData } = validatedData;

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el agendamiento existe y pertenece al studio
        const existing = await prisma.studio_agenda.findFirst({
            where: {
                id,
                studio_id: studio.id,
            },
        });

        if (!existing) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        // Validar promise_id si se proporciona
        if (updateData.promise_id) {
            const promise = await prisma.studio_promises.findUnique({
                where: { id: updateData.promise_id },
                select: { studio_id: true },
            });

            if (!promise || promise.studio_id !== studio.id) {
                return { success: false, error: 'Promise no encontrada o no pertenece al studio' };
            }
        }

        // Validar evento_id si se proporciona
        if (updateData.evento_id) {
            const evento = await prisma.studio_eventos.findUnique({
                where: { id: updateData.evento_id },
                select: { studio_id: true },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }
        }

        const updatePayload: Prisma.studio_agendaUpdateInput = {};

        if (updateData.date) updatePayload.date = updateData.date;
        if (updateData.time !== undefined) updatePayload.time = updateData.time || null;
        if (updateData.address !== undefined) updatePayload.address = updateData.address || null;
        if (updateData.concept !== undefined) updatePayload.concept = updateData.concept || null;
        if (updateData.description !== undefined) updatePayload.description = updateData.description || null;
        if (updateData.google_maps_url !== undefined) updatePayload.google_maps_url = updateData.google_maps_url || null;
        if (updateData.agenda_tipo !== undefined) updatePayload.agenda_tipo = updateData.agenda_tipo || null;
        if (updateData.user_id !== undefined) updatePayload.user_id = updateData.user_id || null;
        if (updateData.metadata !== undefined) {
            updatePayload.metadata = updateData.metadata ? (updateData.metadata as Prisma.InputJsonValue) : null;
        }
        if (updateData.contexto) updatePayload.contexto = updateData.contexto;
        if (updateData.promise_id !== undefined) updatePayload.promise_id = updateData.promise_id || null;
        if (updateData.evento_id !== undefined) updatePayload.evento_id = updateData.evento_id || null;

        const agenda = await prisma.studio_agenda.update({
            where: { id },
            data: updatePayload,
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            google_maps_url: agenda.google_maps_url,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
        };

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error actualizando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar agendamiento',
        };
    }
}

/**
 * Eliminar agendamiento
 */
export async function eliminarAgendamiento(
    studioSlug: string,
    agendaId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const existing = await prisma.studio_agenda.findFirst({
            where: {
                id: agendaId,
                studio_id: studio.id,
            },
        });

        if (!existing) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        await prisma.studio_agenda.delete({
            where: { id: agendaId },
        });

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        return {
            success: true,
            data: { deleted: true },
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error eliminando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar agendamiento',
        };
    }
}

