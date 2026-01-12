'use client';

import React, { forwardRef } from 'react';

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
}

const formatPrice = (price: number) => {
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
    },
    ref
  ) => {
    // Si hay precio final negociado, ese es el precio a pagar (ya incluye todo)
    // Si no, calcular precio final incluyendo cortesías
    const precioFinalAPagar = precioFinalNegociado ?? (precioConDescuento - cortesias);
    const tienePrecioNegociado = precioFinalNegociado !== null && precioFinalNegociado !== undefined;

    const ahorroTotal = tienePrecioNegociado && precioFinalNegociado 
      ? precioBase - precioFinalNegociado 
      : 0;

    return (
      <div ref={ref} className="mt-4 bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <h4 className="text-sm font-semibold text-white mb-3">Resumen de Pago</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Precio original</span>
            <span className="text-sm font-medium text-zinc-300">
              {formatPrice(precioBase)}
            </span>
          </div>
          {tienePrecioNegociado && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Precio negociado</span>
                <span className="text-sm font-medium text-blue-400">
                  {formatPrice(precioFinalNegociado)}
                </span>
              </div>
              {ahorroTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Ahorro total</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {formatPrice(ahorroTotal)}
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
                -{formatPrice(cortesias)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
            <span className="text-sm font-semibold text-white">Total a pagar</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatPrice(precioFinalAPagar)}
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
                  {formatPrice(anticipo)}
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
                  {formatPrice(diferido)}
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
