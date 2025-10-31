'use client';

import React, { useState } from 'react';
import { Grid3X3, RectangleHorizontal, LayoutGrid, Upload } from 'lucide-react';
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
    onModeChange
}: MediaGalleryProps) {
    // Estado local para el modo de visualización (puede cambiar dinámicamente)
    const [localMode, setLocalMode] = useState<MediaMode>(
        (config.mode as MediaMode) || 'grid'
    );

    // Si hay una sola imagen, siempre mostrar en modo single
    const displayMode = media.length === 1 ? 'single' : localMode;

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
            // Siempre usar grid en el editor
            return (
                <ImageGrid
                    media={media}
                    config={config}
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

        // En preview: mostrar según el modo seleccionado
        switch (displayMode) {
            case 'grid':
                return (
                    <ImageGrid
                        media={media}
                        config={config}
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
                        columns={config.columns ?? 3}
                        spacing={config.gap ?? 4}
                        className={className}
                        enableLightbox={lightbox}
                        showDeleteButtons={showDeleteButtons}
                        onDelete={onDelete}
                    />
                );

            default:
                return (
                    <ImageGrid
                        media={media}
                        config={config}
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
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-zinc-400 mr-2">Vista preview:</span>
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
                </div>
            )}

            {/* Contenido renderizado */}
            {renderContent()}
        </div>
    );
}

