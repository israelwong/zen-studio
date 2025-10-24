"use server";

import { prisma } from "@/lib/prisma";
import type { PublicPaquete } from "@/types/public-profile";

/**
 * Obtiene los paquetes públicos de un estudio
 * Para mostrar en el perfil público
 */
export async function getPublicPaquetes(
    studioSlug: string
): Promise<{
    success: boolean;
    data?: PublicPaquete[];
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        const paquetes = await prisma.studio_paquetes.findMany({
            where: {
                studio_id: studio.id,
                status: "active",
            },
            include: {
                event_types: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { order: "asc" },
        });

        // Transformar datos al formato público
        const publicPaquetes: PublicPaquete[] = paquetes.map((paquete) => ({
            id: paquete.id,
            nombre: paquete.nombre,
            descripcion: paquete.descripcion || undefined,
            precio: paquete.precio,
            tipo_evento: paquete.event_types?.name || undefined,
            duracion_horas: paquete.duracion_horas || undefined,
            incluye: paquete.incluye || undefined,
            no_incluye: paquete.no_incluye || undefined,
            condiciones: paquete.condiciones || undefined,
            order: paquete.order,
        }));

        return {
            success: true,
            data: publicPaquetes,
        };
    } catch (error) {
        console.error("[getPublicPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al obtener paquetes",
        };
    }
}
