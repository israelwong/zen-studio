"use client";

import { Users, Video, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectiveRadioProps {
  value: "presencial" | "virtual";
  checked: boolean;
  onChange: (value: "presencial" | "virtual") => void;
}

export function ObjectiveRadio({ value, checked, onChange }: ObjectiveRadioProps) {
  const config = {
    presencial: {
      label: "Cita Presencial",
      description: "Sesión fotográfica en persona",
      icon: Users,
    },
    virtual: {
      label: "Cita Virtual",
      description: "Consulta o entrega en línea",
      icon: Video,
    },
  };

  const { label, description, icon: Icon } = config[value];

  return (
    <label
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
        checked
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
      )}
    >
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4 flex-shrink-0",
              checked ? "text-emerald-400" : "text-zinc-400"
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              checked ? "text-emerald-200" : "text-zinc-300"
            )}
          >
            {label}
          </span>
          {checked && (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-1 ml-6">{description}</p>
      </div>
    </label>
  );
}
