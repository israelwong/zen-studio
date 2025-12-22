"use client";

import React from "react";
import { ContractVariable } from "./types";
import { cn } from "@/lib/utils";

interface VariableAutocompleteProps {
  isOpen: boolean;
  variables: ContractVariable[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (variable: ContractVariable) => void;
  onClose: () => void;
}

export function VariableAutocomplete({
  isOpen,
  variables,
  selectedIndex,
  position,
  onSelect,
  onClose,
}: VariableAutocompleteProps) {
  if (!isOpen || variables.length === 0) return null;

  const groupedVariables = variables.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    },
    {} as Record<string, ContractVariable[]>
  );

  const categoryLabels: Record<string, string> = {
    cliente: "Cliente",
    evento: "Evento",
    comercial: "Comercial",
    studio: "Studio",
    bloque: "Bloques Especiales",
  };

  let currentIndex = 0;

  return (
    <div
      className="absolute z-[100] bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-96 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: "280px",
        maxWidth: "400px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 space-y-2">
        {Object.entries(groupedVariables).map(([category, vars]) => (
          <div key={category} className="space-y-1">
            <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase">
              {categoryLabels[category] || category}
            </div>
            {vars.map((variable) => {
              const index = currentIndex++;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => onSelect(variable)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors",
                    isSelected
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "hover:bg-zinc-800 text-zinc-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded">
                        {variable.key}
                      </code>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        {variable.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

