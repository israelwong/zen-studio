"use server";

import { prisma } from "@/lib/prisma";
import { desconectarGoogleDrive } from "@/lib/actions/studio/integrations/google-drive.actions";
import { desvincularRecursoGoogle } from "@/lib/integrations/google/auth/disconnect/calendar.actions";
import { desconectarGoogleContacts } from "@/lib/integrations/google/auth/disconnect/contacts.actions";

interface CleanupResult {
  success: boolean;
  error?: string;
  details?: {
    googleDriveDisconnected: boolean;
    googleCalendarDisconnected: boolean;
    googleContactsDisconnected: boolean;
    eventsCancelled: number;
    tasksCancelled: number;
    studioDeactivated: boolean;
  };
}

/**
 * Limpia completamente un studio cancelado después del período de retención (30 días)
 * 
 * Acciones realizadas:
 * 1. Desconecta Google Drive y elimina permisos
 * 2. Desconecta Google Calendar y cancela eventos
 * 3. Desconecta Google Contacts
 * 4. Cancela eventos activos
 * 5. Cancela tareas operativas
 * 6. Desactiva el studio (soft delete)
 */
export async function cleanupCancelledStudio(
  studioId: string
): Promise<CleanupResult> {
  try {
    console.log(`🧹 Iniciando limpieza de studio cancelado: ${studioId}`);

    // Obtener studio con slug
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        slug: true,
        is_active: true,
        subscription_status: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    if (!studio.slug) {
      return { success: false, error: "Studio no tiene slug" };
    }

    const studioSlug = studio.slug;
    const details = {
      googleDriveDisconnected: false,
      googleCalendarDisconnected: false,
      googleContactsDisconnected: false,
      eventsCancelled: 0,
      tasksCancelled: 0,
      studioDeactivated: false,
    };

    // 1. Desconectar Google Drive
    try {
      const driveResult = await desconectarGoogleDrive(studioSlug, true);
      if (driveResult.success) {
        details.googleDriveDisconnected = true;
        console.log(`✅ Google Drive desconectado para ${studioSlug}`);
      }
    } catch (error) {
      console.error(`❌ Error desconectando Google Drive:`, error);
      // Continuar con otras acciones
    }

    // 2. Desconectar Google Calendar (esto cancela eventos automáticamente)
    try {
      const calendarResult = await desvincularRecursoGoogle(studioSlug, true);
      if (calendarResult.success) {
        details.googleCalendarDisconnected = true;
        if (calendarResult.eventosEliminados) {
          details.eventsCancelled = calendarResult.eventosEliminados;
        }
        console.log(`✅ Google Calendar desconectado para ${studioSlug}`);
      }
    } catch (error) {
      console.error(`❌ Error desconectando Google Calendar:`, error);
      // Continuar con otras acciones
    }

    // 3. Desconectar Google Contacts
    try {
      const contactsResult = await desconectarGoogleContacts(studioSlug, true);
      if (contactsResult.success) {
        details.googleContactsDisconnected = true;
        console.log(`✅ Google Contacts desconectado para ${studioSlug}`);
      }
    } catch (error) {
      console.error(`❌ Error desconectando Google Contacts:`, error);
      // Continuar con otras acciones
    }

    // 4. Cancelar eventos activos que no estén ya cancelados
    try {
      const activeEvents = await prisma.studio_events.findMany({
        where: {
          studio_id: studioId,
          status: {
            notIn: ["CANCELLED", "COMPLETED", "ARCHIVED"],
          },
        },
        select: { id: true },
      });

      if (activeEvents.length > 0) {
        await prisma.studio_events.updateMany({
          where: {
            id: { in: activeEvents.map((e) => e.id) },
          },
          data: {
            status: "CANCELLED",
          },
        });
        details.eventsCancelled += activeEvents.length;
        console.log(`✅ ${activeEvents.length} eventos cancelados`);
      }
    } catch (error) {
      console.error(`❌ Error cancelando eventos:`, error);
    }

    // 5. Cancelar tareas operativas activas
    try {
      const activeTasks = await prisma.studio_scheduler_event_tasks.findMany({
        where: {
          scheduler_instance: {
            event: {
              studio_id: studioId,
            },
          },
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        select: { id: true },
      });

      if (activeTasks.length > 0) {
        await prisma.studio_scheduler_event_tasks.updateMany({
          where: {
            id: { in: activeTasks.map((t) => t.id) },
          },
          data: {
            status: "CANCELLED",
          },
        });
        details.tasksCancelled = activeTasks.length;
        console.log(`✅ ${activeTasks.length} tareas canceladas`);
      }
    } catch (error) {
      console.error(`❌ Error cancelando tareas:`, error);
    }

    // 6. Desactivar studio (soft delete)
    try {
      await prisma.studios.update({
        where: { id: studioId },
        data: {
          is_active: false,
        },
      });
      details.studioDeactivated = true;
      console.log(`✅ Studio ${studioSlug} desactivado`);
    } catch (error) {
      console.error(`❌ Error desactivando studio:`, error);
      throw error; // Este es crítico, lanzar error
    }

    console.log(`✅ Limpieza completada para studio ${studioSlug}:`, details);

    return {
      success: true,
      details,
    };
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Error en limpieza de studio ${studioId}:`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Encuentra studios que necesitan limpieza (cancelados hace más de 30 días)
 */
export async function findStudiosNeedingCleanup(): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const studios = await prisma.studios.findMany({
      where: {
        subscription_status: "CANCELLED",
        subscription_end: {
          lte: thirtyDaysAgo,
        },
        is_active: true, // Solo limpiar si aún está activo
      },
      select: {
        id: true,
        slug: true,
        subscription_end: true,
      },
    });

    return studios.map((s) => s.id);
  } catch (error) {
    console.error("❌ Error buscando studios para limpieza:", error);
    return [];
  }
}

