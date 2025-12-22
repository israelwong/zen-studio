"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariableBadgeProps {
  variable: string;
  onRemove?: () => void;
  className?: string;
}

export function VariableBadge({
  variable,
  onRemove,
  className,
}: VariableBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md",
        "bg-emerald-600/20 text-emerald-400 text-xs font-mono",
        "border border-emerald-600/30",
        className
      )}
    >
      {variable}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-emerald-300 transition-colors"
          aria-label="Eliminar variable"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

