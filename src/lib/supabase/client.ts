import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      // Persistir sesión en localStorage
      persistSession: true,
      // Auto-refresh de tokens antes de expirar
      autoRefreshToken: true,
      // Detectar sesión en URL (para magic links, etc)
      detectSessionInUrl: true,
      // Storage key personalizado (opcional)
      storageKey: 'zen-auth-token',
      // Flow type para auth
      flowType: 'pkce', // PKCE es más seguro que implicit
    },
  })
}
