'use client';

import React from 'react';
import { Receipt, FileText, GitBranch, Tag, CreditCard } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface PromiseMainToolbarProps {
  studioSlug: string;
  onCondicionesComercialesClick: () => void;
  onTerminosCondicionesClick: () => void;
  onPipelineConfigClick: () => void;
  onTagsClick: () => void;
  onPaymentMethodsClick: () => void;
}

export function PromiseMainToolbar({
  studioSlug,
  onCondicionesComercialesClick,
  onTerminosCondicionesClick,
  onPipelineConfigClick,
  onTagsClick,
  onPaymentMethodsClick,
}: PromiseMainToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {/* Grupo: Configuración Comercial */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Legales</span>
          {/* Botón Condiciones Comerciales */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onCondicionesComercialesClick}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Condiciones Comerciales</span>
          </ZenButton>

          {/* Botón Términos y Condiciones */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onTerminosCondicionesClick}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Términos y Condiciones</span>
          </ZenButton>
        </div>

        {/* Divisor */}
        <div className="h-4 w-px bg-zinc-700" />

        {/* Grupo: Pipeline y Etiquetas */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Configuración</span>
          {/* Botón Configuración Pipeline */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onPipelineConfigClick}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Pipeline</span>
          </ZenButton>

          {/* Botón Etiquetas */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onTagsClick}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Etiquetas</span>
          </ZenButton>
        </div>

        {/* Divisor */}
        <div className="h-4 w-px bg-zinc-700" />

        {/* Grupo: Métodos de Pago */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Pagos</span>
          {/* Botón Métodos de Pago */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onPaymentMethodsClick}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Métodos de Pago</span>
          </ZenButton>
        </div>
      </div>
    </div>
  );
}

