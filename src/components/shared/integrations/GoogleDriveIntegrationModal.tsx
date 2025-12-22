'use client';

import React from 'react';
import { Cloud } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { GoogleDriveConnection } from './GoogleDriveConnection';

interface GoogleDriveIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onConnected?: () => void;
}

export function GoogleDriveIntegrationModal({
  isOpen,
  onClose,
  studioSlug,
  onConnected,
}: GoogleDriveIntegrationModalProps) {
  const handleConnected = () => {
    if (onConnected) {
      onConnected();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-400" />
          <span>Google Drive</span>
        </div>
      }
      description="Vincula carpetas de Google Drive a tus entregables para optimizar almacenamiento"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <GoogleDriveConnection
          studioSlug={studioSlug}
          variant="compact"
          onConnected={handleConnected}
          onDisconnected={handleConnected}
        />

        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-200 mb-3">¿Cómo funciona?</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span>Conecta tu cuenta de Google una sola vez. Los permisos se guardan de forma segura.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span>Al crear un entregable, puedes vincular una carpeta de Google Drive usando el selector.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span>Los clientes verán una galería con thumbnails y podrán descargar directamente desde Google.</span>
            </li>
          </ul>
          <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800">
            Tus archivos permanecen en Google Drive. Solo compartimos los enlaces de visualización y descarga.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

