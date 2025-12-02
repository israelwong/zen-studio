'use client';

import React, { useState, useEffect } from 'react';
import {
    ZenDialog,
    ZenButton,
    ZenInput,
} from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { crearGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RegistrarGastoRecurrenteModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
}

type Recurrencia = 'weekly' | 'biweekly' | 'monthly';

export function RegistrarGastoRecurrenteModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
}: RegistrarGastoRecurrenteModalProps) {
    const [concepto, setConcepto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [recurrencia, setRecurrencia] = useState<Recurrencia>('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setInitialLoading(true);
            setTimeout(() => {
                setInitialLoading(false);
            }, 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setConcepto('');
            setDescripcion('');
            setMonto('');
            setRecurrencia('monthly');
            setError(null);
            setInitialLoading(true);
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!concepto.trim()) {
            setError('El concepto es requerido');
            return;
        }

        if (descripcion.length > 100) {
            setError('La descripción no puede exceder 100 caracteres');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await crearGastoRecurrente(studioSlug, {
                name: concepto.trim(),
                description: descripcion.trim() || null,
                amount: parseFloat(monto),
                frequency: recurrencia,
                category: 'fijo',
                chargeDay: 1, // Por defecto día 1, se puede ajustar después
            });

            if (result.success) {
                toast.success('Gasto recurrente registrado correctamente');
                await onSuccess?.();
                onClose();
            } else {
                setError(result.error || 'Error al registrar gasto recurrente');
            }
        } catch (err) {
            setError('Error al registrar gasto recurrente');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Gasto Recurrente"
            description="Registra un gasto que se repite periódicamente"
            onSave={handleSave}
            saveLabel="Guardar"
            saveVariant="primary"
            isLoading={loading}
            onCancel={onClose}
            cancelLabel="Cancelar"
            maxWidth="sm"
        >
            {initialLoading ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20 bg-zinc-700" />
                        <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24 bg-zinc-700" />
                        <Skeleton className="h-20 w-full rounded-md bg-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16 bg-zinc-700" />
                        <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-zinc-700" />
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                            <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                            <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <ZenInput
                        label="Concepto"
                        value={concepto}
                        onChange={(e) => setConcepto(e.target.value)}
                        placeholder="Ej: Renta oficina, Suscripción Adobe..."
                        required
                        error={error && !concepto.trim() ? error : undefined}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Descripción <span className="text-zinc-500">(opcional, máx. 100 caracteres)</span>
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => {
                                if (e.target.value.length <= 100) {
                                    setDescripcion(e.target.value);
                                }
                            }}
                            placeholder="Descripción del gasto recurrente..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            rows={3}
                            maxLength={100}
                        />
                        <div className="flex justify-between items-center">
                            {error && descripcion.length > 100 && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}
                            <p className="text-xs text-zinc-500 ml-auto">
                                {descripcion.length}/100
                            </p>
                        </div>
                    </div>

                    <ZenInput
                        label="Monto"
                        type="number"
                        step="0.01"
                        min="0"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder="0.00"
                        required
                        error={error && (!monto || parseFloat(monto) <= 0) ? error : undefined}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 pb-2">
                            Recurrencia
                        </label>
                        <div className="space-y-2">
                            <label
                                htmlFor="recurrencia-weekly"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                    recurrencia === 'weekly'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="recurrencia-weekly"
                                    name="recurrencia"
                                    value="weekly"
                                    checked={recurrencia === 'weekly'}
                                    onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Calendar className={cn(
                                            'h-4 w-4 flex-shrink-0',
                                            recurrencia === 'weekly' ? 'text-emerald-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            recurrencia === 'weekly' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Semanal
                                        </span>
                                        {recurrencia === 'weekly' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </label>
                            <label
                                htmlFor="recurrencia-biweekly"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                    recurrencia === 'biweekly'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="recurrencia-biweekly"
                                    name="recurrencia"
                                    value="biweekly"
                                    checked={recurrencia === 'biweekly'}
                                    onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Calendar className={cn(
                                            'h-4 w-4 flex-shrink-0',
                                            recurrencia === 'biweekly' ? 'text-emerald-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            recurrencia === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Quincenal
                                        </span>
                                        {recurrencia === 'biweekly' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </label>
                            <label
                                htmlFor="recurrencia-monthly"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                    recurrencia === 'monthly'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="recurrencia-monthly"
                                    name="recurrencia"
                                    value="monthly"
                                    checked={recurrencia === 'monthly'}
                                    onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Calendar className={cn(
                                            'h-4 w-4 flex-shrink-0',
                                            recurrencia === 'monthly' ? 'text-emerald-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            recurrencia === 'monthly' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Mensual
                                        </span>
                                        {recurrencia === 'monthly' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {error && (concepto.trim() && monto && descripcion.length <= 100) && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}
                </div>
            )}
        </ZenDialog>
    );
}
