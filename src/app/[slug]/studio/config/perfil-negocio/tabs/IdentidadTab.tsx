'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Save, Check } from 'lucide-react';
import { AvatarManager } from '@/components/shared/avatar';
import { actualizarLogo, actualizarIdentidadCompleta } from '@/lib/actions/studio/profile/identidad';
import { useLogoRefresh } from '@/hooks/useLogoRefresh';
import { toast } from 'sonner';
import { BuilderProfileData } from '@/types/builder-profile';

interface IdentidadTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (updater: (prev: BuilderProfileData | null) => BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function IdentidadTab({ builderData, loading, studioSlug, onUpdate, onDataChange }: IdentidadTabProps) {
    const { triggerRefresh } = useLogoRefresh();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [studioName, setStudioName] = useState('');
    const [slogan, setSlogan] = useState('');

    useEffect(() => {
        if (builderData?.studio) {
            setStudioName(builderData.studio.studio_name || '');
            setSlogan(builderData.studio.slogan || '');
        }
    }, [builderData]);

    const handleLocalUpdate = useCallback((field: 'studio_name' | 'slogan', value: string) => {
        onUpdate((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            return {
                ...prev,
                studio: { ...prev.studio, [field]: value }
            };
        });
    }, [onUpdate]);

    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await actualizarIdentidadCompleta(studioSlug, {
                nombre: studioName || '',
                slogan: slogan || undefined,
            });

            setSaveSuccess(true);
            toast.success('Identidad guardada correctamente');
            await onDataChange?.();

            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving identidad:', error);
            toast.error('Error al guardar la identidad. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-32 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
                <div className="flex flex-col items-center gap-3">
                    <AvatarManager
                        url={builderData?.studio?.logo_url || null}
                        onUpdate={async (url: string) => {
                            try {
                                await actualizarLogo(studioSlug, { tipo: 'logo', url });
                                await actualizarIdentidadCompleta(studioSlug, {
                                    nombre: studioName || '',
                                    slogan: slogan || undefined,
                                    logo_url: url,
                                });
                                await onDataChange?.();
                                triggerRefresh();
                            } catch (error) {
                                console.error('Error updating logo:', error);
                            }
                        }}
                        onLocalUpdate={(url: string | null) => {
                            onUpdate((prev: BuilderProfileData | null) => {
                                if (!prev) return null;
                                return {
                                    ...prev,
                                    studio: { ...prev.studio, logo_url: url }
                                };
                            });
                        }}
                        studioSlug={studioSlug}
                        category="identidad"
                        subcategory="logos"
                        size="md"
                        variant="default"
                        loading={loading}
                        cropTitle="Ajustar logo del estudio"
                        cropDescription="Arrastra y redimensiona el área circular para ajustar tu logo."
                        cropInstructions={[
                            "• Arrastra para mover el área de recorte",
                            "• Usa las esquinas para redimensionar",
                            "• El área circular será tu logo del estudio"
                        ]}
                        successMessage="Logo actualizado exitosamente"
                        deleteMessage="Logo eliminado"
                        showAdjustButton={true}
                    />
                    <p className="text-xs text-zinc-400 text-center">
                        PNG, JPG, SVG hasta 10MB
                    </p>
                </div>
            </div>

            {/* Campos */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6">
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <ZenInput
                            label="Nombre del Estudio"
                            required
                            value={studioName}
                            onChange={(e) => {
                                const value = e.target.value;
                                setStudioName(value);
                                handleLocalUpdate('studio_name', value);
                            }}
                            placeholder="Ej: Studio Fotografía María"
                            disabled={loading}
                            hint="Este nombre aparecerá en tu perfil público"
                        />

                        <ZenTextarea
                            label="Slogan"
                            value={slogan}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSlogan(value);
                                handleLocalUpdate('slogan', value);
                            }}
                            placeholder="Ej: Capturando momentos únicos"
                            disabled={loading}
                            maxLength={100}
                            rows={3}
                            hint="Frase corta que describe tu estudio (máximo 100 caracteres)"
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Botón de Guardar */}
            <div className="flex justify-end pt-2">
                <ZenButton
                    onClick={handleSave}
                    disabled={loading || isSaving}
                    loading={isSaving}
                    loadingText="Guardando..."
                    variant="primary"
                    size="md"
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
        </div>
    );
}
