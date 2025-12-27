/**
 * STORAGE ADAPTER PARA SUPABASE
 * 
 * Respeta la preferencia "rememberMe" del usuario:
 * - Si rememberMe = true: usa localStorage (persistente)
 * - Si rememberMe = false: usa sessionStorage (se borra al cerrar navegador)
 * 
 * El adapter lee dinámicamente la preferencia en cada operación,
 * permitiendo cambiar el comportamiento sin recrear el cliente.
 */

const REMEMBER_ME_KEY = 'zen-remember-me'

export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(REMEMBER_ME_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

export function setRememberMePreference(value: boolean): void {
  if (typeof window === 'undefined') return

  try {
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  } catch {
    // Ignorar errores de localStorage
  }
}

export function clearRememberMePreference(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(REMEMBER_ME_KEY)
  } catch {
    // Ignorar errores
  }
}

/**
 * Helper para sincronizar cookies de PKCE a cookies HTTP
 * Supabase guarda code_verifier en storage, pero necesita estar en cookies HTTP para el callback
 * 
 * IMPORTANTE: Supabase usa el mismo nombre para la clave en storage y para la cookie HTTP
 * Formato: sb-{project-ref}-auth-token-code-verifier
 */
function syncPkceToCookies(key: string, value: string | null): void {
  if (typeof window === 'undefined') return

  // Detectar si es una cookie de PKCE (code-verifier o code-challenge)
  // Supabase usa nombres como: sb-{project-ref}-auth-token-code-verifier
  const isPkceCookie =
    (key.includes('code-verifier') || key.includes('code-challenge')) &&
    key.startsWith('sb-') // Asegurar que es una cookie de Supabase

  if (!isPkceCookie) return

  try {
    // El nombre de la cookie debe ser exactamente el mismo que la clave en storage
    // Supabase usa el mismo nombre para ambos
    const cookieName = key

    if (value === null) {
      // Remover cookie de ambos paths posibles
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth; SameSite=Lax`
      console.log('[Storage Adapter] Cookie PKCE removida:', cookieName)
    } else {
      // Establecer cookie con opciones apropiadas
      // IMPORTANTE: No usar httpOnly porque JavaScript necesita leerla
      // SameSite=Lax permite que se envíe en redirecciones cross-site desde Google
      // Secure solo en HTTPS (detectar por location.protocol)
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const secureFlag = isSecure ? '; Secure' : ''
      const maxAge = 60 * 10 // 10 minutos (tiempo típico de OAuth flow)

      // CRUCIAL: Establecer cookie con el valor EXACTO (sin encoding adicional)
      // El navegador maneja el encoding automáticamente
      // El valor debe ser exactamente el mismo que está en storage
      const cookieString = `${cookieName}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`
      document.cookie = cookieString

      console.log('[Storage Adapter] Cookie establecida:', {
        name: cookieName,
        valueLength: value.length,
        cookieStringLength: cookieString.length,
      })

      console.log('[Storage Adapter] Cookie PKCE sincronizada:', {
        name: cookieName,
        valueLength: value.length,
        valuePreview: value.substring(0, 20) + '...',
      })
    }
  } catch (error) {
    console.warn('[Storage Adapter] Error sincronizando PKCE a cookies:', error)
  }
}

/**
 * Storage adapter que respeta la preferencia rememberMe
 * Lee dinámicamente la preferencia en cada operación
 * 
 * CRÍTICO: Para cookies de PKCE, usar localStorage directamente SIN sincronización manual
 * Supabase maneja la sincronización a cookies HTTP internamente cuando se usa localStorage
 */
export function createRememberMeStorage(): Storage {
  return {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') return null

      try {
        // Para cookies de PKCE, SIEMPRE usar localStorage directamente
        // Supabase espera que esté en localStorage para sincronizarlo a cookies HTTP
        const isPkceCookie =
          (key.includes('code-verifier') || key.includes('code-challenge')) &&
          key.startsWith('sb-')

        if (isPkceCookie) {
          // Usar localStorage directamente - Supabase lo sincroniza automáticamente
          return localStorage.getItem(key)
        }

        // Para otras claves, usar rememberMe preference
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') return

      try {
        // Detectar si es una cookie de PKCE
        const isPkceCookie =
          (key.includes('code-verifier') || key.includes('code-challenge')) &&
          key.startsWith('sb-')

        if (isPkceCookie) {
          // CRÍTICO: Para PKCE, guardar en localStorage Y sincronizar a cookies HTTP
          // createBrowserClient NO sincroniza automáticamente a cookies HTTP
          // El callback del servidor necesita leerlo de cookies HTTP
          localStorage.setItem(key, value)
          // Sincronizar inmediatamente a cookies HTTP con el MISMO valor
          syncPkceToCookies(key, value)
          console.log('[Storage Adapter] PKCE guardado y sincronizado:', {
            key,
            valueLength: value.length,
            valuePreview: value.substring(0, 30) + '...',
          })
          return
        }

        // Para otras claves, usar rememberMe preference
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        storage.setItem(key, value)
      } catch {
        // Ignorar errores de storage
      }
    },
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') return

      try {
        // Remover de ambos storages para asegurar limpieza completa
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch {
        // Ignorar errores
      }
    },
    get length(): number {
      if (typeof window === 'undefined') return 0

      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.length
      } catch {
        return 0
      }
    },
    clear(): void {
      if (typeof window === 'undefined') return

      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        storage.clear()
      } catch {
        // Ignorar errores
      }
    },
    key(index: number): string | null {
      if (typeof window === 'undefined') return null

      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.key(index)
      } catch {
        return null
      }
    },
  }
}

