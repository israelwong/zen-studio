import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPathForUser } from '@/lib/auth/redirect-utils'
import { LoginForm } from '@/components/login-form'
import { AuthHeader } from '@/components/auth-header'

export default async function Page() {
  // Verificar si hay sesión activa en el servidor
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Si hay sesión activa, redirigir automáticamente (usando función única de verdad)
  if (session?.user) {
    const redirectResult = getRedirectPathForUser(session.user)
    
    if (redirectResult.shouldRedirect && redirectResult.redirectPath) {
      console.log('[Login Page] ✅ Sesión activa detectada, redirigiendo a:', redirectResult.redirectPath)
      redirect(redirectResult.redirectPath)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-sm">
        <AuthHeader
          // title="Bienvenido"
          subtitle="Ingresa a tu cuenta para acceder al tu panel de administración en ProSocial Platform"
        />
        <LoginForm />
      </div>
    </div>
  )
}
