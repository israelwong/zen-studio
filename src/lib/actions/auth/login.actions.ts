'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDefaultRoute } from '@/types/auth'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
}

/**
 * Server Action para login
 * Maneja autenticación, verificación de sesión y redirect en el servidor
 */
export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const supabase = await createClient()

    // Intentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Login error:', error.message)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo obtener información del usuario',
      }
    }

    // Obtener rol del usuario
    const userRole = data.user.user_metadata?.role

    if (!userRole) {
      console.error('❌ No se encontró rol del usuario')
      return {
        success: false,
        error: 'Usuario sin rol asignado',
      }
    }

    // Determinar ruta de redirect
    let redirectPath: string

    if (userRole === 'suscriptor') {
      const studioSlug = data.user.user_metadata?.studio_slug
      if (!studioSlug) {
        console.error('❌ Suscriptor sin studio_slug')
        return {
          success: false,
          error: 'Usuario sin estudio asignado',
        }
      }
      redirectPath = getDefaultRoute(userRole, studioSlug)
    } else {
      redirectPath = getDefaultRoute(userRole)
    }

    console.log('✅ Login exitoso:', data.user.email)
    console.log('✅ Redirect a:', redirectPath)

    // Revalidar todas las rutas para asegurar que el middleware detecte la sesión
    revalidatePath('/', 'layout')

    // Redirect usando Next.js (maneja cookies automáticamente)
    redirect(redirectPath)

  } catch (error) {
    console.error('❌ Error en loginAction:', error)
    
    // Si es un redirect de Next.js, re-throw (es esperado)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

