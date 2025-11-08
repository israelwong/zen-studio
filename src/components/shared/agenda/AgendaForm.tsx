'use client';

import React, { useState } from 'react';
import { CalendarIcon, MapPin, Clock, FileText, Link as LinkIcon } from 'lucide-react';
import { ZenInput, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { ZenCalendar, type ZenCalendarProps } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
    mode: 'single';
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
};

interface AgendaFormProps {
    studioSlug: string;
    initialData?: AgendaItem | null;
    contexto?: 'promise' | 'evento';
    promiseId?: string | null;
    eventoId?: string | null;
    onSubmit: (data: {
        date: Date;
        time?: string;
        address?: string;
        concept?: string;
        description?: string;
        google_maps_url?: string;
        agenda_tipo?: string;
    }) => Promise<void>;
    onCancel?: () => void;
    loading?: boolean;
}

export function AgendaForm({
    initialData,
    contexto,
    onSubmit,
    onCancel,
    loading = false,
}: AgendaFormProps) {
    const [date, setDate] = useState<Date | undefined>(
        initialData?.date ? new Date(initialData.date) : undefined
    );
    const [time, setTime] = useState(initialData?.time || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const [concept, setConcept] = useState(initialData?.concept || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [googleMapsUrl, setGoogleMapsUrl] = useState(initialData?.google_maps_url || '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [calendarOpen, setCalendarOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        const newErrors: Record<string, string> = {};
        if (!date) {
            newErrors.date = 'La fecha es requerida';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        try {
            await onSubmit({
                date: date!,
                time: time || undefined,
                address: address || undefined,
                concept: concept || undefined,
                description: description || undefined,
                google_maps_url: googleMapsUrl || undefined,
            });
        } catch (error) {
            console.error('Error submitting agenda form:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fecha */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Fecha *</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <ZenButton
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? formatDate(date) : 'Seleccionar fecha'}
                        </ZenButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                        <ZenCalendar
                            {...({
                                mode: 'single' as const,
                                selected: date,
                                onSelect: (selectedDate: Date | undefined) => {
                                    if (selectedDate) {
                                        setDate(selectedDate);
                                        setCalendarOpen(false);
                                    }
                                },
                                locale: es,
                            } as ZenCalendarSingleProps)}
                        />
                    </PopoverContent>
                </Popover>
                {errors.date && (
                    <p className="text-xs text-red-400">{errors.date}</p>
                )}
            </div>

            {/* Hora */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hora
                </label>
                <ZenInput
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="HH:MM"
                />
            </div>

            {/* Dirección */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección
                </label>
                <ZenInput
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Dirección del evento"
                />
            </div>

            {/* Concepto */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Concepto</label>
                <ZenInput
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ej: Sesión de fotos, Reunión, etc."
                />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descripción
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notas adicionales sobre el agendamiento"
                    className="w-full min-h-[80px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
            </div>

            {/* Google Maps URL */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Enlace de Google Maps
                </label>
                <ZenInput
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                />
            </div>

            {/* Información del contexto */}
            {contexto && (
                <ZenCard variant="outlined" className="bg-zinc-800/50">
                    <ZenCardContent className="p-3">
                        <p className="text-xs text-zinc-400">
                            {contexto === 'promise' && 'Agendamiento asociado a una promesa'}
                            {contexto === 'evento' && 'Agendamiento asociado a un evento'}
                        </p>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-2">
                <ZenButton
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1"
                >
                    Cancelar
                </ZenButton>
                <ZenButton
                    type="submit"
                    disabled={loading || !date}
                    loading={loading}
                    className="flex-1"
                >
                    {initialData ? 'Actualizar' : 'Crear'} Agendamiento
                </ZenButton>
            </div>
        </form>
    );
}

