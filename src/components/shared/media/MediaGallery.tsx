'use client';

import React, { useState } from 'react';
import { Grid3X3, RectangleHorizontal, LayoutGrid, Upload, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { MediaItem, MediaMode, MediaBlockConfig } from '@/types/content-blocks';
import { ImageSingle } from './ImageSingle';
import { ImageGrid } from './ImageGrid';
import { ImageCarousel } from './ImageCarousel';
import { MasonryGallery } from './MasonryGallery';
import { ZenButton } from '@/components/ui/zen';

interface MediaGalleryProps {
    media: MediaItem[];
    config?: Partial<MediaBlockConfig>;
    className?: string;
    // Props para edición
    showDeleteButtons?: boolean;
    onDelete?: (mediaId: string) => void;
    onReorder?: (reorderedMedia: MediaItem[]) => void;
    isEditable?: boolean;
    lightbox?: boolean;
    onDrop?: (files: File[]) => void | Promise<void>;
    onUploadClick?: () => void;
    isUploading?: boolean;
    // Callbacks para actualizar configuración
    onModeChange?: (mode: MediaMode) => void;
    onConfigChange?: (config: Partial<MediaBlockConfig>) => void;
}

export function MediaGallery({
    media,
    config = {},
    className = '',
    showDeleteButtons = false,
    onDelete,
    onReorder,
    isEditable = false,
    lightbox = true,
    onDrop,
    onUploadClick,
    isUploading = false,
    onModeChange,
    onConfigChange
}: MediaGalleryProps) {
    // Estado local para el modo de visualización (puede cambiar dinámicamente)
    const [localMode, setLocalMode] = useState<MediaMode>(
        (config.mode as MediaMode) || 'grid'
    );

    // Estado para panel de configuración avanzada
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

    // Valores de configuración con defaults
    const columns = (config.columns ?? 3) as 2 | 3 | 4;
    const gap = config.gap ?? 4;
    const borderStyle = (config.borderStyle as 'normal' | 'rounded') ?? 'rounded'; // Por defecto redondo
    const gapStyle = gap === 0 ? 'none' : gap <= 2 ? 'narrow' : 'wide'; // 'none' | 'narrow' | 'wide'

    // Handlers para cambios de configuración
    const handleConfigChange = (updates: Partial<MediaBlockConfig>) => {
        if (onConfigChange) {
            onConfigChange({
                ...config,
                ...updates
            });
        }
    };

    const handleColumnsChange = (newColumns: 2 | 3 | 4) => {
        handleConfigChange({ columns: newColumns });
    };

    const handleBorderChange = (newBorderStyle: 'normal' | 'rounded') => {
        handleConfigChange({ borderStyle: newBorderStyle });
    };

    const handleGapChange = (gapStyle: 'none' | 'narrow' | 'wide') => {
        const gapValue = gapStyle === 'none' ? 0 : gapStyle === 'narrow' ? 2 : 4;
        handleConfigChange({ gap: gapValue });
    };

    // Actualizar modo cuando cambia el config desde fuera
    React.useEffect(() => {
        if (config.mode && config.mode !== 'single') {
            setLocalMode(config.mode as MediaMode);
        }
    }, [config.mode]);

    const handleModeChange = (newMode: MediaMode) => {
        setLocalMode(newMode);
        if (onModeChange) {
            onModeChange(newMode);
        }
    };

    // Renderizar contenido según el modo
    const renderContent = () => {
        if (media.length === 0) {
            // Área de drop cuando está vacío
            return (
                <div
                    className="border-2 border-dashed border-zinc-700 rounded-lg text-center hover:border-emerald-500 transition-colors relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                        if (files.length > 0 && onDrop) {
                            onDrop(files);
                        }
                    }}
                >
                    <div className="p-6 space-y-2">
                        {isUploading ? (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                                <div className="text-sm text-zinc-500">Subiendo imágenes...</div>
                            </>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-zinc-500 mx-auto" />
                                <div className="text-sm text-zinc-500">Arrastra imágenes aquí o</div>
                                {onUploadClick && (
                                    <button
                                        onClick={onUploadClick}
                                        className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                                    >
                                        haz clic para seleccionar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        // Si hay solo una imagen, mostrar en full sin recorte
        if (media.length === 1) {
            return (
                <ImageSingle
                    media={media[0]}
                    className={className}
                    aspectRatio="auto"
                    showDeleteButton={showDeleteButtons}
                    onDelete={onDelete}
                    onDrop={onDrop}
                    isUploading={isUploading}
                    showBorder={false}
                />
            );
        }

        // Si hay múltiples imágenes
        // En modo edición: siempre mostrar grid para poder arrastrar y ordenar
        // En modo preview: mostrar según el modo seleccionado
        if (isEditable && media.length > 1) {
            // Siempre usar grid en el editor con configuración FIJA (no afectada por ajustes)
            return (
                <ImageGrid
                    media={media}
                    config={{
                        ...config,
                        columns: 3, // Fijo en editor
                        gap: 4, // Fijo en editor
                        borderStyle: 'rounded' // Fijo en editor
                    }}
                    className={className}
                    showDeleteButtons={showDeleteButtons}
                    onDelete={onDelete}
                    onReorder={onReorder}
                    isEditable={isEditable}
                    lightbox={lightbox}
                    onDrop={onDrop}
                    onUploadClick={onUploadClick}
                    isUploading={isUploading}
                />
            );
        }

        // En preview: mostrar según el modo seleccionado con configuración actualizada
        const updatedConfig = {
            ...config,
            columns,
            gap,
            borderStyle
        };

        switch (displayMode) {
            case 'grid':
                return (
                    <ImageGrid
                        media={media}
                        config={updatedConfig}
                        className={className}
                        showDeleteButtons={showDeleteButtons}
                        onDelete={onDelete}
                        onReorder={onReorder}
                        isEditable={isEditable}
                        lightbox={lightbox}
                        onDrop={onDrop}
                        onUploadClick={onUploadClick}
                        isUploading={isUploading}
                    />
                );

            case 'slide':
                return (
                    <ImageCarousel
                        media={media}
                        showArrows={config.showArrows ?? true}
                        showDots={config.showDots ?? false}
                        autoplay={config.autoplay ?? 0}
                        className={className}
                        enableLightbox={lightbox}
                    />
                );

            case 'masonry':
                return (
                    <MasonryGallery
                        media={media}
                        columns={columns}
                        spacing={gap}
                        className={className}
                        enableLightbox={lightbox}
                        showDeleteButtons={showDeleteButtons}
                        onDelete={onDelete}
                        borderStyle={borderStyle}
                    />
                );

            default:
                return (
                    <ImageGrid
                        media={media}
                        config={updatedConfig}
                        className={className}
                        showDeleteButtons={showDeleteButtons}
                        onDelete={onDelete}
                        onReorder={onReorder}
                        isEditable={isEditable}
                        lightbox={lightbox}
                        onDrop={onDrop}
                        onUploadClick={onUploadClick}
                        isUploading={isUploading}
                    />
                );
        }
    };

    return (
        <div className="space-y-3">
            {/* Selector de modo de visualización (solo si hay 2+ imágenes) */}
            {/* Los botones solo guardan el modo, pero en el editor siempre se muestra grid */}
            {media.length > 1 && (
                <>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-zinc-400 mr-2">Vista:</span>
                        <ZenButton
                            variant={localMode === 'grid' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleModeChange('grid')}
                            className="gap-2"
                        >
                            <Grid3X3 className="h-4 w-4" />
                            Grid
                        </ZenButton>
                        <ZenButton
                            variant={localMode === 'masonry' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleModeChange('masonry')}
                            className="gap-2"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Masonry
                        </ZenButton>
                        <ZenButton
                            variant={localMode === 'slide' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleModeChange('slide')}
                            className="gap-2"
                        >
                            <RectangleHorizontal className="h-4 w-4" />
                            Carousel
                        </ZenButton>
                        
                        {/* Botón Configurar */}
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                            className="gap-2 ml-auto"
                        >
                            <Settings className="h-4 w-4" />
                            {showAdvancedConfig ? 'Ocultar' : 'Ajustes'}
                            {showAdvancedConfig ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </ZenButton>
                    </div>

                    {/* Panel de configuración avanzada */}
                    {showAdvancedConfig && (
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-4">
                            {/* Columnas */}
                            <div>
                                <label className="text-sm text-zinc-300 mb-2 block">Columnas</label>
                                <div className="flex gap-2">
                                    <ZenButton
                                        variant={columns === 2 ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleColumnsChange(2)}
                                    >
                                        2
                                    </ZenButton>
                                    <ZenButton
                                        variant={columns === 3 ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleColumnsChange(3)}
                                    >
                                        3
                                    </ZenButton>
                                    <ZenButton
                                        variant={columns === 4 ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleColumnsChange(4)}
                                    >
                                        4
                                    </ZenButton>
                                </div>
                            </div>

                            {/* Borde */}
                            <div>
                                <label className="text-sm text-zinc-300 mb-2 block">Borde</label>
                                <div className="flex gap-2">
                                    <ZenButton
                                        variant={borderStyle === 'rounded' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleBorderChange('rounded')}
                                    >
                                        Redondo
                                    </ZenButton>
                                    <ZenButton
                                        variant={borderStyle === 'normal' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleBorderChange('normal')}
                                    >
                                        Normal
                                    </ZenButton>
                                </div>
                            </div>

                            {/* Separación */}
                            <div>
                                <label className="text-sm text-zinc-300 mb-2 block">Separación</label>
                                <div className="flex gap-2">
                                    <ZenButton
                                        variant={gapStyle === 'wide' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleGapChange('wide')}
                                    >
                                        Amplio
                                    </ZenButton>
                                    <ZenButton
                                        variant={gapStyle === 'narrow' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleGapChange('narrow')}
                                    >
                                        Estrecho
                                    </ZenButton>
                                    <ZenButton
                                        variant={gapStyle === 'none' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => handleGapChange('none')}
                                    >
                                        Ninguno
                                    </ZenButton>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Contenido renderizado */}
            {renderContent()}
        </div>
    );
}

