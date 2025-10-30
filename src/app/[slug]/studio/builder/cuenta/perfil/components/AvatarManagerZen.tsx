'use client';

import React, { useState, useRef } from 'react';
import { Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Dropzone } from '@/components/ui/shadcn/dropzone';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { AvatarCropModal } from './AvatarCropModal';

interface AvatarManagerZenProps {
  url?: string | null | undefined;
  onUpdate: (url: string) => Promise<void>;
  onLocalUpdate: (url: string | null) => void;
  studioSlug: string;
  loading?: boolean;
}

export function AvatarManagerZen({
  url,
  onUpdate,
  onLocalUpdate,
  studioSlug,
  loading = false
}: AvatarManagerZenProps) {
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook para upload de archivos
  const { uploading, progress, error, uploadFile, deleteFile } = useFileUpload({
    studioSlug,
    category: 'identidad',
    subcategory: 'avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png'], // Solo JPG y PNG
    maxSize: 2, // 2MB (después de optimización)
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
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Solo se permiten archivos JPG y PNG para tu foto de perfil.');
      return;
    }

    // Validar tamaño inicial (10MB máximo antes de optimizar)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. Por favor selecciona una imagen más pequeña.');
      return;
    }

    // Abrir modal de crop con la imagen seleccionada
    setCropImageUrl(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  const handleCropApply = async (cropData: { x: number; y: number; scale: number; rotation: number }, croppedImageUrl: string) => {
    try {
      // Convertir la URL del blob a File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' });

      // Actualización optimista - usar la imagen cropeada directamente
      onLocalUpdate(croppedImageUrl);

      // Subir el archivo cropeado
      const result = await uploadFile(file);
      if (result.success && result.publicUrl) {
        await onUpdate(result.publicUrl);
        toast.success('¡Perfecto! Tu foto de perfil se ha actualizado correctamente');
      } else {
        // Revertir cambios en caso de error
        onLocalUpdate(url || null);
        toast.error(result.error || 'No pudimos subir tu foto. Inténtalo de nuevo.');
      }

      setShowCropModal(false);
    } catch (error) {
      console.error('Error al aplicar crop:', error);
      toast.error('Error al procesar la imagen');
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
      toast.success('Tu foto de perfil se ha eliminado');
    } catch (error) {
      // Revertir cambios en caso de error
      onLocalUpdate(originalUrl);
      toast.error('No pudimos eliminar tu foto. Inténtalo de nuevo');
      console.error('Error al eliminar archivo:', error);
    }
  };


  return (
    <div className="space-y-4">
      {url ? (
        <div className="space-y-4">
          {/* Previsualización del avatar grande minimalista */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-64 h-64">
              <AvatarImage
                src={url}
                alt="Avatar"
                className="object-cover object-center"
              />
              <AvatarFallback>
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>

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
                onClick={() => {
                  console.log('Abriendo modal de crop con URL:', url);
                  setCropImageUrl(url || '');
                  setShowCropModal(true);
                }}
                disabled={uploading || loading}
                className="flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Ajustar
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
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png']
              }}
              maxSize={10}
              maxFiles={1}
              disabled={uploading || loading}
              className="h-72 border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/20 transition-all duration-300 rounded-lg group cursor-pointer relative overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                {/* Icono principal */}
                <div className="w-12 h-12 mb-3 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors duration-200">
                  <User className="h-6 w-6 text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200" />
                </div>

                {/* Texto principal */}
                <h3 className="text-zinc-200 text-sm font-medium mb-1">
                  Subir Avatar
                </h3>

                {/* Especificaciones técnicas */}
                <p className="text-zinc-400 text-xs mb-3">
                  JPG, PNG (hasta 10MB, se optimizará automáticamente)
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
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
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



      {/* Modal de crop */}
      <AvatarCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageUrl={cropImageUrl}
        onCrop={handleCropApply}
      />
    </div>
  );
}
