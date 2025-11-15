/**
 * SUPABASE CLIENT - BROWSER
 * Cliente singleton para el navegador con persistencia automática
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

let client: SupabaseClient | undefined

export function createClient() {
  // Si ya existe, devolverlo
  if (client) {
    return client
  }

  // Crear nuevo cliente con persistencia habilitada
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }
  )

  return client
}
