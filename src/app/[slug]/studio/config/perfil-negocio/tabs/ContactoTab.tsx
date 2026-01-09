'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import { ContactInfoCard } from '@/app/[slug]/studio/business/identity/components/ContactInfoCard';
import { EditScheduleModal, EditSocialNetworksModal } from '@/components/shared/contact-modals';
import { Plus, X, Save, Check, Clock, Edit2, Share2, ExternalLink } from 'lucide-react';
import { BuilderProfileData, BuilderHorario } from '@/types/builder-profile';
import { actualizarIdentidadCompleta, updateStudioPresentation } from '@/lib/actions/studio/profile/identidad';
import { toast } from 'sonner';
import InstagramIcon from '@/components/ui/icons/InstagramIcon';
import FacebookIcon from '@/components/ui/icons/FacebookIcon';
import TikTokIcon from '@/components/ui/icons/TikTokIcon';
import YouTubeIcon from '@/components/ui/icons/YouTubeIcon';
import LinkedInIcon from '@/components/ui/icons/LinkedInIcon';
import ThreadsIcon from '@/components/ui/icons/ThreadsIcon';
import SpotifyIcon from '@/components/ui/icons/SpotifyIcon';

interface ContactoTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate?: (updater: (prev: BuilderProfileData | null) => BuilderProfileData | null) => void;
    onDataChange: () => Promise<void>;
}

interface HorarioAgrupado {
    dias: string;
    horario: string;
}

