/**
 * SINGLETON SUPABASE CLIENT (BROWSER)
 * 
 * Cliente para uso en el navegador (Client Components)
 * 
 * IMPORTANTE: Este cliente guarda en localStorage inicialmente,
 * pero Supabase SSR sincroniza automáticamente con cookies.
 * El middleware y servidor leen las cookies, no localStorage.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // createBrowserClient de @supabase/ssr:
  // - Guarda en localStorage inicialmente
  // - Sincroniza automáticamente con cookies HTTP
  // - El middleware puede leer las cookies
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,        // ✅ Guarda sesión (localStorage + cookies)
      autoRefreshToken: true,      // ✅ Refresca tokens automáticamente
      detectSessionInUrl: true,    // ✅ Detecta sesión en URL (OAuth)
      storageKey: 'zen-auth-token', // Clave para localStorage
      flowType: 'pkce',            // ✅ PKCE flow para seguridad
    },
  })

  return supabaseInstance
}

// Export también como createClient para compatibilidad
export const createClient = getSupabaseClient

