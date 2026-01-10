'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen/base/ZenCalendar';
import { ConversionMetrics } from '../../components';
import { getConversionMetrics } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import type { DateRange } from 'react-day-picker';

interface ConversionMetricsClientProps {
    studioId: string;
    initialData: Awaited<ReturnType<typeof getConversionMetrics>>['data'];
}

export function ConversionMetricsClient({ studioId, initialData }: ConversionMetricsClientProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        // Por defecto: mes actual
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { from: start, to: end };
    });
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(initialData);

    // Cargar datos cuando cambia el rango
    useEffect(() => {
        if (!dateRange?.from || !dateRange?.to) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const result = await getConversionMetrics(studioId, {
                    eventDateFrom: dateRange.from!,
                    eventDateTo: dateRange.to!,
                });
                if (result.success && result.data) {
                    setData(result.data);
                }
            } catch (error) {
                console.error('Error cargando métricas:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dateRange, studioId]);

    // Actualizar rango cuando cambia el mes seleccionado
    useEffect(() => {
        if (calendarOpen && currentMonth) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            setTempRange({ from: start, to: end });
        }
    }, [currentMonth, calendarOpen]);

    const handleApplyRange = () => {
        if (tempRange?.from && tempRange?.to) {
            setDateRange(tempRange);
            setCalendarOpen(false);
        }
    };

    const formatDateRange = () => {
        if (!dateRange?.from) return 'Seleccionar mes';
        if (!dateRange.to) return format(dateRange.from, 'MMMM yyyy', { locale: es });
        return format(dateRange.from, 'MMMM yyyy', { locale: es });
    };

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtro de fecha */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <ZenButton variant="ghost" size="sm" className="gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDateRange()}
                            </ZenButton>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                            <div className="p-3">
                                <ZenCalendar
                                    mode="range"
                                    defaultMonth={tempRange?.from || dateRange?.from}
                                    selected={tempRange}
                                    onSelect={setTempRange}
                                    onMonthChange={setCurrentMonth}
                                    numberOfMonths={2}
                                    locale={es}
                                />
                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-3">
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setTempRange(dateRange);
                                            setCalendarOpen(false);
                                        }}
                                    >
                                        Cancelar
                                    </ZenButton>
                                    <ZenButton
                                        variant="default"
                                        size="sm"
                                        onClick={handleApplyRange}
                                        disabled={!tempRange?.from || !tempRange?.to}
                                    >
                                        Aplicar
                                    </ZenButton>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Métricas */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Cargando métricas...</p>
                </div>
            ) : (
                <ConversionMetrics data={data} />
            )}
        </div>
    );
}
