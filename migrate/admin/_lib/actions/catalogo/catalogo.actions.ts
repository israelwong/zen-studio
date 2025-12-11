// Ruta: app/admin/_lib/actions/catalogo/catalogo.actions.ts

'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { UpdatePosicionSchema } from './catalogo.schemas';
import { SeccionSchema, CategoriaSchema } from './catalogo.schemas';
import { calcularServicioDesdeBase } from '@/app/admin/_lib/actions/pricing/calculos';
import { getGlobalConfiguracion } from '@/app/admin/_lib/actions/configuracion/configuracion.actions';
import z from 'zod';


const basePath = '/admin/configurar/catalogo'; // Nueva ruta

// --- Función de Lectura Principal ---
export async function obtenerCatalogoCompleto() {
    const catalogo = await prisma.servicioSeccion.findMany({
        orderBy: { posicion: 'asc' },
        include: {
            seccionCategorias: {
                orderBy: { ServicioCategoria: { posicion: 'asc' } },
                include: {
                    ServicioCategoria: {
                        include: {
                            Servicio: {
                                orderBy: { posicion: 'asc' },
                                include: {
                                    ServicioGasto: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    // Obtener configuración global para cálculos
    const configuracion = await getGlobalConfiguracion();

    // Recalcular precios dinámicamente para cada servicio
    const catalogoConPreciosActualizados = await Promise.all(
        catalogo.map(async (seccion) => ({
            ...seccion,
            seccionCategorias: await Promise.all(
                seccion.seccionCategorias.map(async (seccionCategoria) => ({
                    ...seccionCategoria,
                    ServicioCategoria: {
                        ...seccionCategoria.ServicioCategoria,
                        Servicio: seccionCategoria.ServicioCategoria.Servicio.map((servicio) => {
                            if (!configuracion) {
                                return { ...servicio, precio_publico: servicio.precio_publico };
                            }

                            // Calcular gastos totales
                            const totalGastos = servicio.ServicioGasto?.reduce((acc, gasto) => acc + gasto.costo, 0) || 0;

                            // Calcular precio usando la función de pricing
                            const resultado = calcularServicioDesdeBase({
                                costo: servicio.costo,
                                gastos: totalGastos,
                                tipo_utilidad: servicio.tipo_utilidad as 'servicio' | 'producto',
                                configuracion,
                            });

                            return {
                                ...servicio,
                                precio_publico: resultado.precioSistema,
                            };
                        }),
                    },
                }))
            ),
        }))
    );

    return catalogoConPreciosActualizados;
}

// --- Lectura individual de Categoría ---
export async function obtenerCategoria(id: string) {
    return await prisma.servicioCategoria.findUnique({ where: { id } });
}

// --- Acciones para Secciones ---
export async function crearSeccion(data: { nombre: string, descripcion?: string }) {
    const count = await prisma.servicioSeccion.count();
    await prisma.servicioSeccion.create({ data: { ...data, posicion: count } }); // Base 0
    revalidatePath(basePath);
}

// --- Acciones para Categorías ---
export async function crearCategoria(data: { nombre: string, seccionId: string }) {
    // Contar solo las categorías dentro de esta sección específica
    const count = await prisma.seccionCategoria.count({ where: { seccionId: data.seccionId } });
    const categoria = await prisma.servicioCategoria.create({ data: { nombre: data.nombre, posicion: count } }); // Base 0
    await prisma.seccionCategoria.create({
        data: {
            seccionId: data.seccionId,
            categoriaId: categoria.id,
        }
    });
    revalidatePath(basePath);
}

// --- Acciones para Servicios ---
// (Aquí irían las acciones para crear/actualizar servicios, que ya tenemos)

// --- Acciones para Reordenar (Drag and Drop) ---
export async function reordenarCategorias(seccionId: string, categoriaIds: string[]) {
    const updates = categoriaIds.map((id, index) =>
        prisma.servicioCategoria.update({
            where: { id },
            data: { posicion: index, seccionCategoria: { update: { where: { categoriaId: id }, data: { seccionId } } } }, // Base 0
        })
    );
    await prisma.$transaction(updates);
    revalidatePath(basePath);
}

export async function reordenarServicios(categoriaId: string, servicioIds: string[]) {
    const updates = servicioIds.map((id, index) =>
        prisma.servicio.update({
            where: { id },
            data: { posicion: index, servicioCategoriaId: categoriaId }, // Base 0
        })
    );
    await prisma.$transaction(updates);
    revalidatePath(basePath);
}

// --- Funciones Helper para Reordenamiento ---

/**
 * Reordena un contenedor después de remover un ítem, cerrando el hueco
 */
async function reorderContainerAfterRemoval(tx: any, itemType: string, parentId: string, removedItemId: string) {
    let siblings: { id: string; posicion: number }[] = [];

    switch (itemType) {
        case 'seccion':
            // Las secciones viven en la raíz
            siblings = await tx.servicioSeccion.findMany({
                where: { id: { not: removedItemId } },
                orderBy: { posicion: 'asc' },
                select: { id: true, posicion: true }
            });
            break;
        case 'categoria':
            // Categorías asociadas a una sección
            const seccionCategorias = await tx.seccionCategoria.findMany({
                where: { seccionId: parentId },
                include: { ServicioCategoria: { select: { id: true, posicion: true } } }
            });
            siblings = seccionCategorias
                .map((sc: any) => sc.ServicioCategoria)
                .filter((cat: any) => cat.id !== removedItemId)
                .sort((a: any, b: any) => a.posicion - b.posicion);
            break;
        case 'servicio':
            // Servicios asociados a una categoría
            siblings = await tx.servicio.findMany({
                where: {
                    servicioCategoriaId: parentId,
                    id: { not: removedItemId }
                },
                orderBy: { posicion: 'asc' },
                select: { id: true, posicion: true }
            });
            break;
    }

    console.log('🧹 Reordenando contenedor origen:', {
        parentId,
        itemType,
        siblingsCount: siblings.length,
        siblings: siblings.map((s, i) => `${i}: ${s.id} (pos: ${s.posicion})`)
    });

    // Reordenar los hermanos restantes con posiciones consecutivas (0, 1, 2...)
    const updatePromises = siblings.map((sibling, index) => {
        switch (itemType) {
            case 'seccion':
                return tx.servicioSeccion.update({
                    where: { id: sibling.id },
                    data: { posicion: index }
                });
            case 'categoria':
                return tx.servicioCategoria.update({
                    where: { id: sibling.id },
                    data: { posicion: index }
                });
            case 'servicio':
                return tx.servicio.update({
                    where: { id: sibling.id },
                    data: { posicion: index }
                });
            default:
                throw new Error(`Tipo de item no válido: ${itemType}`);
        }
    });

    await Promise.all(updatePromises);
}

/**
 * Reordena el contenedor de destino insertando el ítem en la posición especificada
 */
async function reorderDestinationContainer(tx: any, itemType: string, parentId: string, movedItemId: string, newIndex: number, isCrossContainerMove: boolean) {
    let siblings: { id: string; posicion: number }[] = [];

    switch (itemType) {
        case 'seccion':
            // Las secciones viven en la raíz
            siblings = await tx.servicioSeccion.findMany({
                where: isCrossContainerMove ? {} : { id: { not: movedItemId } },
                orderBy: { posicion: 'asc' },
                select: { id: true, posicion: true }
            });
            break;
        case 'categoria':
            // Categorías asociadas a una sección
            const seccionCategoriasDestino = await tx.seccionCategoria.findMany({
                where: { seccionId: parentId },
                include: { ServicioCategoria: { select: { id: true, posicion: true } } }
            });
            siblings = seccionCategoriasDestino
                .map((sc: any) => sc.ServicioCategoria)
                .filter((cat: any) => isCrossContainerMove || cat.id !== movedItemId)
                .sort((a: any, b: any) => a.posicion - b.posicion);
            break;
        case 'servicio':
            // Servicios asociados a una categoría
            siblings = await tx.servicio.findMany({
                where: {
                    servicioCategoriaId: parentId,
                    ...(isCrossContainerMove ? {} : { id: { not: movedItemId } })
                },
                orderBy: { posicion: 'asc' },
                select: { id: true, posicion: true }
            });
            break;
    }

    console.log('🎯 Reordenando contenedor destino:', {
        parentId,
        itemType,
        newIndex,
        siblingsCount: siblings.length,
        isCrossContainerMove,
        siblings: siblings.map((s, i) => `${i}: ${s.id} (pos: ${s.posicion})`)
    });

    // Crear el nuevo orden: insertar el ítem movido en la posición especificada
    const newOrder = [...siblings.map(s => s.id)];

    // Si no es un movimiento entre contenedores, remover el ítem de su posición actual
    if (!isCrossContainerMove) {
        const currentIndex = newOrder.indexOf(movedItemId);
        if (currentIndex !== -1) {
            newOrder.splice(currentIndex, 1);
        }
    }

    // Insertar el ítem en la nueva posición
    const safeNewIndex = Math.min(newIndex, newOrder.length);
    newOrder.splice(safeNewIndex, 0, movedItemId);

    console.log('📋 Nuevo orden calculado:', {
        newOrder: newOrder.map((id, i) => `${i}: ${id}`),
        insertedAt: safeNewIndex
    });

    // Actualizar todas las posiciones según el nuevo orden
    const updatePromises = newOrder.map((itemId, index) => {
        switch (itemType) {
            case 'seccion':
                return tx.servicioSeccion.update({
                    where: { id: itemId },
                    data: { posicion: index }
                });
            case 'categoria':
                return tx.servicioCategoria.update({
                    where: { id: itemId },
                    data: { posicion: index }
                });
            case 'servicio':
                return tx.servicio.update({
                    where: { id: itemId },
                    data: { posicion: index }
                });
            default:
                throw new Error(`Tipo de item no válido: ${itemType}`);
        }
    });

    await Promise.all(updatePromises);
}

/**
 * Actualiza la relación padre-hijo cuando un ítem se mueve entre contenedores
 */
async function updateParentRelation(tx: any, itemType: string, itemId: string, newParentId: string) {
    switch (itemType) {
        case 'categoria':
            if (typeof newParentId !== 'string') {
                throw new Error('El nuevo seccionId no puede ser null o undefined');
            }
            await tx.seccionCategoria.update({
                where: { categoriaId: itemId },
                data: { seccionId: newParentId }
            });
            break;
        case 'servicio':
            if (typeof newParentId !== 'string') {
                throw new Error('El nuevo servicioCategoriaId no puede ser null o undefined');
            }
            await tx.servicio.update({
                where: { id: itemId },
                data: { servicioCategoriaId: newParentId }
            });
            break;
        // Las secciones no tienen padre, no necesitan actualización
    }
}




// REEMPLAZO PARA reordenarItems, moverCategoriaASeccion, moverServicioACategoria
export async function actualizarPosicionCatalogo(payload: unknown) {
    const validation = UpdatePosicionSchema.safeParse(payload);
    if (!validation.success) {
        throw new Error(`Datos inválidos: ${validation.error.message}`);
    }

    const { itemId, itemType, newParentId, newIndex } = validation.data;

    console.log('🔍 DEBUG - Datos recibidos del frontend:', {
        itemId,
        itemType,
        newParentId,
        newIndex
    });

    await prisma.$transaction(async (tx) => {
        // Paso 1: Obtener el estado actual del ítem que se mueve
        let oldParentId: string | null = null;

        switch (itemType) {
            case 'seccion':
                const seccion = await tx.servicioSeccion.findUniqueOrThrow({ where: { id: itemId } });
                oldParentId = 'root'; // Las secciones viven en la raíz
                break;
            case 'categoria':
                const seccionCategoria = await tx.seccionCategoria.findUniqueOrThrow({ where: { categoriaId: itemId } });
                oldParentId = seccionCategoria.seccionId;
                break;
            case 'servicio':
                const servicio = await tx.servicio.findUniqueOrThrow({ where: { id: itemId } });
                oldParentId = servicio.servicioCategoriaId;
                break;
        }

        const isSameContainer = oldParentId === newParentId;
        const isCrossContainerMove = !isSameContainer;

        console.log('📍 Estado del movimiento:', {
            oldParentId,
            newParentId,
            isSameContainer,
            isCrossContainerMove
        });

        // Paso 2: Si es un movimiento entre contenedores, reordenar el contenedor de origen
        if (isCrossContainerMove && oldParentId) {
            await reorderContainerAfterRemoval(tx, itemType, oldParentId, itemId);
        }

        // Paso 3: Reordenar el contenedor de destino con el nuevo ítem
        await reorderDestinationContainer(tx, itemType, newParentId, itemId, newIndex, isCrossContainerMove);

        // Paso 4: Actualizar la relación padre-hijo si es necesario
        if (isCrossContainerMove) {
            await updateParentRelation(tx, itemType, itemId, newParentId);
        }
    });

    revalidatePath(basePath);
    return { success: true };
}


export async function upsertSeccion(data: z.infer<typeof SeccionSchema>) {
    const { id, ...rest } = SeccionSchema.parse(data);
    let savedSeccion;
    if (id) {
        savedSeccion = await prisma.servicioSeccion.update({ where: { id }, data: rest });
    } else {
        const count = await prisma.servicioSeccion.count();
        savedSeccion = await prisma.servicioSeccion.create({ data: { ...rest, posicion: count } });
    }
    revalidatePath(basePath);
    // Devuelve solo el item guardado, no todo el catálogo
    return savedSeccion;
}

export async function upsertCategoria(data: z.infer<typeof CategoriaSchema> & { id?: string, seccionId?: string }) {
    const CategoriaCreateSchema = CategoriaSchema.extend({
        id: z.string().cuid().optional(),
        seccionId: z.string().cuid().optional(),
    });

    const { id, nombre, seccionId } = CategoriaCreateSchema.parse(data);
    let savedCategoria;

    if (id) {
        savedCategoria = await prisma.servicioCategoria.update({ where: { id }, data: { nombre } });
    } else if (seccionId) {
        const count = await prisma.seccionCategoria.count({ where: { seccionId: seccionId } });
        savedCategoria = await prisma.servicioCategoria.create({ data: { nombre, posicion: count } });
        await prisma.seccionCategoria.create({ data: { seccionId: seccionId, categoriaId: savedCategoria.id } });
    } else {
        throw new Error('SeccionId es requerido para crear una nueva categoría.');
    }
    revalidatePath(basePath);
    // Devuelve solo el item guardado
    return savedCategoria;
}

export async function deleteItem(id: string, type: 'seccion' | 'categoria') {
    await prisma.$transaction(async (tx) => {
        if (type === 'seccion') {
            const seccionToDelete = await tx.servicioSeccion.findUnique({ where: { id }, include: { seccionCategorias: true } });
            if (!seccionToDelete) throw new Error("Sección no encontrada.");
            if (seccionToDelete.seccionCategorias.length > 0) throw new Error("No se puede eliminar una sección con categorías.");

            await tx.servicioSeccion.delete({ where: { id } });
            // Reordenar las secciones restantes
            const remaining = await tx.servicioSeccion.findMany({ orderBy: { posicion: 'asc' } });
            await Promise.all(remaining.map((item, index) => tx.servicioSeccion.update({ where: { id: item.id }, data: { posicion: index } })));

        } else if (type === 'categoria') {
            const categoriaToDelete = await tx.servicioCategoria.findUnique({ where: { id }, include: { Servicio: true } });
            if (!categoriaToDelete) throw new Error("Categoría no encontrada.");
            if (categoriaToDelete.Servicio.length > 0) throw new Error("No se puede eliminar una categoría con servicios.");

            // Obtener sección ANTES de eliminar para poder reordenar después
            const seccion = await tx.seccionCategoria.findFirst({ where: { categoriaId: id } });

            await tx.seccionCategoria.delete({ where: { categoriaId: id } });
            await tx.servicioCategoria.delete({ where: { id } });

            // Reordenar las categorías restantes en la misma sección
            if (seccion) {
                const remaining = await tx.servicioCategoria.findMany({ where: { seccionCategoria: { seccionId: seccion.seccionId } }, orderBy: { posicion: 'asc' } });
                await Promise.all(remaining.map((item, index) => tx.servicioCategoria.update({ where: { id: item.id }, data: { posicion: index } })));
            }
        }
    });
    revalidatePath(basePath);
}