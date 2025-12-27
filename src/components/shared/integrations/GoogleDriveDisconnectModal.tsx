'use client';

import React, { useState } from 'react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

interface GoogleDriveDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (limpiarPermisos: boolean) => Promise<void>;
  studioSlug: string;
  isDisconnecting?: boolean;
}

export function GoogleDriveDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  isDisconnecting = false,
}: GoogleDriveDisconnectModalProps) {
  const [limpiarPermisos, setLimpiarPermisos] = useState(true);

  const handleConfirm = async () => {
    await onConfirm(limpiarPermisos);
  };

  const handleClose = () => {
    setLimpiarPermisos(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md" overlayZIndex={10100}>
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Desconectar Google Drive
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            ¿Qué deseas hacer con los permisos públicos de las carpetas vinculadas?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${!limpiarPermisos
              ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              : 'bg-zinc-800 border-zinc-600'
              }`}
            onClick={() => setLimpiarPermisos(false)}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={!limpiarPermisos}
                onChange={() => setLimpiarPermisos(false)}
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-200 mb-1">
                  Solo desconectar
                </div>
                <div className="text-xs text-zinc-400">
                  Mantener los permisos públicos de las carpetas. Solo se detendrá la sincronización automática.
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${limpiarPermisos
              ? 'bg-red-950/20 border-red-900/50 hover:border-red-900/70'
              : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            onClick={() => setLimpiarPermisos(true)}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={limpiarPermisos}
                onChange={() => setLimpiarPermisos(true)}
                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-200 mb-1">
                  Revocar permisos y desconectar
                </div>
                <div className="text-xs text-zinc-400">
                  Revocar todos los permisos públicos de las carpetas vinculadas y desconectar Google Drive. Las carpetas seguirán existiendo pero perderán acceso público.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <ZenButton
            variant="outline"
            onClick={handleClose}
            disabled={isDisconnecting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isDisconnecting}
            loadingText={
              limpiarPermisos
                ? 'Revocando permisos...'
                : 'Desconectando...'
            }
          >
            {limpiarPermisos ? 'Revocar y Desconectar' : 'Desconectar'}
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

