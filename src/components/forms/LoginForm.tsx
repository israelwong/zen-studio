'use client'

/**
 * LOGIN FORM - VERSIÓN LIMPIA
 * Sin complejidades, login directo y redirección
 */

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { setRememberMePreference, getRememberMePreference } from '@/lib/supabase/storage-adapter'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar preferencia guardada al montar
  useEffect(() => {
    setRememberMe(getRememberMePreference())
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Guardar preferencia antes del login para que el storage adapter la respete
      setRememberMePreference(rememberMe)

      const supabase = createClient()
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!data.user) throw new Error('No se pudo obtener usuario')

      // Determinar redirección según rol
      const role = data.user.user_metadata?.role
      const studioSlug = data.user.user_metadata?.studio_slug

      let redirectPath = '/login'

      if (role === 'suscriptor' && studioSlug) {
        redirectPath = `/${studioSlug}/studio`
      } else if (role === 'admin') {
        redirectPath = '/admin/dashboard'
      } else if (role === 'agente') {
        redirectPath = '/agente/leads'
      }

      // Esperar que el AuthContext detecte el cambio (el listener onAuthStateChange se dispara)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Usar router.push en lugar de window.location para mantener el contexto
      router.push(redirectPath)
      
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={loading}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer"
            >
              Mantener sesión iniciada
            </Label>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

