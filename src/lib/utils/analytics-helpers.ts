/**
 * Utilidades para analytics
 */

/**
 * Detectar si un user_agent es mobile o desktop
 */
export function detectDeviceType(userAgent?: string | null): 'mobile' | 'desktop' | 'unknown' {
    if (!userAgent) return 'unknown';

    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
}

/**
 * Calcular visitas únicas basadas en IP
 */
export function calculateUniqueVisits<T extends { ip_address?: string | null }>(
    visits: T[]
): { unique: number; total: number } {
    const uniqueIPs = new Set(
        visits
            .map(v => v.ip_address)
            .filter((ip): ip is string => Boolean(ip))
    );
    return {
        unique: uniqueIPs.size,
        total: visits.length,
    };
}

/**
 * Calcular visitas recurrentes basadas en IP
 * Una visita recurrente es cuando la misma IP visita más de una vez
 */
export function calculateRecurrentVisits<T extends { ip_address?: string | null }>(
    visits: T[]
): { unique: number; recurrent: number; total: number } {
    const ipCounts = new Map<string, number>();
    
    // Contar cuántas veces visita cada IP
    visits.forEach(v => {
        if (v.ip_address) {
            ipCounts.set(v.ip_address, (ipCounts.get(v.ip_address) || 0) + 1);
        }
    });

    const uniqueIPs = ipCounts.size;
    // IPs que visitaron más de una vez son recurrentes
    const recurrentIPs = Array.from(ipCounts.values()).filter(count => count > 1).length;
    
    // Calcular total de visitas recurrentes (suma de todas las visitas después de la primera por cada IP)
    const totalRecurrentVisits = Array.from(ipCounts.values())
        .filter(count => count > 1)
        .reduce((sum, count) => sum + (count - 1), 0);

    return {
        unique: uniqueIPs,
        recurrent: totalRecurrentVisits, // Total de visitas recurrentes (no IPs recurrentes)
        total: visits.length,
    };
}
