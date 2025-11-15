'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Badge } from '@/components/ui/shadcn/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import {
    Building2,
    Users,
    Calendar,
    DollarSign,
    Mail,
    Phone,
    MapPin,
    Globe,
    Edit,
    Trash2,
    Activity
} from 'lucide-react'

interface Studio {
    id: string
    name: string
    slug: string
    email: string
    phone?: string
    address?: string
    website?: string
    logoUrl?: string
    subscriptionStatus: string
    subscriptionStart?: string
    subscriptionEnd?: string
    commissionRate: number
    createdAt: string
    updatedAt: string
    plan: {
        name: string
        priceMonthly: number
    }
    _count: {
        userProfiles: number
        eventos: number
    }
}

interface StudioDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    onEdit: (studio: Studio) => void
    onDelete: (studioId: string) => void
    studioId: string | null
}

export function StudioDetailsModal({
    isOpen,
    onClose,
    onEdit,
    onDelete,
    studioId
}: StudioDetailsModalProps) {
    const [studio, setStudio] = useState<Studio | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && studioId) {
            fetchStudioDetails()
        }
    }, [isOpen, studioId])

    const fetchStudioDetails = async () => {
        if (!studioId) return

        setLoading(true)
        setError(null)
        const supabase = createClient()

        try {
            const { data, error } = await supabase
                .from('studios')
                .select(`
          *,
          plan:plans(name, priceMonthly),
          _count:user_profiles(count),
          _count:eventos(count)
        `)
                .eq('id', studioId)
                .single()

            if (error) throw error
            setStudio(data)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error al cargar los detalles del estudio'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800'
            case 'trial': return 'bg-blue-100 text-blue-800'
            case 'past_due': return 'bg-yellow-100 text-yellow-800'
            case 'canceled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Activo'
            case 'trial': return 'Prueba'
            case 'past_due': return 'Vencido'
            case 'canceled': return 'Cancelado'
            default: return status
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[800px]">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (error) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[800px]">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                        <p className="text-red-500">{error}</p>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (!studio) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {studio.name}
                    </DialogTitle>
                    <DialogDescription>
                        Detalles completos del estudio
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header con acciones */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            {studio.logoUrl && (
                                <img
                                    src={studio.logoUrl}
                                    alt={`Logo de ${studio.name}`}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                            )}
                            <div>
                                <h3 className="text-lg font-semibold">{studio.name}</h3>
                                <p className="text-sm text-muted-foreground">@{studio.slug}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(studio)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(studio.id)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                            </Button>
                        </div>
                    </div>

                    {/* Estado y plan */}
                    <div className="flex gap-4">
                        <Badge className={getStatusColor(studio.subscriptionStatus)}>
                            {getStatusText(studio.subscriptionStatus)}
                        </Badge>
                        <Badge variant="outline">
                            {studio.plan.name} - {formatCurrency(studio.plan.priceMonthly)}/mes
                        </Badge>
                    </div>

                    {/* Información principal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Información de Contacto</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{studio.email}</span>
                                </div>
                                {studio.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{studio.phone}</span>
                                    </div>
                                )}
                                {studio.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{studio.address}</span>
                                    </div>
                                )}
                                {studio.website && (
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <a
                                            href={studio.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            {studio.website}
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Estadísticas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{studio._count.userProfiles} usuarios</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{studio._count.eventos} eventos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{studio.commissionRate * 100}% comisión</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Registrado: {formatDate(studio.createdAt)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Información de suscripción */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Información de Suscripción</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Plan</p>
                                    <p className="font-medium">{studio.plan.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Precio Mensual</p>
                                    <p className="font-medium">{formatCurrency(studio.plan.priceMonthly)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <Badge className={getStatusColor(studio.subscriptionStatus)}>
                                        {getStatusText(studio.subscriptionStatus)}
                                    </Badge>
                                </div>
                                {studio.subscriptionStart && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Inicio de Suscripción</p>
                                        <p className="font-medium">{formatDate(studio.subscriptionStart)}</p>
                                    </div>
                                )}
                                {studio.subscriptionEnd && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fin de Suscripción</p>
                                        <p className="font-medium">{formatDate(studio.subscriptionEnd)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-muted-foreground">Última Actualización</p>
                                    <p className="font-medium">{formatDate(studio.updatedAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
