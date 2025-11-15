'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Textarea } from '@/components/ui/shadcn/textarea'
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
import { Loader2, Users, Target } from 'lucide-react'

interface Lead {
    id?: string
    nombre: string
    email: string
    telefono: string
    nombreEstudio?: string
    slugEstudio?: string
    etapa: string
    puntaje: number
    prioridad: string
    planInteres?: string
    presupuestoMensual?: number
    notasConversacion?: string
    agentId?: string
    fuente?: string
}

interface Agent {
    id: string
    nombre: string
    email: string
}

interface LeadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    lead?: Lead | null
}

export function LeadModal({ isOpen, onClose, onSuccess, lead }: LeadModalProps) {
    const [formData, setFormData] = useState<Lead>({
        nombre: '',
        email: '',
        telefono: '',
        nombreEstudio: '',
        slugEstudio: '',
        etapaId: '',
        puntaje: 5,
        prioridad: 'media',
        planInteres: '',
        presupuestoMensual: 0,
        notasConversacion: '',
        agentId: '',
        fuente: ''
    })
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchAgents()
            if (lead) {
                setFormData(lead)
            } else {
                resetForm()
            }
        }
    }, [isOpen, lead])

    const fetchAgents = async () => {
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('prosocial_agents')
                .select('id, nombre, email')
                .eq('activo', true)
                .order('nombre')

            if (error) throw error
            setAgents(data || [])
        } catch (error) {
            console.error('Error fetching agents:', error)
        }
    }

    const resetForm = () => {
        setFormData({
            nombre: '',
            email: '',
            telefono: '',
            nombreEstudio: '',
            slugEstudio: '',
            etapaId: '',
            puntaje: 5,
            prioridad: 'media',
            planInteres: '',
            presupuestoMensual: 0,
            notasConversacion: '',
            agentId: '',
            fuente: ''
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

    const handleNombreEstudioChange = (nombreEstudio: string) => {
        setFormData(prev => ({
            ...prev,
            nombreEstudio,
            slugEstudio: prev.slugEstudio || generateSlug(nombreEstudio)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        try {
            if (lead?.id) {
                // Actualizar lead existente
                const { error } = await supabase
                    .from('prosocial_leads')
                    .update({
                        nombre: formData.nombre,
                        email: formData.email,
                        telefono: formData.telefono,
                        nombreEstudio: formData.nombreEstudio,
                        slugEstudio: formData.slugEstudio,
                        etapa: formData.etapa,
                        puntaje: formData.puntaje,
                        prioridad: formData.prioridad,
                        planInteres: formData.planInteres,
                        presupuestoMensual: formData.presupuestoMensual,
                        notasConversacion: formData.notasConversacion,
                        agentId: formData.agentId || null,
                        fuente: formData.fuente
                    })
                    .eq('id', lead.id)

                if (error) throw error
            } else {
                // Crear nuevo lead
                const { error } = await supabase
                    .from('prosocial_leads')
                    .insert({
                        nombre: formData.nombre,
                        email: formData.email,
                        telefono: formData.telefono,
                        nombreEstudio: formData.nombreEstudio,
                        slugEstudio: formData.slugEstudio,
                        etapa: formData.etapa,
                        puntaje: formData.puntaje,
                        prioridad: formData.prioridad,
                        planInteres: formData.planInteres,
                        presupuestoMensual: formData.presupuestoMensual,
                        notasConversacion: formData.notasConversacion,
                        agentId: formData.agentId || null,
                        fuente: formData.fuente
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {lead ? 'Editar Lead' : 'Nuevo Lead'}
                    </DialogTitle>
                    <DialogDescription>
                        {lead
                            ? 'Modifica la información del lead'
                            : 'Crea un nuevo lead en el sistema'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Información básica */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Información Básica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Completo *</Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Ej: María González"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="maria@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="telefono">Teléfono *</Label>
                                <Input
                                    id="telefono"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                                    placeholder="+52 55 1234 5678"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fuente">Fuente</Label>
                                <Select
                                    value={formData.fuente || ''}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, fuente: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la fuente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="web">Sitio Web</SelectItem>
                                        <SelectItem value="referido">Referido</SelectItem>
                                        <SelectItem value="evento">Evento</SelectItem>
                                        <SelectItem value="publicidad">Publicidad</SelectItem>
                                        <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Información del estudio */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Información del Estudio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombreEstudio">Nombre del Estudio</Label>
                                <Input
                                    id="nombreEstudio"
                                    value={formData.nombreEstudio || ''}
                                    onChange={(e) => handleNombreEstudioChange(e.target.value)}
                                    placeholder="Ej: Fotografía María"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slugEstudio">Slug del Estudio</Label>
                                <Input
                                    id="slugEstudio"
                                    value={formData.slugEstudio || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slugEstudio: e.target.value }))}
                                    placeholder="fotografia-maria"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="planInteres">Plan de Interés</Label>
                                <Select
                                    value={formData.planInteres || ''}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, planInteres: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basico">Básico</SelectItem>
                                        <SelectItem value="negocio">Negocio</SelectItem>
                                        <SelectItem value="agencia">Agencia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="presupuestoMensual">Presupuesto Mensual</Label>
                                <Input
                                    id="presupuestoMensual"
                                    type="number"
                                    min="0"
                                    value={formData.presupuestoMensual || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, presupuestoMensual: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gestión del lead */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Gestión del Lead</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="etapa">Etapa *</Label>
                                <Select
                                    value={formData.etapa}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, etapa: value }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="nuevo">Nuevo</SelectItem>
                                        <SelectItem value="seguimiento">Seguimiento</SelectItem>
                                        <SelectItem value="promesa">Promesa</SelectItem>
                                        <SelectItem value="suscrito">Suscrito</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                        <SelectItem value="perdido">Perdido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prioridad">Prioridad</Label>
                                <Select
                                    value={formData.prioridad}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, prioridad: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alta">Alta</SelectItem>
                                        <SelectItem value="media">Media</SelectItem>
                                        <SelectItem value="baja">Baja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="puntaje">Puntaje (1-10)</Label>
                                <Input
                                    id="puntaje"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.puntaje}
                                    onChange={(e) => setFormData(prev => ({ ...prev, puntaje: parseInt(e.target.value) || 5 }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="agentId">Agente Asignado</Label>
                            <Select
                                value={formData.agentId || ''}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un agente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            {agent.nombre} ({agent.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                        <Label htmlFor="notasConversacion">Notas de Conversación</Label>
                        <Textarea
                            id="notasConversacion"
                            value={formData.notasConversacion || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, notasConversacion: e.target.value }))}
                            placeholder="Registra las notas de la conversación con el lead..."
                            rows={4}
                        />
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
                            {lead ? 'Actualizar' : 'Crear'} Lead
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
