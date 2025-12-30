'use client';

import React from 'react';
import { ZenDialog, ZenCardContent } from '@/components/ui/zen';
import { CondicionRadioCard } from './CondicionRadioCard';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
}

interface CondicionComercialSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  condiciones: CondicionComercial[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CondicionComercialSelectorModal({
  isOpen,
  onClose,
  condiciones,
  selectedId,
  onSelect,
}: CondicionComercialSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = React.useState(selectedId);

  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedId);
    }
  }, [isOpen, selectedId]);

  const handleConfirm = () => {
    onSelect(tempSelectedId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Contenido del modal */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900 rounded-lg shadow-xl border border-zinc-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">
            Seleccionar Condiciones Comerciales
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Elige las condiciones comerciales para esta cotización
          </p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {condiciones.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-400">
              No hay condiciones comerciales disponibles
            </div>
          ) : (
            <div className="space-y-2">
              {condiciones.map((cc) => (
                <CondicionRadioCard
                  key={cc.id}
                  id={cc.id}
                  name={cc.name}
                  description={cc.description || null}
                  discount_percentage={cc.discount_percentage || null}
                  advance_percentage={cc.advance_percentage || null}
                  selected={tempSelectedId === cc.id}
                  onChange={setTempSelectedId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

