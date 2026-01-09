'use client';

import React, { useState, useCallback } from 'react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/zen';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Save, Check, Plus, X } from 'lucide-react';
import { IdentidadData } from '../types';
import { AvatarManager } from '@/components/shared/avatar';
import { actualizarIdentidadCompleta } from '@/lib/actions/studio/profile/identidad';
import { useLogoRefresh } from '@/hooks/useLogoRefresh';
import { toast } from 'sonner';

interface IdentidadFormProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function IdentidadForm({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false,
    onDataChange
}: IdentidadFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const { triggerRefresh } = useLogoRefresh();

    const handleInputChange = (field: keyof IdentidadData, value: string) => {
        onLocalUpdate({ [field]: value });
    };

    // Manejar agregar tag (igual que PostEditorSheet)
    const handleAddTag = useCallback((tag?: string) => {
        const tagToAdd = tag || tagInput.trim();
        if (!tagToAdd) return;

        // Procesar múltiples tags separados por coma o punto
        const tagsToProcess = tagToAdd
            .split(/[,.]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        if (tagsToProcess.length === 0) return;

        const newTags: string[] = [];
        const duplicateTags: string[] = [];

        tagsToProcess.forEach(tag => {
            const normalizedTag = tag.toLowerCase();
            if (!data.palabras_clave?.some(t => t.toLowerCase() === normalizedTag)) {
                newTags.push(tag);
            } else {
                duplicateTags.push(tag);
            }
        });

        if (newTags.length > 0) {
            onLocalUpdate({ palabras_clave: [...(data.palabras_clave || []), ...newTags] });
        }

        if (duplicateTags.length > 0) {
            toast.error(`${duplicateTags.length} palabra(s) clave ya existe(n)`);
        }

        setTagInput("");
    }, [tagInput, data.palabras_clave, onLocalUpdate]);

    // Manejar eliminar tag
    const handleRemoveTag = useCallback((index: number) => {
        const nuevasPalabras = data.palabras_clave?.filter((_, i) => i !== index) || [];
        onLocalUpdate({ palabras_clave: nuevasPalabras });
    }, [data.palabras_clave, onLocalUpdate]);

    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            // Guardar datos de identidad
            const identidadData = {
                nombre: data.studio_name || '',
                slogan: data.slogan || undefined,
                logo_url: data.logo_url || undefined,
                palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || '',
                presentacion: data.presentacion || undefined
            } as Parameters<typeof actualizarIdentidadCompleta>[1];

            await actualizarIdentidadCompleta(studioSlug, identidadData);

            setSaveSuccess(true);
            toast.success('Identidad guardada correctamente');

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
                <div className="animate-pulse">
                    <div className="h-32 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-12 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-20 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-12 bg-zinc-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Información Básica sin ficha */}
            <div>
                {/* Logo centrado arriba, más compacto */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-col items-center gap-3">
                        <AvatarManager
                            url={data.logo_url}
                            onUpdate={async (url: string) => {
                                await onLogoUpdate(url);
                                try {
                                    const identidadData = {
                                        nombre: data.studio_name || '',
                                        slogan: data.slogan || undefined,
                                        logo_url: url,
                                        palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || '',
                                        presentacion: data.presentacion || undefined
                                    };
                                    await actualizarIdentidadCompleta(studioSlug, identidadData);
                                    await onDataChange?.();
                                } catch (error) {
                                    console.error('Error saving identidad after logo update:', error);
                                }
                                triggerRefresh();
                            }}
                            onLocalUpdate={(url: string | null) => {
                                onLogoLocalUpdate(url);
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

                {/* Campos en columna única con mejor espaciado */}
                <div className="space-y-6 max-w-2xl mx-auto">
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

                    {/* Slogan - input de una línea */}
                    <ZenInput
                        label="Slogan"
                        value={data.slogan || ''}
                        onChange={(e) => handleInputChange('slogan', e.target.value)}
                        placeholder="Ej: Capturando momentos únicos"
                        disabled={loading}
                        maxLength={100}
                        hint="Frase corta que describe tu estudio (máximo 100 caracteres)"
                    />

                    {/* Presentación del Estudio */}
                    <ZenTextarea
                        label="Presentación del Estudio"
                        value={data.presentacion || ''}
                        onChange={(e) => handleInputChange('presentacion', e.target.value)}
                        placeholder="Describe tu estudio, servicios y especialidades..."
                        rows={5}
                        disabled={loading}
                        hint="Esta presentación aparecerá en tu perfil público"
                    />
                </div>
            </div>

            {/* Ficha: Palabras Clave */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div>
                        <ZenCardTitle>Palabras Clave SEO</ZenCardTitle>
                        <p className="text-xs text-zinc-400 mt-1">
                            Agrega palabras clave relevantes para mejorar la visibilidad en búsquedas
                        </p>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Input para agregar tags */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Agregar palabras clave
                            </label>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <ZenInput
                                        value={tagInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const lastChar = value[value.length - 1];

                                            // Si el último carácter es coma o punto, agregar el tag antes del separador
                                            if (lastChar === ',' || lastChar === '.') {
                                                const tagBeforeSeparator = value.slice(0, -1).trim();
                                                if (tagBeforeSeparator) {
                                                    handleAddTag(tagBeforeSeparator);
                                                } else {
                                                    setTagInput("");
                                                }
                                            } else {
                                                setTagInput(value);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Escribe y presiona Enter, coma o punto"
                                        label=""
                                        disabled={loading}
                                    />
                                </div>
                                <ZenButton
                                    type="button"
                                    onClick={() => handleAddTag()}
                                    variant="outline"
                                    size="md"
                                    className="h-10 px-3 shrink-0"
                                    disabled={loading}
                                >
                                    <Plus className="h-4 w-4" />
                                </ZenButton>
                            </div>
                        </div>

                        {/* Tags list */}
                        {data.palabras_clave && data.palabras_clave.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {data.palabras_clave.map((tag, index) => (
                                    <ZenBadge
                                        key={index}
                                        variant="secondary"
                                        className="flex items-center gap-1.5 pr-1"
                                    >
                                        <span>{tag}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(index)}
                                            className="hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                                            disabled={loading}
                                            aria-label={`Eliminar ${tag}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </ZenBadge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed border-zinc-700/50 rounded-lg bg-zinc-800/20">
                                <p className="text-sm text-zinc-400 mb-2">
                                    No hay palabras clave agregadas
                                </p>
                                <p className="text-xs text-zinc-500">
                                    Escribe palabras clave y presiona Enter o usa coma/punto para separar múltiples
                                </p>
                            </div>
                        )}
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