export function ContactoTab({ builderData, loading, studioSlug, onUpdate, onDataChange }: ContactoTabProps) {
    const [presentacion, setPresentacion] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [editScheduleOpen, setEditScheduleOpen] = useState(false);
    const [editSocialNetworksOpen, setEditSocialNetworksOpen] = useState(false);

    // Función helper para parsear keywords
    const parseKeywords = (keywords: string | null | undefined): string[] => {
        if (!keywords) return [];
        
        const trimmed = keywords.trim();
        
        if (!trimmed || trimmed === '[]' || trimmed === '""') {
            return [];
        }
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed)
                    ? parsed.filter((k: unknown) => k && typeof k === 'string').map((k: string) => k.trim()).filter((k: string) => k)
                    : [];
            } catch {
                // Si falla el parse, tratar como string normal separado por comas
            }
        }
        
        return trimmed.split(',').map(k => k.trim()).filter(k => k && k !== '[]' && k !== '""');
    };

    const [palabrasClave, setPalabrasClave] = useState<string[]>([]);

    useEffect(() => {
        if (builderData?.studio) {
            setPresentacion(builderData.studio.presentation || '');
            setPalabrasClave(parseKeywords(builderData.studio.keywords));
        }
    }, [builderData]);

    // Función para traducir días
    const traducirDia = (dia: string): string => {
        const dias: { [key: string]: string } = {
            'monday': 'Lunes',
            'tuesday': 'Martes',
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes',
            'saturday': 'Sábado',
            'sunday': 'Domingo'
        };
        return dias[dia] || dia;
    };

    // Función para formatear días en rangos legibles
    const formatearDias = (dias: string[]): string => {
        if (dias.length === 0) return '';
        if (dias.length === 1) return dias[0];
        if (dias.length === 2) return dias.join(' y ');

        // Ordenar días según el orden de la semana
        const ordenDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diasOrdenados = dias.sort((a, b) =>
            ordenDias.indexOf(a) - ordenDias.indexOf(b)
        );

        // Verificar si son días consecutivos
        const esConsecutivo = diasOrdenados.every((dia, index) => {
            if (index === 0) return true;
            const diaActual = ordenDias.indexOf(dia);
            const diaAnterior = ordenDias.indexOf(diasOrdenados[index - 1]);
            return diaActual === diaAnterior + 1;
        });

        if (esConsecutivo && diasOrdenados.length > 2) {
            return `${diasOrdenados[0]} a ${diasOrdenados[diasOrdenados.length - 1]}`;
        }

        return diasOrdenados.join(', ');
    };

    // Función para agrupar horarios por horario similar
    const agruparHorarios = (horarios: Array<{
        id: string;
        dia: string;
        apertura: string | null;
        cierre: string | null;
        cerrado: boolean;
    }>): HorarioAgrupado[] => {
        const grupos: { [key: string]: string[] } = {};

        horarios.forEach(horario => {
            if (horario.cerrado) {
                // Agrupar días cerrados
                const key = 'Cerrado';
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            } else {
                // Agrupar por horario
                const apertura = horario.apertura || '09:00';
                const cierre = horario.cierre || '18:00';
                const key = `${apertura} - ${cierre}`;
                if (!grupos[key]) grupos[key] = [];
                grupos[key].push(traducirDia(horario.dia));
            }
        });

        return Object.entries(grupos).map(([horario, dias]) => ({
            dias: formatearDias(dias),
            horario
        }));
    };

    const horarios = builderData?.contactInfo?.horarios || [];
    const horariosAgrupados = agruparHorarios(horarios);

    // Manejar agregar tag
    const handleAddTag = useCallback((tag?: string) => {
        const tagToAdd = tag || tagInput.trim();
        if (!tagToAdd) return;

        const tagsToProcess = tagToAdd
            .split(/[,.]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        if (tagsToProcess.length === 0) return;

        const newTags: string[] = [];
        const duplicateTags: string[] = [];

        tagsToProcess.forEach(tag => {
            const normalizedTag = tag.toLowerCase();
            if (!palabrasClave.some(t => t.toLowerCase() === normalizedTag)) {
                newTags.push(tag);
            } else {
                duplicateTags.push(tag);
            }
        });

        if (newTags.length > 0) {
            const nuevasPalabras = [...palabrasClave, ...newTags];
            setPalabrasClave(nuevasPalabras);
            if (onUpdate) {
                onUpdate((prev: BuilderProfileData | null) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        studio: { ...prev.studio, keywords: nuevasPalabras.join(', ') }
                    };
                });
            }
        }

        if (duplicateTags.length > 0) {
            toast.error(`${duplicateTags.length} palabra(s) clave ya existe(n)`);
        }

        setTagInput("");
    }, [tagInput, palabrasClave, onUpdate]);

    // Manejar eliminar tag
    const handleRemoveTag = useCallback((index: number) => {
        const nuevasPalabras = palabrasClave.filter((_, i) => i !== index);
        setPalabrasClave(nuevasPalabras);
        if (onUpdate) {
            onUpdate((prev: BuilderProfileData | null) => {
                if (!prev) return null;
                return {
                    ...prev,
                    studio: { ...prev.studio, keywords: nuevasPalabras.join(', ') }
                };
            });
        }
    }, [palabrasClave, onUpdate]);

    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            // Guardar presentación
            await updateStudioPresentation(studioSlug, presentacion.trim() || null);

            // Guardar palabras clave
            await actualizarIdentidadCompleta(studioSlug, {
                nombre: builderData?.studio?.studio_name || '',
                slogan: builderData?.studio?.slogan || undefined,
                palabras_clave: palabrasClave.join(', '),
            });

            setSaveSuccess(true);
            toast.success('Información de contacto guardada correctamente');
            await onDataChange?.();

            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving contacto:', error);
            toast.error('Error al guardar. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-[400px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-[400px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    // Map phones data to Telefono type
    const telefonosData = builderData?.contactInfo?.phones?.map(phone => ({
        id: phone.id,
        numero: phone.number,
        tipo: (phone.type === 'WHATSAPP' ? 'whatsapp' :
            phone.type === 'LLAMADAS' ? 'llamadas' : 'ambos') as 'llamadas' | 'whatsapp' | 'ambos',
        is_active: phone.is_active
    })) || [];

    return (
        <div className="space-y-6">
            {/* Presentación del Estudio */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <ZenCardTitle>Presentación del Estudio</ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <ZenTextarea
                        label="Descripción de tu negocio"
                        value={presentacion}
                        onChange={(e) => setPresentacion(e.target.value)}
                        placeholder="Describe tu estudio, servicios y especialidades..."
                        rows={5}
                        disabled={loading}
                        hint="Esta presentación aparecerá en tu perfil público"
                    />
                </ZenCardContent>
            </ZenCard>

            {/* Información de Contacto */}
            <ContactInfoCard
                studioSlug={studioSlug}
                telefonos={telefonosData}
                email={builderData?.contactInfo?.email || null}
                website={builderData?.studio?.website || null}
                direccion={builderData?.studio?.address || null}
                google_maps_url={builderData?.studio?.maps_url || null}
                onDataChange={onDataChange}
                loading={loading}
            />

            {/* Horarios de Atención */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800 flex items-center justify-between">
                    <ZenCardTitle>Horarios de Atención</ZenCardTitle>
                    <button
                        onClick={() => setEditScheduleOpen(true)}
                        className="p-2 rounded-md bg-emerald-600/10 text-emerald-400 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                        aria-label="Editar horarios"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="space-y-4">
                        {horariosAgrupados.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-2.5">
                                        {horariosAgrupados.map((grupo, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-500/50" />
                                                <div className="flex-1 flex items-baseline justify-between gap-3">
                                                    <span className="text-sm text-zinc-200 font-medium">
                                                        {grupo.dias}
                                                    </span>
                                                    <span className="text-sm text-zinc-400 tabular-nums">
                                                        {grupo.horario}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex items-center gap-3 cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors"
                                onClick={() => setEditScheduleOpen(true)}
                            >
                                <Clock className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm italic">
                                    Agrega tus horarios de atención
                                </span>
                            </div>
                        )}
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Palabras Clave */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <ZenCardTitle>Palabras Clave</ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Input para agregar tags */}
                        <div>
                            <ZenInput
                                value={tagInput}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const lastChar = value[value.length - 1];

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

                        {/* Tags list */}
                        {palabrasClave.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {palabrasClave.map((tag, index) => (
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

            {/* Redes Sociales */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800 flex items-center justify-between">
                    <ZenCardTitle>Redes Sociales</ZenCardTitle>
                    <button
                        onClick={() => setEditSocialNetworksOpen(true)}
                        className="p-2 rounded-md bg-emerald-600/10 text-emerald-400 transition-all duration-200 hover:bg-emerald-600/20 hover:scale-110"
                        aria-label="Editar redes sociales"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="space-y-4">
                        {builderData?.socialNetworks && builderData.socialNetworks.length > 0 ? (
                            <div className="flex items-start gap-3">
                                <Share2 className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-2.5">
                                    {builderData.socialNetworks.map((network) => {
                                        const platformName = network.platform?.name?.toLowerCase() || '';

                                        return (
                                            <a
                                                key={network.id}
                                                href={network.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/social flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 hover:from-zinc-800/80 hover:to-zinc-800/60 border border-zinc-800/50 hover:border-zinc-700/50 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-800/60 group-hover/social:bg-emerald-500/10 group-hover/social:border group-hover/social:border-emerald-500/20 transition-all duration-300 shrink-0">
                                                    {platformName.includes('instagram') && <InstagramIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('facebook') && <FacebookIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('tiktok') && <TikTokIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('youtube') && <YouTubeIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('linkedin') && <LinkedInIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('threads') && <ThreadsIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                    {platformName.includes('spotify') && <SpotifyIcon className="w-4 h-4 text-zinc-300 group-hover/social:text-emerald-400 transition-colors duration-300" />}
                                                </div>
                                                <span className="text-sm font-medium text-zinc-200 group-hover/social:text-white transition-colors duration-300">
                                                    {network.platform?.name || 'Red social'}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover/social:text-emerald-400 group-hover/social:translate-x-0.5 transition-all duration-300 shrink-0" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex items-center gap-3 cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors"
                                onClick={() => setEditSocialNetworksOpen(true)}
                            >
                                <Share2 className="w-5 h-5 text-zinc-600" />
                                <span className="text-sm italic">
                                    Agrega tus redes sociales
                                </span>
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

            {/* Modal de Horarios */}
            <EditScheduleModal
                isOpen={editScheduleOpen}
                onClose={() => setEditScheduleOpen(false)}
                studioSlug={studioSlug}
                horarios={horarios.map(h => ({
                    id: h.id,
                    dia: h.dia,
                    apertura: h.apertura || undefined,
                    cierre: h.cierre || undefined,
                    cerrado: h.cerrado
                }))}
                onSuccess={async () => {
                    await onDataChange();
                }}
            />

            {/* Modal de Redes Sociales */}
            <EditSocialNetworksModal
                isOpen={editSocialNetworksOpen}
                onClose={() => setEditSocialNetworksOpen(false)}
                studioSlug={studioSlug}
                onSuccess={async () => {
                    await onDataChange();
                }}
            />
        </div>
    );
}
