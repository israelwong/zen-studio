import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

/**
 * Endpoint API para sincronizar sesión de localStorage a cookies
 * Se llama después del login en el cliente para asegurar que
 * el middleware pueda leer la sesión desde cookies
 * 
 * IMPORTANTE: Este endpoint lee la sesión desde las cookies que
 * Supabase SSR establece automáticamente cuando se hace login.
 * Si el cliente ya tiene sesión en localStorage, Supabase SSR
 * debería sincronizarla automáticamente a cookies en el próximo request.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const { supabase } = createClient(request, response)

  // Intentar obtener sesión desde cookies
  // createClient del middleware lee cookies del request
  // y las escribe en la response automáticamente
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('❌ Error sincronizando sesión:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  if (!session) {
    console.log('⚠️ No hay sesión en cookies aún')
    // Esto puede pasar si el cliente aún no ha sincronizado localStorage → cookies
    // En ese caso, el middleware debería poder leer las cookies en el próximo request
    return NextResponse.json({ 
      success: false, 
      error: 'No hay sesión activa en cookies',
      message: 'La sesión puede estar en localStorage. El middleware la sincronizará automáticamente.'
    }, { status: 401 })
  }

  console.log('✅ Sesión sincronizada en cookies:', session.user.email)
  
  // Las cookies ya están establecidas por createClient en la response
  return response
}

