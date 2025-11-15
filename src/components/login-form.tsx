'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useAuth } from '@/contexts/AuthContext'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirigir si ya tiene sesión activa
  useEffect(() => {
    if (!loading && user) {
      const studioSlug = user.user_metadata?.studio_slug
      const role = user.user_metadata?.role

      if (role === 'suscriptor' && studioSlug) {
        router.replace(`/${studioSlug}/studio`)
      } else if (role === 'admin') {
        router.replace('/admin/dashboard')
      } else if (role === 'agente') {
        router.replace('/agente/leads')
      }
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw loginError
      if (!data.user) throw new Error('Usuario no encontrado')

      // Redirigir inmediatamente después del login exitoso
      const studioSlug = data.user.user_metadata?.studio_slug
      const role = data.user.user_metadata?.role

      if (role === 'suscriptor' && studioSlug) {
        router.push(`/${studioSlug}/studio/dashboard`)
      } else if (role === 'admin') {
        router.push('/admin/dashboard')
      } else if (role === 'agente') {
        router.push('/agente/leads')
      } else {
        throw new Error('Rol no válido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setIsSubmitting(false)
    }
  }

  // Mostrar loading mientras verifica sesión
  if (loading) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-zinc-400">Verificando sesión...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
