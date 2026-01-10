/**
 * Utilidades para filtrar analytics excluyendo al owner del studio
 * 
 * Por defecto, las estadísticas EXCLUYEN las visitas/interacciones del owner del studio.
 * Para desarrollo local, puedes incluir al owner agregando en tu .env.local:
 * 
 * ANALYTICS_INCLUDE_OWNER=true
 * 
 * Esto es útil para probar el tracking sin afectar las estadísticas reales.
 */

/**
 * Obtener el owner_id de un studio
 * El owner es el primer usuario en studio_user_profiles asociado al studio
 */
export async function getStudioOwnerId(studioId: string): Promise<string | null> {
    const { prisma } = await import('@/lib/prisma');
    
    const ownerProfile = await prisma.studio_user_profiles.findFirst({
        where: {
            studio_id: studioId,
            is_active: true,
        },
        select: {
            supabase_id: true,
        },
        orderBy: {
            created_at: 'asc', // Primer usuario = owner
        }
    });

    return ownerProfile?.supabase_id || null;
}

/**
 * Verificar si debemos incluir al owner en las estadísticas
 * Controlado por variable de entorno ANALYTICS_INCLUDE_OWNER (default: false)
 */
export function shouldIncludeOwnerInAnalytics(): boolean {
    return process.env.ANALYTICS_INCLUDE_OWNER === 'true';
}

/**
 * Crear filtro para excluir eventos del owner del studio
 * @param studioId ID del studio
 * @param ownerId ID del owner (opcional, se obtiene si no se proporciona)
 */
export async function createOwnerExclusionFilter(
    studioId: string,
    ownerId?: string | null
): Promise<{ user_id?: { not: string } }> {
    // Si la variable de entorno permite incluir owner, no filtrar
    if (shouldIncludeOwnerInAnalytics()) {
        return {};
    }

    // Obtener owner_id si no se proporciona
    const ownerUserId = ownerId ?? await getStudioOwnerId(studioId);

    // Si no hay owner_id, no filtrar (evitar errores)
    if (!ownerUserId) {
        return {};
    }

    // Excluir eventos del owner
    return {
        user_id: { not: ownerUserId }
    };
}
