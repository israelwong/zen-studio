'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/shadcn/select'
import { Loader2, Building2 } from 'lucide-react'

interface Studio {
    id?: string
    name: string
    slug: string
    email: string
    phone?: string
    address?: string
    website?: string
    logoUrl?: string
    planId: string
    subscriptionStatus: string
    commissionRate: number
}

interface Plan {
    id: string
    name: string
    slug: string
    priceMonthly: number
}

interface StudioModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    studio?: Studio | null
}

export function StudioModal({ isOpen, onClose, onSuccess, studio }: StudioModalProps) {
    const [formData, setFormData] = useState<Studio>({
        name: '',
        slug: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        logoUrl: '',
        planId: '',
        subscriptionStatus: 'trial',
        commissionRate: 0.30
    })
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchPlans()
            if (studio) {
                setFormData(studio)
            } else {
                resetForm()
            }
        }
    }, [isOpen, studio])

    const fetchPlans = async () => {
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('id, name, slug, priceMonthly')
                .eq('active', true)
                .order('orden')

            if (error) throw error
            setPlans(data || [])
        } catch (error) {
            console.error('Error fetching plans:', error)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            email: '',
            phone: '',
            address: '',
            website: '',
            logoUrl: '',
            planId: '',
            subscriptionStatus: 'trial',
            commissionRate: 0.30
        })
        setError(null)
    }

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
    }

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: prev.slug || generateSlug(name)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            if (studio?.id) {
                // Actualizar estudio existente
                const { error } = await supabase
                    .from('studios')
                    .update({
                        name: formData.name,
                        slug: formData.slug,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        website: formData.website,
                        logoUrl: formData.logoUrl,
                        planId: formData.planId,
                        subscriptionStatus: formData.subscriptionStatus,
                        commissionRate: formData.commissionRate,
                        updatedAt: new Date().toISOString()
                    })
                    .eq('id', studio.id)

                if (error) throw error
            } else {
                // Crear nuevo estudio
                const { error } = await supabase
                    .from('studios')
                    .insert({
                        name: formData.name,
                        slug: formData.slug,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        website: formData.website,
                        logoUrl: formData.logoUrl,
                        planId: formData.planId,
                        subscriptionStatus: formData.subscriptionStatus,
                        commissionRate: formData.commissionRate
                    })

                if (error) throw error
            }

            onSuccess()
            onClose()
            resetForm()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {studio ? 'Editar Estudio' : 'Nuevo Estudio'}
                    </DialogTitle>
                    <DialogDescription>
                        {studio
                            ? 'Modifica la información del estudio'
                            : 'Crea un nuevo estudio en la plataforma'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Estudio *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Ej: Fotografía María"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug *</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                placeholder="fotografia-maria"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="maria@fotografia.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+52 55 1234 5678"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                            id="address"
                            value={formData.address || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Calle 123, Colonia, Ciudad"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="website">Sitio Web</Label>
                            <Input
                                id="website"
                                value={formData.website || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                placeholder="https://fotografia-maria.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="logoUrl">URL del Logo</Label>
                            <Input
                                id="logoUrl"
                                value={formData.logoUrl || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                                placeholder="https://ejemplo.com/logo.png"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="planId">Plan *</Label>
                            <Select
                                value={formData.planId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                            {plan.name} - ${plan.priceMonthly}/mes
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subscriptionStatus">Estado de Suscripción</Label>
                            <Select
                                value={formData.subscriptionStatus}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionStatus: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="trial">Prueba</SelectItem>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="past_due">Vencido</SelectItem>
                                    <SelectItem value="canceled">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="commissionRate">Tasa de Comisión (%)</Label>
                        <Input
                            id="commissionRate"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={formData.commissionRate}
                            onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) }))}
                            placeholder="0.30"
                        />
                        <p className="text-sm text-muted-foreground">
                            Porcentaje de comisión para ProSocial (0.30 = 30%)
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {studio ? 'Actualizar' : 'Crear'} Estudio
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
