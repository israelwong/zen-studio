'use client';

import React, { useState, useEffect } from 'react';
import { ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch } from '@/components/ui/zen';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { crearTelefono, actualizarTelefono } from '@/lib/actions/studio/profile/telefonos';

interface TelefonosSectionSimpleProps {
    telefonos?: Array<{
        id: string;
        numero: string;
        tipo: 'llamadas' | 'whatsapp' | 'ambos';
        is_active: boolean;
    }>;
    studioSlug: string;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function TelefonosSectionSimple({ telefonos: initialTelefonos = [], studioSlug, loading = false, onDataChange }: TelefonosSectionSimpleProps) {
    const [telefono, setTelefono] = useState('');
    const [llamadasEnabled, setLlamadasEnabled] = useState(false);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Obtener el primer teléfono activo o el primero disponible
    const telefonoActual = initialTelefonos.find(t => t.is_active) || initialTelefonos[0];

    useEffect(() => {
        if (telefonoActual) {
            setTelefono(telefonoActual.numero);
            setLlamadasEnabled(telefonoActual.tipo === 'llamadas' || telefonoActual.tipo === 'ambos');
            setWhatsappEnabled(telefonoActual.tipo === 'whatsapp' || telefonoActual.tipo === 'ambos');
        } else {
            setTelefono('');
            setLlamadasEnabled(false);
            setWhatsappEnabled(false);
        }
    }, [telefonoActual]);

    const handleSave = async () => {
        if (!telefono.trim()) {
            toast.error('Ingresa un número de teléfono');
            return;
        }

        if (!llamadasEnabled && !whatsappEnabled) {
            toast.error('Activa al menos una opción (Llamadas o WhatsApp)');
            return;
        }

        setIsSaving(true);

        try {
            const tipo = llamadasEnabled && whatsappEnabled ? 'AMBOS' :
                llamadasEnabled ? 'LLAMADAS' : 'WHATSAPP';

            if (telefonoActual) {
                // Actualizar teléfono existente
                await actualizarTelefono(studioSlug, telefonoActual.id, {
                    numero: telefono.trim(),
                    tipo,
                    etiqueta: null,
                    is_active: true
                });
                toast.success('Teléfono actualizado');
            } else {
                // Crear nuevo teléfono
                await crearTelefono(studioSlug, {
                    numero: telefono.trim(),
                    tipo,
                    etiqueta: null,
                    is_active: true
                });
                toast.success('Teléfono guardado');
            }

            await onDataChange?.();
        } catch (error) {
            console.error('Error saving telefono:', error);
            toast.error('Error al guardar teléfono');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-400" />
                        <ZenCardTitle>Teléfono</ZenCardTitle>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="space-y-4 animate-pulse">
                        <div className="h-10 bg-zinc-800/50 rounded-lg"></div>
                        <div className="h-6 bg-zinc-800/50 rounded-lg w-1/2"></div>
                        <div className="h-6 bg-zinc-800/50 rounded-lg w-1/2"></div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        );
    }

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-400" />
                    <ZenCardTitle>Teléfono</ZenCardTitle>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6 space-y-4">
                <ZenInput
                    label="Número de teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    type="tel"
                />

                <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-zinc-300">Llamadas</span>
                    <ZenSwitch
                        checked={llamadasEnabled}
                        onCheckedChange={setLlamadasEnabled}
                    />
                </div>

                <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-zinc-300">WhatsApp</span>
                    <ZenSwitch
                        checked={whatsappEnabled}
                        onCheckedChange={setWhatsappEnabled}
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || !telefono.trim() || (!llamadasEnabled && !whatsappEnabled)}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </ZenCardContent>
        </ZenCard>
    );
}
