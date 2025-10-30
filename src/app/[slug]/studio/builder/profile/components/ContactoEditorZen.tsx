'use client';

import React, { useState } from 'react';
import { ContactoData } from '../types';
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Save, Check } from 'lucide-react';
import { ZonasTrabajoSection } from './ZonasTrabajoSection';
import { TelefonosSection } from './TelefonosSection';
import { HorariosSection } from './HorariosSection';
import { actualizarContacto } from '@/lib/actions/studio/builder/contacto';
import { toast } from 'sonner';

interface ContactoEditorZenProps {
    data: ContactoData;
    onLocalUpdate: (data: Partial<ContactoData>) => void;
    studioSlug: string;
    loading?: boolean;
}

export function ContactoEditorZen({
    data,
    onLocalUpdate,
    studioSlug,
    loading = false
}: ContactoEditorZenProps) {
    const [updatingInfo, setUpdatingInfo] = useState(false);
    const [activeTab, setActiveTab] = useState('info');

    const tabs = [
        { id: 'info', label: 'Información' },
        { id: 'telefonos', label: 'Teléfonos' },
        { id: 'horarios', label: 'Horarios' },
        { id: 'zonas', label: 'Zonas de Trabajo' }
    ];

    const handleUpdateInfo = async () => {
        if (updatingInfo) return;

        setUpdatingInfo(true);
        try {
            await actualizarContacto(studioSlug, {
                descripcion: data.descripcion,
                direccion: data.direccion,
                google_maps_url: data.google_maps_url
            });
            toast.success('Información actualizada exitosamente');
        } catch (error) {
            console.error('Error updating contacto:', error);
            toast.error('Error al actualizar información');
        } finally {
            setUpdatingInfo(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="border-b border-zinc-800">
                <div className="flex space-x-8">
                    {tabs.map((tab) => {
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'info' && (
                    <ZenCard variant="default" padding="none">
                        <ZenCardHeader className="border-b border-zinc-800">
                            <ZenCardTitle>Información de Contacto</ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent className="p-6 space-y-4">
                            <ZenTextarea
                                label="Descripción del Estudio"
                                value={data.descripcion || ''}
                                onChange={(e) => onLocalUpdate({ descripcion: e.target.value })}
                                placeholder="Describe tu estudio, servicios y especialidades..."
                                rows={4}
                                disabled={loading}
                                hint="Esta descripción aparecerá en tu perfil público"
                            />

                            <ZenTextarea
                                label="Dirección"
                                value={data.direccion || ''}
                                onChange={(e) => onLocalUpdate({ direccion: e.target.value })}
                                placeholder="Dirección completa de tu estudio"
                                rows={4}
                                disabled={loading}
                                hint="Dirección física de tu estudio"
                            />

                            <ZenInput
                                label="Enlace de Google Maps (Opcional)"
                                value={data.google_maps_url || ''}
                                onChange={(e) => onLocalUpdate({ google_maps_url: e.target.value })}
                                placeholder="https://maps.google.com/..."
                                disabled={loading}
                                hint="Enlace directo a tu ubicación en Google Maps"
                            />

                            {/* Botón de Guardar */}
                            <div className="pt-4">
                                <div className="flex justify-end">
                                    <ZenButton
                                        onClick={handleUpdateInfo}
                                        disabled={loading || updatingInfo}
                                        loading={updatingInfo}
                                        loadingText="Actualizando..."
                                        variant="primary"
                                        size="sm"
                                    >
                                        {updatingInfo ? (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Actualizando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Actualizar Información
                                            </>
                                        )}
                                    </ZenButton>
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                )}

                {activeTab === 'telefonos' && (
                    <TelefonosSection
                        telefonos={data.telefonos || []}
                        onLocalUpdate={onLocalUpdate}
                        studioSlug={studioSlug}
                    />
                )}

                {activeTab === 'horarios' && (
                    <HorariosSection
                        studioSlug={studioSlug}
                        horarios={data.horarios}
                        onLocalUpdate={onLocalUpdate}
                    />
                )}

                {activeTab === 'zonas' && (
                    <ZonasTrabajoSection
                        studioId={data.studio_id}
                        zonas={data.zonas_trabajo}
                        onLocalUpdate={onLocalUpdate}
                    />
                )}
            </div>
        </div>
    );
}