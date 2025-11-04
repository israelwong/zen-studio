'use client';

import React from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Save, Check } from 'lucide-react';
import { IdentidadData } from '../types';
import { LogoManagerZen } from './LogoManagerZen';

interface HeaderSectionProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
    onSave: () => Promise<void>;
    isSaving: boolean;
    saveSuccess: boolean;
}

export function HeaderSection({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false,
    onSave,
    isSaving,
    saveSuccess
}: HeaderSectionProps) {
    const handleInputChange = (field: keyof IdentidadData, value: string) => {
        console.log('🔄 handleInputChange:', field, value);
        onLocalUpdate({ [field]: value });
    };

    if (loading) {
        return (
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6 space-y-4">
                    <div className="animate-pulse">
                        <div className="h-32 bg-zinc-700 rounded-lg mb-4"></div>
                        <div className="h-12 bg-zinc-700 rounded-lg mb-4"></div>
                        <div className="h-20 bg-zinc-700 rounded-lg"></div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        );
    }

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardContent className="p-6 space-y-6">
                {/* Sección 1: Logo + Nombre y Slogan en 2 columnas */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Columna 1: Logo - Izquierda */}
                    <div className="flex justify-center lg:justify-start flex-shrink-0 w-full lg:w-auto">
                        <div className="flex flex-col items-center gap-3">
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    Logo Principal
                                </h3>
                            </div>
                            <LogoManagerZen
                                tipo="logo"
                                url={data.logo_url}
                                onUpdate={async (url: string) => {
                                    await onLogoUpdate(url);
                                }}
                                onLocalUpdate={(url: string | null) => {
                                    onLogoLocalUpdate(url);
                                }}
                                studioSlug={studioSlug}
                            />
                            <p className="text-xs text-zinc-400 text-center max-w-[200px]">
                                PNG, SVG, JPG (máximo 5MB)
                            </p>
                        </div>
                    </div>

                    {/* Columna 2: Información del Studio - Derecha */}
                    <div className="flex-1 w-full space-y-4">
                        {/* Nombre del estudio */}
                        <ZenInput
                            label="Nombre del Estudio"
                            required
                            value={data.studio_name || ''}
                            onChange={(e) => handleInputChange('studio_name', e.target.value)}
                            placeholder="Ej: Studio Fotografía María"
                            disabled={loading}
                            hint="Este nombre aparecerá en tu perfil público"
                        />

                        {/* Slogan */}
                        <ZenTextarea
                            label="Slogan"
                            value={data.slogan || ''}
                            onChange={(e) => handleInputChange('slogan', e.target.value)}
                            placeholder="Ej: Capturando momentos únicos"
                            disabled={loading}
                            maxLength={100}
                            hint="Frase corta que describe tu estudio (máximo 100 caracteres)"
                            rows={2}
                        />
                    </div>
                </div>

                {/* Botón de Guardar - Centrado abajo */}
                <div className="flex justify-end pt-4 border-t border-zinc-800">
                    <ZenButton
                        onClick={onSave}
                        disabled={loading || isSaving}
                        loading={isSaving}
                        loadingText="Guardando..."
                        variant="primary"
                        size="sm"
                    >
                        {saveSuccess ? (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Guardado
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </ZenButton>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}
