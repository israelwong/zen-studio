'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
} from '@/components/ui/zen';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface PromiseClosingProcessCardProps {
  cotizacion: CotizacionListItem;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  };
  studioSlug: string;
  promiseId: string;
  onAuthorizeClick: () => void;
  isLoadingPromiseData?: boolean;
}

export function PromiseClosingProcessCard({
  cotizacion,
  promiseData,
  studioSlug,
  promiseId,
  onAuthorizeClick,
  isLoadingPromiseData = false,
}: PromiseClosingProcessCardProps) {
  // Calcular completitud de datos del cliente
  const clientCompletion = {
    name: !!promiseData.name?.trim(),
    phone: !!promiseData.phone?.trim(),
    email: !!promiseData.email?.trim(),
    address: !!promiseData.address?.trim(),
  };
  const clientPercentage = Math.round(
    (Object.values(clientCompletion).filter(Boolean).length / 4) * 100
  );

  // Verificar si tiene condiciones comerciales
  const hasCondiciones = !!cotizacion.condiciones_comerciales_id;
  const condicionNombre = cotizacion.condiciones_comerciales?.name || 'No definidas';

  // Determinar estado del contrato
  const isClienteNuevo = cotizacion.selected_by_prospect === true;
  
  let contratoIcon: React.ReactNode;
  let contratoEstado: string;
  let contratoColor: string;

  if (isClienteNuevo) {
    switch (cotizacion.status) {
      case 'contract_pending':
        contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Pendiente de confirmación del cliente';
        contratoColor = 'text-amber-400';
        break;
      case 'contract_generated':
        contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Generado, esperando firma del cliente';
        contratoColor = 'text-blue-400';
        break;
      case 'contract_signed':
        contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Firmado por el cliente';
        contratoColor = 'text-emerald-400';
        break;
      default:
        contratoIcon = <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />;
        contratoEstado = 'Estado desconocido';
        contratoColor = 'text-zinc-400';
    }
  } else {
    // Cliente Legacy
    contratoIcon = <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />;
    contratoEstado = 'No requerido (flujo manual)';
    contratoColor = 'text-zinc-400';
  }

  // TODO: Determinar estado del pago (requiere consulta a DB)
  const pagoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  const pagoEstado = 'No registrado';
  const pagoColor = 'text-amber-400';

  if (isLoadingPromiseData) {
    return (
      <ZenCard className="mb-4">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <ZenCardTitle className="text-sm">En Proceso de Cierre</ZenCardTitle>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard className="mb-4">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <ZenCardTitle className="text-sm">En Proceso de Cierre</ZenCardTitle>
        </div>
      </ZenCardHeader>

      <ZenCardContent className="p-4">
        {/* Header: Nombre + Monto */}
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white mb-1">{cotizacion.name}</h4>
          <p className="text-2xl font-bold text-emerald-400">
            ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Indicadores de Progreso */}
        <div className="space-y-3 mb-5">
          {/* Datos del Cliente */}
          <div className="flex items-center gap-2.5 text-sm">
            {clientPercentage === 100 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="text-zinc-300 flex-1">Datos del cliente</span>
            <span
              className={`font-medium tabular-nums ${
                clientPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {clientPercentage}%
            </span>
          </div>

          {/* Condiciones Comerciales */}
          <div className="flex items-start gap-2.5 text-sm">
            {hasCondiciones ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-zinc-300 block">Condiciones comerciales</span>
              <p className={`text-xs mt-0.5 ${hasCondiciones ? 'text-zinc-400' : 'text-amber-400'}`}>
                {condicionNombre}
              </p>
            </div>
          </div>

          {/* Contrato */}
          <div className="flex items-start gap-2.5 text-sm">
            {contratoIcon}
            <div className="flex-1 min-w-0">
              <span className="text-zinc-300 block">Contrato digital</span>
              <p className={`text-xs mt-0.5 ${contratoColor}`}>{contratoEstado}</p>
            </div>
          </div>

          {/* Pago Inicial */}
          <div className="flex items-start gap-2.5 text-sm">
            {pagoIcon}
            <div className="flex-1 min-w-0">
              <span className="text-zinc-300 block">Pago inicial</span>
              <p className={`text-xs mt-0.5 ${pagoColor}`}>{pagoEstado}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <ZenButton variant="primary" className="w-full" onClick={onAuthorizeClick}>
          Autorizar y Crear Evento
        </ZenButton>
      </ZenCardContent>
    </ZenCard>
  );
}

