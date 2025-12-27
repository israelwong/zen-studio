'use client';

import { Folder, FolderOpen, ExternalLink, Shield } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

interface GoogleDriveConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting?: boolean;
}

export function GoogleDriveConnectionModal({
  isOpen,
  onClose,
  onConnect,
  connecting = false,
}: GoogleDriveConnectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-zinc-900 border-zinc-800 max-w-lg"
        overlayZIndex={10100}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-zinc-100 flex items-center gap-2">
            <img
              src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
              alt="Google Drive"
              className="h-5 w-5 object-contain brightness-0 invert"
            />
            Conecta Google Drive para entregables
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            Vincula tu cuenta de Google Drive para gestionar y compartir entregables de forma segura
            con tus clientes. Puedes usar una cuenta diferente a la de tu inicio de sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sección 1: Permisos de Lectura */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Permisos de Solo Lectura
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  ZEN solo accederá a carpetas específicas que tú selecciones:
                </p>
                <ul className="space-y-1 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Lectura de carpetas seleccionadas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Visualización de archivos multimedia
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Compartir enlaces públicos (solo para clientes)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sección 2: Portal del Cliente */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FolderOpen className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Portal del Cliente
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Tus clientes verán el contenido de las carpetas vinculadas:
                </p>
                <ul className="space-y-1 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Galería interactiva de fotos y videos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Descarga directa de archivos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Navegación por subcarpetas
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Nota sobre seguridad */}
          <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-800/30">
            <p className="text-xs text-emerald-300 flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Seguridad:</strong> ZEN solo accederá a las carpetas que explícitamente
                vincules. No tendremos acceso a todo tu Drive, solo a las carpetas que selecciones
                para cada evento.
              </span>
            </p>
          </div>

          {/* Nota sobre cuenta diferente */}
          <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-xs text-zinc-400 flex items-start gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
              <span>
                Puedes usar una cuenta de Google diferente a la de tu inicio de sesión. Esto te
                permite separar tu Drive personal del Drive de trabajo.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <ZenButton variant="outline" onClick={onClose} disabled={connecting}>
            Cancelar
          </ZenButton>
          <ZenButton
            variant="primary"
            onClick={onConnect}
            loading={connecting}
            loadingText="Conectando..."
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Entendido, conectar cuenta
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

