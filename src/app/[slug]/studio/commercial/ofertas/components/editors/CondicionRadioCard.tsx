"use client";

import { formatCurrency } from '@/lib/actions/utils/formatting';
import { Edit2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface CondicionRadioCardProps {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  type: 'standard' | 'offer';
  selected: boolean;
  onChange: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function CondicionRadioCard({
  id,
  name,
  description,
  discount_percentage,
  advance_percentage,
  advance_type,
  advance_amount,
  type,
  selected,
  onChange,
  onEdit,
}: CondicionRadioCardProps) {
  const handleCardClick = () => {
    onChange(id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que se active el onChange
    if (onEdit) {
      onEdit(id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        border rounded-lg p-3 cursor-pointer transition-all
        ${selected
          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Radio Button */}
        <div className="mt-0.5 shrink-0">
          <div
            className={`
              w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
              ${selected
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-zinc-600'
              }
            `}
          >
            {selected && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>
              {name}
            </span>
            {type === 'offer' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                OFERTA
              </span>
            )}
          </div>

          {description && (
            <p className={`text-xs mt-1 ${selected ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {description}
            </p>
          )}

          <div className={`flex items-center gap-3 text-xs mt-1.5 ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>
            {(() => {
              const tipoAnticipo = advance_type || 'percentage';
              if (tipoAnticipo === 'fixed_amount' && advance_amount) {
                return <span>Anticipo: {formatCurrency(advance_amount)}</span>;
              } else if (tipoAnticipo === 'percentage' && advance_percentage !== null) {
                return <span>Anticipo: {advance_percentage}%</span>;
              }
              return null;
            })()}
            <span>Descuento: {discount_percentage ?? 0}%</span>
          </div>
        </div>

        {/* Botón Editar */}
        {onEdit && (
          <div className="shrink-0">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30"
              title={type === 'offer' ? 'Editar condición especial para esta oferta' : 'Editar condición comercial'}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </ZenButton>
          </div>
        )}
      </div>
    </div>
  );
}
