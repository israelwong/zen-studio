'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

const createReminderSubjectSchema = z.object({
  text: z.string().min(1, 'El texto es requerido').max(200, 'El texto no puede exceder 200 caracteres'),
  order: z.number().int().min(0).optional(),
});

const updateReminderSubjectSchema = z.object({
  text: z.string().min(1, 'El texto es requerido').max(200, 'El texto no puede exceder 200 caracteres').optional(),
  order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const getReminderSubjectsSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  orderBy: z.enum(['order', 'usage_count', 'created_at']).optional().default('order'),
});

export type CreateReminderSubjectData = z.infer<typeof createReminderSubjectSchema>;
export type UpdateReminderSubjectData = z.infer<typeof updateReminderSubjectSchema>;
export type GetReminderSubjectsParams = z.infer<typeof getReminderSubjectsSchema>;

// ============================================
// TYPES
// ============================================

export interface ReminderSubject {
  id: string;
  studio_id: string;
  text: string;
  order: number;
  is_active: boolean;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Obtener librería de asuntos del studio
 */
export async function getReminderSubjects(
  studioSlug: string,
  options?: GetReminderSubjectsParams
): Promise<ActionResponse<ReminderSubject[]>> {
  try {
    const validatedOptions = getReminderSubjectsSchema.parse(options || {});

    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Construir where clause
    const where: any = {
      studio_id: studio.id,
    };

    if (!validatedOptions.includeInactive) {
      where.is_active = true;
    }

    // Construir orderBy
    const orderBy: any = {};
    switch (validatedOptions.orderBy) {
      case 'order':
        orderBy.order = 'asc';
        break;
      case 'usage_count':
        orderBy.usage_count = 'desc';
        break;
      case 'created_at':
        orderBy.created_at = 'desc';
        break;
    }

    // Obtener subjects
    const subjects = await prisma.studio_reminder_subjects.findMany({
      where,
      orderBy,
    });

    return {
      success: true,
      data: subjects.map((s) => ({
        id: s.id,
        studio_id: s.studio_id,
        text: s.text,
        order: s.order,
        is_active: s.is_active,
        usage_count: s.usage_count,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    };
  } catch (error) {
    console.error('[REMINDER_SUBJECTS] Error en getReminderSubjects:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener asuntos',
    };
  }
}

/**
 * Crear nuevo asunto en la librería
 */
export async function createReminderSubject(
  studioSlug: string,
  data: CreateReminderSubjectData
): Promise<ActionResponse<ReminderSubject>> {
  try {
    const validatedData = createReminderSubjectSchema.parse(data);

    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que no existe duplicado (unique constraint)
    const existing = await prisma.studio_reminder_subjects.findFirst({
      where: {
        studio_id: studio.id,
        text: validatedData.text,
      },
      select: { id: true },
    });

    if (existing) {
      return { success: false, error: 'Ya existe un asunto con ese texto' };
    }

    // Crear subject
    const subject = await prisma.studio_reminder_subjects.create({
      data: {
        studio_id: studio.id,
        text: validatedData.text,
        order: validatedData.order ?? 0,
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: subject.id,
        studio_id: subject.studio_id,
        text: subject.text,
        order: subject.order,
        is_active: subject.is_active,
        usage_count: subject.usage_count,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
      },
    };
  } catch (error) {
    console.error('[REMINDER_SUBJECTS] Error en createReminderSubject:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    // Manejar error de unique constraint
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Ya existe un asunto con ese texto' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear asunto',
    };
  }
}

/**
 * Actualizar asunto de la librería
 */
export async function updateReminderSubject(
  studioSlug: string,
  subjectId: string,
  data: UpdateReminderSubjectData
): Promise<ActionResponse<ReminderSubject>> {
  try {
    const validatedData = updateReminderSubjectSchema.parse(data);

    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el subject pertenece al studio
    const existing = await prisma.studio_reminder_subjects.findFirst({
      where: {
        id: subjectId,
        studio_id: studio.id,
      },
      select: { id: true, text: true },
    });

    if (!existing) {
      return { success: false, error: 'Asunto no encontrado o no pertenece al studio' };
    }

    // Si se actualiza text, verificar que no existe duplicado
    if (validatedData.text && validatedData.text !== existing.text) {
      const duplicate = await prisma.studio_reminder_subjects.findFirst({
        where: {
          studio_id: studio.id,
          text: validatedData.text,
          id: { not: subjectId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return { success: false, error: 'Ya existe otro asunto con ese texto' };
      }
    }

    // Actualizar subject
    const subject = await prisma.studio_reminder_subjects.update({
      where: { id: subjectId },
      data: {
        ...(validatedData.text && { text: validatedData.text }),
        ...(validatedData.order !== undefined && { order: validatedData.order }),
        ...(validatedData.is_active !== undefined && { is_active: validatedData.is_active }),
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: subject.id,
        studio_id: subject.studio_id,
        text: subject.text,
        order: subject.order,
        is_active: subject.is_active,
        usage_count: subject.usage_count,
        created_at: subject.created_at,
        updated_at: subject.updated_at,
      },
    };
  } catch (error) {
    console.error('[REMINDER_SUBJECTS] Error en updateReminderSubject:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    // Manejar error de unique constraint
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Ya existe otro asunto con ese texto' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar asunto',
    };
  }
}

/**
 * Eliminar asunto de la librería
 */
export async function deleteReminderSubject(
  studioSlug: string,
  subjectId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Obtener studio_id desde slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el subject pertenece al studio
    const existing = await prisma.studio_reminder_subjects.findFirst({
      where: {
        id: subjectId,
        studio_id: studio.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: 'Asunto no encontrado o no pertenece al studio' };
    }

    // Verificar si está en uso (opcional: solo marcar is_active = false)
    const inUse = await prisma.studio_reminders.findFirst({
      where: {
        subject_id: subjectId,
      },
      select: { id: true },
    });

    if (inUse) {
      // En lugar de eliminar, desactivar
      await prisma.studio_reminder_subjects.update({
        where: { id: subjectId },
        data: { is_active: false },
      });
    } else {
      // Eliminar si no está en uso
      await prisma.studio_reminder_subjects.delete({
        where: { id: subjectId },
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: { id: subjectId },
    };
  } catch (error) {
    console.error('[REMINDER_SUBJECTS] Error en deleteReminderSubject:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar asunto',
    };
  }
}
