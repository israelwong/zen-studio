'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenDialog, ZenInput, ZenTextarea, ZenSelect, ZenSwitch, ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen';
import { obtenerCrewMembers, crearGanttTask, actualizarGanttTask, obtenerGanttTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

interface CrewMember {
    id: string;
    name: string;
    tipo: string;
}

interface GanttTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    eventId: string;
    itemId: string;
    dayDate: Date | null;
    dateRange?: DateRange;
    taskId?: string | null; // Si existe, es edición
    onSuccess: () => void;
}

export function GanttTaskModal({
    isOpen,
    onClose,
    studioSlug,
    eventId,
    itemId,
    dayDate,
    dateRange,
    taskId,
    onSuccess,
}: GanttTaskModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isRange, setIsRange] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [assignedMemberId, setAssignedMemberId] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    // Cargar crew members
    useEffect(() => {
        if (isOpen && crewMembers.length === 0) {
            const loadMembers = async () => {
                try {
                    setLoadingMembers(true);
                    const result = await obtenerCrewMembers(studioSlug);
                    if (result.success && result.data) {
                        setCrewMembers(result.data);
                    }
                } catch (error) {
                    console.error('Error loading crew members:', error);
                } finally {
                    setLoadingMembers(false);
                }
            };
            loadMembers();
        }
    }, [isOpen, studioSlug, crewMembers.length]);

    // Cargar datos de tarea existente si se está editando
    useEffect(() => {
        if (isOpen && taskId) {
            const loadTask = async () => {
                try {
                    setLoading(true);
                    const result = await obtenerGanttTask(studioSlug, eventId, taskId);
                    if (result.success && result.data) {
                        const task = result.data as {
                            name: string;
                            description: string | null;
                            start_date: Date;
                            end_date: Date;
                            status: string;
                            notes: string | null;
                        };
                        setName(task.name);
                        setDescription(task.description || '');
                        setStartDate(new Date(task.start_date));
                        setEndDate(new Date(task.end_date));
                        setIsRange(task.start_date.toDateString() !== task.end_date.toDateString());
                        setIsCompleted(task.status === 'COMPLETED');
                        // TODO: Cargar notas si están en un campo separado
                    }
                } catch (error) {
                    console.error('Error loading task:', error);
                    toast.error('Error al cargar la tarea');
                } finally {
                    setLoading(false);
                }
            };
            loadTask();
        } else if (isOpen && dayDate) {
            // Inicializar fechas cuando se crea nueva tarea
            setStartDate(dayDate);
            setEndDate(dayDate);
            setIsRange(false);
            setName('');
            setDescription('');
            setIsCompleted(false);
        }
    }, [isOpen, taskId, dayDate, studioSlug, eventId]);

    // Calcular duración en días
    const durationDays = startDate && endDate 
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('El nombre de la tarea es requerido');
            return;
        }

        if (!startDate) {
            toast.error('La fecha de inicio es requerida');
            return;
        }

        if (isRange && !endDate) {
            toast.error('La fecha de fin es requerida para un rango');
            return;
        }

        if (isRange && startDate && endDate && startDate > endDate) {
            toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        // Validar que las fechas estén dentro del rango del proyecto
        if (dateRange?.from && dateRange?.to) {
            if (startDate < dateRange.from) {
                toast.error('La fecha de inicio está fuera del rango del proyecto');
                return;
            }
            const finalEndDate = isRange && endDate ? endDate : startDate;
            if (finalEndDate > dateRange.to) {
                toast.error('La fecha de fin está fuera del rango del proyecto');
                return;
            }
        }

        setLoading(true);
        try {
            const finalEndDate = isRange && endDate ? endDate : startDate;
            if (!finalEndDate) {
                toast.error('Error en las fechas');
                setLoading(false);
                return;
            }

            if (taskId) {
                // Actualizar tarea existente
                const result = await actualizarGanttTask(studioSlug, eventId, taskId, {
                    name,
                    description: description || undefined,
                    startDate: startDate || undefined,
                    endDate: finalEndDate,
                    notes: description || undefined,
                    isCompleted,
                });

                if (result.success) {
                    toast.success('Tarea actualizada correctamente');
                    onSuccess();
                    handleClose();
                } else {
                    toast.error(result.error || 'Error al actualizar la tarea');
                }
            } else {
                // Crear nueva tarea
                const result = await crearGanttTask(studioSlug, eventId, {
                    itemId,
                    name,
                    description: description || undefined,
                    startDate: startDate!,
                    endDate: finalEndDate,
                    notes: description || undefined,
                    isCompleted,
                });

                if (result.success) {
                    toast.success('Tarea creada correctamente');
                    onSuccess();
                    handleClose();
                } else {
                    toast.error(result.error || 'Error al crear la tarea');
                }
            }
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error('Error al guardar la tarea');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setIsRange(false);
        setStartDate(null);
        setEndDate(null);
        setAssignedMemberId(null);
        setIsCompleted(false);
        onClose();
    };

    const crewMemberOptions = crewMembers.map(member => ({
        value: member.id,
        label: `${member.name} (${member.tipo})`,
    }));

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={handleClose}
            title={taskId ? 'Editar Tarea' : 'Nueva Tarea'}
            description={dayDate ? format(dayDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : undefined}
            maxWidth="lg"
            showCloseButton={true}
            closeOnClickOutside={false}
            onSave={handleSubmit}
            onCancel={handleClose}
            saveLabel="Guardar"
            cancelLabel="Cancelar"
            isLoading={loading}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <ZenInput
                    label="Nombre de la tarea"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Sesión previa de fotos"
                    required
                />

                {/* Descripción */}
                <ZenTextarea
                    label="Descripción / Notas"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Información adicional sobre la tarea..."
                    rows={3}
                />

                {/* Tipo de rango */}
                <div className="flex items-center gap-4">
                    <ZenSwitch
                        checked={!isRange}
                        onCheckedChange={(checked) => setIsRange(!checked)}
                        label="Una fecha"
                    />
                    <ZenSwitch
                        checked={isRange}
                        onCheckedChange={setIsRange}
                        label="Rango de fechas"
                    />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Fecha inicio */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            Fecha {isRange ? 'inicio' : ''}
                        </label>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                                <ZenButton
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {startDate ? (
                                        format(startDate, 'PPP', { locale: es })
                                    ) : (
                                        <span className="text-zinc-500">Seleccionar fecha</span>
                                    )}
                                </ZenButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                <ZenCalendar
                                    mode="single"
                                    selected={startDate || undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            setStartDate(date);
                                            if (!isRange) {
                                                setEndDate(date);
                                            }
                                            setStartDateOpen(false);
                                        }
                                    }}
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Fecha fin (solo si es rango) */}
                    {isRange && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">
                                Fecha fin
                            </label>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <ZenButton
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {endDate ? (
                                            format(endDate, 'PPP', { locale: es })
                                        ) : (
                                            <span className="text-zinc-500">Seleccionar fecha</span>
                                        )}
                                    </ZenButton>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                    <ZenCalendar
                                        mode="single"
                                        selected={endDate || undefined}
                                        onSelect={(date) => {
                                            if (date) {
                                                setEndDate(date);
                                                setEndDateOpen(false);
                                            }
                                        }}
                                        locale={es}
                                        disabled={(date) => startDate ? date < startDate : false}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                {/* Duración calculada */}
                {durationDays > 0 && (
                    <div className="text-sm text-zinc-400">
                        Duración: <span className="text-zinc-300 font-medium">{durationDays} día{durationDays !== 1 ? 's' : ''}</span>
                    </div>
                )}

                {/* Asignado a */}
                <ZenSelect
                    label="Asignado a"
                    value={assignedMemberId || ''}
                    onChange={(value) => setAssignedMemberId(value || null)}
                    options={crewMemberOptions}
                    placeholder="Seleccionar personal (opcional)"
                    loading={loadingMembers}
                />

                {/* Completada */}
                <ZenSwitch
                    checked={isCompleted}
                    onCheckedChange={setIsCompleted}
                    label="Tarea completada"
                />
            </form>
        </ZenDialog>
    );
}

