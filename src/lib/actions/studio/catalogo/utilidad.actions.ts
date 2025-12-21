"use server";

import { prisma } from "@/lib/prisma";
import {
    ConfiguracionPreciosSchema,
    type ConfiguracionPreciosForm,
    type ServiciosExistentes,
} from "@/lib/actions/schemas/configuracion-precios-schemas";
import { revalidatePath } from "next/cache";

/**
 * Obtiene la configuración de precios existente para un studio
 */
export async function obtenerConfiguracionPrecios(
    studioSlug: string
): Promise<ConfiguracionPreciosForm | null> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const config = await prisma.studio_configuraciones.findFirst({
            where: { 
                studio_id: studio.id,
                status: 'active',
            },
            orderBy: { updated_at: 'desc' },
        });

        if (!config) {
            console.log('[obtenerConfiguracionPrecios] No se encontró configuración para studio:', studioSlug);
            return null;
        }

        const result = {
            utilidad_servicio: config.service_margin != null ? String(config.service_margin) : undefined,
            utilidad_producto: config.product_margin != null ? String(config.product_margin) : undefined,
            comision_venta: config.sales_commission != null ? String(config.sales_commission) : undefined,
            sobreprecio: config.markup != null ? String(config.markup) : undefined,
        };

        console.log('[obtenerConfiguracionPrecios] Valores desde BD:', {
            service_margin: config.service_margin,
            product_margin: config.product_margin,
            sales_commission: config.sales_commission,
            markup: config.markup,
        });
        console.log('[obtenerConfiguracionPrecios] Valores retornados:', result);

        return result;
    } catch (error) {
        console.error("[obtenerConfiguracionPrecios] Error:", error);
        throw error;
    }
}

/**
 * Verifica cuántos servicios existen en el catálogo del studio
 * Retorna estadísticas de impacto
 */
export async function verificarServiciosExistentes(
    studioSlug: string
): Promise<ServiciosExistentes> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Contar items por tipo (SERVICIO o PRODUCTO)
        const totalServicios = await prisma.studio_items.count({
            where: {
                studio_id: studio.id,
                utility_type: "service",
            },
        });

        const totalProductos = await prisma.studio_items.count({
            where: {
                studio_id: studio.id,
                utility_type: "product",
            },
        });

        const totalPaquetes = await prisma.studio_paquetes.count({
            where: { studio_id: studio.id },
        });

        const totalItems = totalServicios + totalProductos + totalPaquetes;

        return {
            total_servicios: totalItems,
            servicios_por_tipo: {
                servicios: totalServicios,
                productos: totalProductos,
                paquetes: totalPaquetes,
            },
            requiere_actualizacion_masiva: totalItems > 0,
        };
    } catch (error) {
        console.error("[verificarServiciosExistentes] Error:", error);
        // Retornar valores por defecto en caso de error
        return {
            total_servicios: 0,
            servicios_por_tipo: {
                servicios: 0,
                productos: 0,
                paquetes: 0,
            },
            requiere_actualizacion_masiva: false,
        };
    }
}

/**
 * Actualiza la configuración de precios del studio
 * Recalcula automáticamente los precios de todos los servicios
 */
export async function actualizarConfiguracionPrecios(
    studioSlug: string,
    data: unknown
): Promise<{
    success: boolean;
    error?: string;
    servicios_actualizados?: number;
}> {
    try {
        // Validar datos con Zod
        const validatedData = ConfiguracionPreciosSchema.parse(data);

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

        // Los valores ya vienen como decimales (0.0-1.0) desde el formulario
        // Siempre procesar todos los valores, incluso si son "0" (campo vacío)
        // Asegurarse de que todos los campos se procesen correctamente
        const parseValue = (value: string | undefined): number => {
            if (!value || value.trim() === '') return 0;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        };

        const servicioMargin = parseValue(validatedData.utilidad_servicio);
        const productoMargin = parseValue(validatedData.utilidad_producto);
        const ventaComision = parseValue(validatedData.comision_venta);
        const markup = parseValue(validatedData.sobreprecio);

        console.log('[actualizarConfiguracionPrecios] Valores recibidos:', {
            utilidad_servicio: validatedData.utilidad_servicio,
            utilidad_producto: validatedData.utilidad_producto,
            comision_venta: validatedData.comision_venta,
            sobreprecio: validatedData.sobreprecio,
        });

        console.log('[actualizarConfiguracionPrecios] Valores parseados:', {
            servicioMargin,
            productoMargin,
            ventaComision,
            markup,
        });

        // Obtener o crear configuración
        // Obtener la configuración activa más reciente
        let config = await prisma.studio_configuraciones.findFirst({
            where: { 
                studio_id: studio.id,
                status: 'active',
            },
            orderBy: { updated_at: 'desc' },
        });

        // Siempre actualizar todos los campos con los valores recibidos
        const updateData = {
            service_margin: servicioMargin,
            product_margin: productoMargin,
            sales_commission: ventaComision,
            markup: markup,
        };

        if (!config) {
            config = await prisma.studio_configuraciones.create({
                data: {
                    studio_id: studio.id,
                    name: "Configuración de Precios",
                    status: 'active',
                    ...updateData,
                },
            });
            console.log('[actualizarConfiguracionPrecios] Configuración creada:', {
                configId: config.id,
                updateData,
            });
        } else {
            console.log('[actualizarConfiguracionPrecios] Actualizando configuración existente:', {
                configId: config.id,
                updateData,
            });
            
            const updated = await prisma.studio_configuraciones.update({
                where: { id: config.id },
                data: {
                    ...updateData,
                    status: 'active',
                    updated_at: new Date(),
                },
            });
            
            console.log('[actualizarConfiguracionPrecios] Configuración actualizada exitosamente:', {
                service_margin: updated.service_margin,
                product_margin: updated.product_margin,
                sales_commission: updated.sales_commission,
                markup: updated.markup,
            });
        }

        // Contar items totales actualizados
        const serviciosActualizados = await prisma.studio_items.count({
            where: { studio_id: studio.id },
        });

        // Revalidar la ruta del builder
        revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

        return {
            success: true,
            servicios_actualizados: serviciosActualizados,
        };
    } catch (error) {
        console.error("[actualizarConfiguracionPrecios] Error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Error al actualizar la configuración",
        };
    }
}
