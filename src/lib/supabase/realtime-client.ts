/**
 * REALTIME CLIENT - USA SINGLETON BASE
 * 
 * Re-exporta el cliente singleton que ya incluye:
 * - Persistencia de sesión
 * - Auto-refresh de tokens
 * - Sincronización con cookies
 * 
 * El cliente singleton de @supabase/ssr ya maneja realtime correctamente
 */

import { createClient } from './client-singleton';

// Usar el mismo cliente singleton para realtime
// @supabase/ssr ya maneja realtime de forma óptima
export const supabaseRealtime = createClient();

// Re-exportar createClient del singleton
export { createClient as createRealtimeClient };
