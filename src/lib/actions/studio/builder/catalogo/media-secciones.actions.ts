"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Esquemas de validación
const SeccionPortadaSchema = z.object({
  sectionId: z.string(),
  url: z.string().url(),
  fileName: z.string(),
  size: z.number().positive(),
});

const UpdateSeccionPortadaSchema = z.object({
  sectionId: z.string(),
  url: z.string().url().optional(),
  fileName: z.string().optional(),
  size: z.number().positive().optional(),
});

const DeleteSeccionPortadaSchema = z.object({
  sectionId: z.string(),
});

type CreateSeccionPortadaForm = z.infer<typeof SeccionPortadaSchema>;
type UpdateSeccionPortadaForm = z.infer<typeof UpdateSeccionPortadaSchema>;
type DeleteSeccionPortadaForm = z.infer<typeof DeleteSeccionPortadaSchema>;

/**
 * Obtiene la portada de una sección
 */
export async function obtenerPortadaSeccion(sectionId: string) {
  try {
    const portada = await prisma.studio_section_cover.findFirst({
      where: { section_id: sectionId },
    });

    return {
      success: true,
      data: portada,
    };
  } catch (error) {
    console.error(`Error obteniendo portada para sección ${sectionId}:`, error);
    return {
      success: false,
      error: "Error al obtener portada",
    };
  }
}

/**
 * Crea o actualiza la portada de una sección (máx 1)
 */
export async function crearPortadaSeccion(data: CreateSeccionPortadaForm) {
  try {
    const validatedData = SeccionPortadaSchema.parse(data);

    // Eliminar portada anterior si existe
    await prisma.studio_section_cover.deleteMany({
      where: { section_id: validatedData.sectionId },
    });

    // Crear nueva portada
    const portada = await prisma.studio_section_cover.create({
      data: {
        section_id: validatedData.sectionId,
        url: validatedData.url,
        file_name: validatedData.fileName,
        file_size: validatedData.size,
      },
    });

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return {
      success: true,
      data: portada,
    };
  } catch (error) {
    console.error("Error creando portada para sección:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors[0].message}`
        : "Error al crear portada",
    };
  }
}

/**
 * Actualiza la portada de una sección
 */
export async function actualizarPortadaSeccion(data: UpdateSeccionPortadaForm) {
  try {
    const validatedData = UpdateSeccionPortadaSchema.parse(data);

    const portada = await prisma.studio_section_cover.updateMany({
      where: { section_id: validatedData.sectionId },
      data: {
        ...(validatedData.url && { url: validatedData.url }),
        ...(validatedData.fileName && { file_name: validatedData.fileName }),
        ...(validatedData.size && { file_size: validatedData.size }),
      },
    });

    if (portada.count === 0) {
      return {
        success: false,
        error: "Portada no encontrada",
      };
    }

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error actualizando portada:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors[0].message}`
        : "Error al actualizar portada",
    };
  }
}

/**
 * Elimina la portada de una sección
 */
export async function eliminarPortadaSeccion(data: DeleteSeccionPortadaForm) {
  try {
    const validatedData = DeleteSeccionPortadaSchema.parse(data);

    await prisma.studio_section_cover.deleteMany({
      where: { section_id: validatedData.sectionId },
    });

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando portada:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors[0].message}`
        : "Error al eliminar portada",
    };
  }
}
