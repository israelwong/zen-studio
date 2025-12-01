"use client";

import React from "react";
import { ZenTextarea, ZenCard, ZenCardContent } from "@/components/ui/zen";

export interface ContractEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables?: string[];
  readonly?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Editor simple de HTML para contratos
 * TODO: Integrar TipTap para WYSIWYG en fase futura
 */
export function ContractEditor({
  content,
  onChange,
  readonly = false,
  placeholder = "Escribe el contenido del contrato...",
  className = "",
}: ContractEditorProps) {
  return (
    <ZenCard variant="default" className={className}>
      <ZenCardContent className="p-0">
        <ZenTextarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          disabled={readonly}
          placeholder={placeholder}
          className="min-h-[600px] font-mono text-sm border-0 rounded-none focus-visible:ring-0"
        />

        {!readonly && (
          <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <div className="flex items-center gap-4">
                <span>{content.length} caracteres</span>
                <span>•</span>
                <span>HTML permitido</span>
              </div>
              <div>
                <span className="text-blue-400">
                  Tip: Usa variables como @nombre_cliente
                </span>
              </div>
            </div>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

/**
 * Toolbar simple para formato básico
 * TODO: Implementar con TipTap
 */
export function ContractEditorToolbar() {
  return (
    <div className="flex items-center gap-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg mb-4">
      <p className="text-xs text-zinc-600">Editor WYSIWYG próximamente con TipTap</p>
    </div>
  );
}
