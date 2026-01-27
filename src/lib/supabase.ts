import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

// ✅ SINGLETON: Cliente para componentes del cliente (navegador)
// Patrón Singleton estricto para evitar múltiples instancias
let clientInstance: SupabaseClient | undefined

export const createClientSupabase = (): SupabaseClient => {
    // ✅ SINGLETON: Reutilizar instancia existente
    if (clientInstance) {
        return clientInstance
    }
    
    // ✅ SINGLETON: Crear solo una vez
    clientInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
    
    return clientInstance
}