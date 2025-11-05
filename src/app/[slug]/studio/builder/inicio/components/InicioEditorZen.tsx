'use client';

import React, { useState, useCallback } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { Home, Image, Package, Grid3X3, Settings, Eye } from 'lucide-react';
import { InicioData, InicioFormData } from '../types';
import { InicioSettingsModal } from './InicioSettingsModal';

interface InicioEditorZenProps {
    studioSlug: string;
    data: InicioData | null;
    loading: boolean;
}

export function InicioEditorZen({ studioSlug, data, loading }: InicioEditorZenProps) {
    const [formData, setFormData] = useState<InicioFormData>({
        studio_name: data?.studio.studio_name || '',
        presentation: data?.studio.presentation || '',
        slogan: data?.studio.slogan || '',
        website: data?.studio.website || ''
    });

    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Actualizar formData cuando cambien los datos
    React.useEffect(() => {
        if (data) {
            setFormData({
                studio_name: data.studio.studio_name,
                presentation: data.studio.presentation || '',
                slogan: data.studio.slogan || '',
                website: data.studio.website || ''
            });
        }
    }, [data]);

    const handleInputChange = (field: keyof InicioFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = useCallback(() => {
        // Aquí se implementaría la lógica para guardar los cambios
        console.log('Guardando datos de inicio:', formData);
    }, [formData]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con botón de configuración */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Página de Inicio</h3>
                    <p className="text-sm text-zinc-400">Personaliza la presentación principal de tu estudio</p>
                </div>
                <div className="flex items-center gap-2">
                    <ZenButton
                        onClick={() => setShowSettingsModal(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Configurar
                    </ZenButton>
                    <ZenButton
                        onClick={handleSave}
                        variant="primary"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        Guardar
                    </ZenButton>
                </div>
            </div>

            {/* Información del estudio */}
            <ZenCard variant="outline" className="p-6">
                <ZenCardHeader className="pb-4">
                    <ZenCardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-400" />
                        Información del Estudio
                    </ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenInput
                            label="Nombre del Estudio"
                            value={formData.studio_name}
                            onChange={(e) => handleInputChange('studio_name', e.target.value)}
                            placeholder="Ej: Studio Fotografía María"
                        />

                        <ZenInput
                            label="Slogan"
                            value={formData.slogan}
                            onChange={(e) => handleInputChange('slogan', e.target.value)}
                            placeholder="Ej: Capturando momentos únicos"
                        />
                    </div>

                    <ZenTextarea
                        label="Presentación"
                        value={formData.presentation}
                        onChange={(e) => handleInputChange('presentation', e.target.value)}
                        placeholder="Describe tu estudio y servicios..."
                        rows={3}
                    />

                    <ZenInput
                        label="Sitio Web"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://tuestudio.com"
                    />
                </ZenCardContent>
            </ZenCard>

            {/* Estadísticas y contenido destacado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ZenCard variant="outline" className="p-4">
                    <div className="flex items-center gap-3">
                        <Grid3X3 className="h-5 w-5 text-purple-400" />
                        <div>
                            <p className="text-sm text-zinc-400">Portafolios</p>
                            <p className="text-lg font-semibold text-zinc-100">
                                {data?.featured_portfolios.length || 0}
                            </p>
                        </div>
                    </div>
                </ZenCard>

                <ZenCard variant="outline" className="p-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-green-400" />
                        <div>
                            <p className="text-sm text-zinc-400">Items en Catálogo</p>
                            <p className="text-lg font-semibold text-zinc-100">
                                {data?.featured_items.length || 0}
                            </p>
                        </div>
                    </div>
                </ZenCard>

                <ZenCard variant="outline" className="p-4">
                    <div className="flex items-center gap-3">
                        <Image className="h-5 w-5 text-blue-400" />
                        <div>
                            <p className="text-sm text-zinc-400">Redes Sociales</p>
                            <p className="text-lg font-semibold text-zinc-100">
                                {data?.social_networks.length || 0}
                            </p>
                        </div>
                    </div>
                </ZenCard>
            </div>

            {/* Contenido destacado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Portafolios destacados */}
                <ZenCard variant="outline" className="p-4">
                    <ZenCardHeader className="pb-3">
                        <ZenCardTitle className="text-base flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4 text-purple-400" />
                            Portafolios Destacados
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        {data?.featured_portfolios.length ? (
                            <div className="space-y-2">
                                {data.featured_portfolios.map((portfolio) => (
                                    <div key={portfolio.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded">
                                        {portfolio.cover_image_url ? (
                                            <img
                                                src={portfolio.cover_image_url}
                                                alt={portfolio.title}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center">
                                                <Grid3X3 className="h-4 w-4 text-zinc-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">
                                                {portfolio.title}
                                            </p>
                                            {portfolio.category && (
                                                <p className="text-xs text-zinc-400">{portfolio.category}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">No hay portafolios disponibles</p>
                        )}
                    </ZenCardContent>
                </ZenCard>

                {/* Items destacados */}
                <ZenCard variant="outline" className="p-4">
                    <ZenCardHeader className="pb-3">
                        <ZenCardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-400" />
                            Items Destacados
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        {data?.featured_items.length ? (
                            <div className="space-y-2">
                                {data.featured_items.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded">
                                        <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center">
                                            <Package className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {item.type} • ${item.cost.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">No hay items disponibles</p>
                        )}
                    </ZenCardContent>
                </ZenCard>
            </div>

            {/* Modal de configuración */}
            {showSettingsModal && (
                <InicioSettingsModal
                    isOpen={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                    data={data}
                />
            )}
        </div>
    );
}
