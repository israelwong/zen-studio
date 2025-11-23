'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { ZenButton } from '@/components/ui/zen'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'

function LoginClienteForm() {
    const [codigoAcceso, setCodigoAcceso] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!codigoAcceso.trim()) {
            setError('Por favor ingresa tu código de acceso')
            setLoading(false)
            return
        }

        try {
            const supabase = createClient()

            // Verificar el código de acceso
            const { data, error: verifyError } = await supabase
                .from('cliente_access_codes')
                .select('*, studio:studios(slug, name)')
                .eq('access_code', codigoAcceso)
                .eq('is_active', true)
                .single()

            if (verifyError || !data) {
                setError('Código de acceso inválido o expirado')
                setLoading(false)
                return
            }

            // Verificar si el código no ha expirado
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                setError('El código de acceso ha expirado')
                setLoading(false)
                return
            }

            // Actualizar metadata del usuario con acceso de cliente
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    cliente_access: {
                        studio_slug: data.studio.slug,
                        studio_name: data.studio.name,
                        access_code: codigoAcceso,
                        granted_at: new Date().toISOString()
                    }
                }
            })

            if (updateError) {
                setError('Error al procesar el acceso')
                setLoading(false)
                return
            }

            // Redirigir al portal del cliente
            router.push(redirectTo)

        } catch (err) {
            setError('Error al verificar el código de acceso')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">
                            Acceso al Portal
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Ingresa tu código de acceso para ver tus servicios
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <Alert className="bg-red-900/20 border-red-800">
                                    <AlertDescription className="text-red-400">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="codigoAcceso" className="text-white">
                                    Código de Acceso
                                </Label>
                                <Input
                                    id="codigoAcceso"
                                    type="text"
                                    value={codigoAcceso}
                                    onChange={(e) => setCodigoAcceso(e.target.value)}
                                    placeholder="Ingresa tu código de acceso"
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                                    required
                                />
                            </div>

                            <ZenButton
                                type="submit"
                                variant="primary"
                                loading={loading}
                                loadingText="Verificando..."
                                className="w-full"
                            >
                                Acceder al Portal
                            </ZenButton>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-zinc-500">
                                ¿No tienes código de acceso?{' '}
                                <span className="text-zinc-400">
                                    Contacta a tu fotógrafo
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function LoginClientePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-white">Cargando...</div>
            </div>
        }>
            <LoginClienteForm />
        </Suspense>
    )
}
