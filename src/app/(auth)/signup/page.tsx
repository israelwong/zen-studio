'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { ZenButton } from '@/components/ui/zen'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'

export default function SignUpPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            setLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'admin' // Por defecto, los nuevos usuarios son admin
                    }
                }
            })

            if (error) {
                setError(error.message)
                setLoading(false)
            } else {
                setSuccess(true)
                setLoading(false)
            }
        } catch (err) {
            setError('Error al crear la cuenta')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center text-green-600">¡Registro Exitoso!</CardTitle>
                            <CardDescription className="text-center">
                                Revisa tu email para confirmar tu cuenta
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-gray-600 mb-4">
                                Te hemos enviado un enlace de confirmación a tu email.
                            </p>
                            <ZenButton onClick={() => router.push('/login')} fullWidth>
                                Ir a Iniciar Sesión
                            </ZenButton>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">ProSocial Platform</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Crea tu cuenta de administrador
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Registrarse</CardTitle>
                        <CardDescription>
                            Crea una cuenta para acceder al panel de administración
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@prosocial.mx"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <ZenButton
                                type="submit"
                                fullWidth
                                loading={loading}
                                loadingText="Creando cuenta..."
                            >
                                Crear Cuenta
                            </ZenButton>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                ¿Ya tienes cuenta?{' '}
                                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                    Inicia sesión aquí
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
}
