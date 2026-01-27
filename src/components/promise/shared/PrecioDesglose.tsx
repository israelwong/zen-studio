'use client';

import React, { forwardRef, useMemo } from 'react';
import { formatRoundedPrice } from '@/lib/utils/price-rounding';

interface PrecioDesgloseProps {
  precioBase: number;
  descuentoCondicion: number;
  precioConDescuento: number;
  precioFinalNegociado?: number | null; // Precio personalizado negociado (si existe, es el precio final)
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipo: number;
  diferido: number;
  cortesias?: number; // Monto total de cortesías (items marcados como cortesía)
  useCharmRounding?: boolean; // Si es true, usa redondeo charm (solo para paquetes)
}

const formatPrice = (price: number, useCharm: boolean = false) => {
  if (useCharm) {
    return formatRoundedPrice(price, 'charm');
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const PrecioDesglose = forwardRef<HTMLDivElement, PrecioDesgloseProps>(
  (
    {
      precioBase,
      descuentoCondicion,
      precioConDescuento,
      precioFinalNegociado,
      advanceType,
      anticipoPorcentaje,
      anticipo,
      diferido,
      cortesias = 0,
      useCharmRounding = false,
    },
    ref
  ) => {
    // Usar useMemo para asegurar consistencia entre servidor y cliente
    const { precioFinalAPagar, tienePrecioNegociado, ahorroTotal, precioNegociadoNormalizado } = useMemo(() => {
      // Normalizar precioFinalNegociado: convertir null/undefined a null explícitamente
      const precioNegociado = precioFinalNegociado != null && precioFinalNegociado > 0 
        ? Number(precioFinalNegociado) 
        : null;
      
      // Si hay precio final negociado, ese es el precio a pagar (ya incluye todo)
      // Si no, calcular precio final incluyendo cortesías
      const precioFinal = precioNegociado ?? (precioConDescuento - cortesias);
      const tieneNegociado = precioNegociado !== null;

      // Calcular ahorro total solo si hay precio negociado válido y es menor que el precio base
      const ahorro = tieneNegociado && precioNegociado !== null && precioNegociado < precioBase
        ? precioBase - precioNegociado 
        : 0;

      return {
        precioFinalAPagar: precioFinal,
        tienePrecioNegociado: tieneNegociado,
        ahorroTotal: ahorro,
        precioNegociadoNormalizado: precioNegociado,
      };
    }, [precioFinalNegociado, precioConDescuento, cortesias, precioBase]);

    return (
      <div ref={ref} className="mt-4 bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <h4 className="text-sm font-semibold text-white mb-3">Resumen de Pago</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Precio original</span>
            <span className="text-sm font-medium text-zinc-300">
              {formatPrice(precioBase, useCharmRounding)}
            </span>
          </div>
          {tienePrecioNegociado && precioNegociadoNormalizado !== null && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Precio negociado</span>
                <span className="text-sm font-medium text-blue-400">
                  {formatPrice(precioNegociadoNormalizado, useCharmRounding)}
                </span>
              </div>
              {ahorroTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Ahorro total</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {formatPrice(ahorroTotal, useCharmRounding)}
                  </span>
                </div>
              )}
            </>
          )}
          {descuentoCondicion > 0 && !tienePrecioNegociado && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Descuento</span>
              <span className="text-sm font-medium text-red-400">
                -{descuentoCondicion}%
              </span>
            </div>
          )}
          {cortesias > 0 && !tienePrecioNegociado && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Cortesías</span>
                <span className="text-sm font-medium text-emerald-400">
                -{formatPrice(cortesias, useCharmRounding)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
            <span className="text-sm font-semibold text-white">Total a pagar</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatPrice(precioFinalAPagar, useCharmRounding)}
            </span>
          </div>
          {anticipo > 0 && (
            <>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-zinc-400">
                  {advanceType === 'fixed_amount'
                    ? 'Anticipo'
                    : `Anticipo (${anticipoPorcentaje ?? 0}%)`}
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {formatPrice(anticipo, useCharmRounding)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">
                  Diferido
                  {diferido > 0 && (
                    <span className="text-xs text-zinc-500 ml-1">
                      (a liquidar 2 días antes del evento)
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-zinc-300">
                  {formatPrice(diferido, useCharmRounding)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

PrecioDesglose.displayName = 'PrecioDesglose';
