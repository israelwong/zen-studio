'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ContactoData } from '@/app/[slug]/studio/builder/contacto/types';

/**
 * Contacto Actions - WRITE operations only
 * 
 * READ operations are handled by builder-profile.actions.ts
 * which fetches all data in a single optimized query.
 */

export async function actualizarContacto(studioSlug: string, data: Partial<ContactoData>) {
    try {
        console.log('🔄 [actualizarContacto] Updating contacto for slug:', studioSlug, 'with data:', data);

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            console.error('❌ [actualizarContacto] Studio not found:', studioSlug);
            return { success: false, error: 'Studio no encontrado' };
        }

        // Actualizar datos del studio
        const updateData: { description?: string; address?: string; maps_url?: string } = {};

        if (data.descripcion !== undefined) {
            updateData.description = data.descripcion;
        }

        if (data.direccion !== undefined) {
            updateData.address = data.direccion;
        }

        if (data.google_maps_url !== undefined) {
            updateData.maps_url = data.google_maps_url;
        }

        // Solo actualizar si hay datos que cambiar
        if (Object.keys(updateData).length > 0) {
            await prisma.studios.update({
                where: { id: studio.id },
                data: updateData
            });
            console.log('✅ [actualizarContacto] Studio updated successfully');
        }

        // Revalidar las páginas para reflejar los cambios
        revalidatePath(`/studio/${studioSlug}/builder/contacto`);
        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        console.log('✅ [actualizarContacto] Pages revalidated');

        return { success: true };
    } catch (error) {
        console.error('❌ [actualizarContacto] Error:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}