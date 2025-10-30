'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ALLOWED_MIME_TYPES } from '@/lib/actions/schemas/media-schemas';
import { Dropzone } from '@/components/ui/shadcn/dropzone';

interface LogoManagerZenProps {
    tipo: 'logo' | 'isotipo';
    url?: string | null | undefined;
    onUpdate: (url: string) => Promise<void>;
    onLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
}

export function LogoManagerZen({
    tipo,
    url,
    onUpdate,
    onLocalUpdate,
    studioSlug,
    loading = false
}: LogoManagerZenProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hook para upload de archivos
    const { uploading, progress, error, uploadFile, deleteFile } = useFileUpload({
        studioSlug,
        category: 'identidad',
        subcategory: tipo === 'logo' ? 'logos' : 'isotipos',
        allowedMimeTypes: ALLOWED_MIME_TYPES.image, // PNG, SVG
        maxSize: 5, // 5MB
        onSuccess: (newUrl) => {
            onLocalUpdate(newUrl);
            onUpdate(newUrl);
        },
        onError: (error) => {
            toast.error(error);
        }
    });

    const handleFileSelect = async (file: File) => {
        // Validar tipo de archivo
        if (!ALLOWED_MIME_TYPES.image.includes(file.type as "image/png" | "image/svg+xml")) {
            toast.error('Tipo de archivo no permitido. Solo se permiten PNG y SVG.');
            return;
        }

        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo es demasiado grande. Máximo 5MB permitido.');
            return;
        }

        // Actualización optimista
        onLocalUpdate(URL.createObjectURL(file));

        try {
            const result = await uploadFile(file);
            if (result.success && result.publicUrl) {
                await onUpdate(result.publicUrl);
                toast.success(`${tipo === 'logo' ? 'Logo' : 'Isotipo'} subido exitosamente`);
            } else {
                // Revertir cambios en caso de error
                onLocalUpdate(url || null);
                toast.error(result.error || 'Error al subir archivo');
            }
        } catch {
            // Revertir cambios en caso de error
            onLocalUpdate(url || null);
            toast.error('Error al subir archivo');
        }
    };

    const handleRemoveUrl = async () => {
        // Guardar la URL original para rollback
        const originalUrl = url ?? null;

        // Actualización optimista - actualizar UI inmediatamente
        onLocalUpdate(null);

        try {
            if (originalUrl) {
                await deleteFile(originalUrl);
            }
            await onUpdate('');
            toast.success(`${tipo === 'logo' ? 'Logo' : 'Isotipo'} eliminado`);
        } catch (error) {
            // Revertir cambios en caso de error
            onLocalUpdate(originalUrl);
            toast.error(`Error al eliminar ${tipo === 'logo' ? 'logo' : 'isotipo'}`);
            console.error('Error al eliminar archivo:', error);
        }
    };

    const titulo = tipo === 'logo' ? 'Logo Principal' : 'Isotipo';

    return (
        <div className="space-y-4">
            {url ? (
                <div className="space-y-4">
                    {/* Previsualización del logo grande minimalista */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-64 h-32 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden p-4">
                            <Image
                                src={url}
                                alt={titulo}
                                width={256}
                                height={128}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* Botones minimalistas */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || loading}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="h-3 w-3" />
                                Cambiar
                            </button>

                            <button
                                onClick={handleRemoveUrl}
                                disabled={uploading || loading}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Dropzone personalizado con ZEN styling */}
                    <div className="relative">
                        <Dropzone
                            onFileSelect={handleFileSelect}
                            acceptedFileTypes={{
                                'image/png': ['.png'],
                                'image/svg+xml': ['.svg']
                            }}
                            maxSize={5}
                            maxFiles={1}
                            disabled={uploading || loading}
                            className="h-40 border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/20 transition-all duration-300 rounded-lg group cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                {/* Icono principal */}
                                <div className="w-12 h-12 mb-3 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors duration-200">
                                    <Upload className="h-6 w-6 text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200" />
                                </div>

                                {/* Texto principal */}
                                <h3 className="text-zinc-200 text-sm font-medium mb-1">
                                    Subir {titulo}
                                </h3>

                                {/* Especificaciones técnicas */}
                                <p className="text-zinc-400 text-xs mb-3">
                                    PNG, SVG (hasta 5MB)
                                </p>

                                {/* Instrucciones de uso */}
                                <p className="text-zinc-500 text-xs">
                                    Arrastra y suelta o haz clic para seleccionar
                                </p>
                            </div>
                        </Dropzone>

                        {/* Indicador de estado de carga */}
                        {uploading && (
                            <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                                <div className="text-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                                    <p className="text-zinc-200 text-sm">Subiendo...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input de archivo oculto para compatibilidad */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,.svg,image/png,image/svg+xml"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                }}
                className="hidden"
            />

            {/* Barra de progreso con ZEN styling */}
            {uploading && (
                <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                            <span className="text-zinc-300 font-medium">Subiendo archivo...</span>
                        </div>
                        <span className="text-blue-400 font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-xs text-zinc-500 text-center">
                        Por favor espera mientras se procesa tu archivo...
                    </div>
                </div>
            )}

            {/* Mostrar error si existe con ZEN styling */}
            {error && (
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-md">
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-red-400 rounded-full mr-2" />
                        <span className="text-red-400 text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Input de URL con ZEN components */}
        </div>
    );
}
