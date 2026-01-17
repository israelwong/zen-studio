'use client';

import React, { useMemo, useEffect } from 'react';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';
import { calcularPrecioNegociado } from '@/lib/utils/negociacion-calc';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';

interface CalculoConCondicionesProps {
  cotizacionOriginal: CotizacionCompleta;
  condicionComercial: CondicionComercial | CondicionComercialTemporal | null;
  configuracionPrecios: ConfiguracionPrecios | null;
  onTotalAPagarCalculado?: (totalAPagar: number | null) => void;
}

export function CalculoConCondiciones({
  cotizacionOriginal,
  condicionComercial,
  configuracionPrecios,
  onTotalAPagarCalculado,
}: CalculoConCondicionesProps) {

  // Calcular precio con condición comercial (sin cortesías ni precio personalizado)
  const calculoConCondicion = useMemo(() => {
    if (!configuracionPrecios || !condicionComercial) {
      return null;
    }

    return calcularPrecioNegociado({
      cotizacionOriginal,
      precioPersonalizado: null, // Sin precio personalizado
      descuentoAdicional: null, // Sin descuento adicional
      condicionComercial,
      itemsCortesia: new Set(), // Sin cortesías
      configPrecios: configuracionPrecios,
    });
  }, [cotizacionOriginal, condicionComercial, configuracionPrecios]);


  // Verificar si hay precio negociado guardado (modo negociación)
  const precioNegociadoGuardado = cotizacionOriginal.negociacion_precio_personalizado ?? null;
  const precioOriginalNegociacion = cotizacionOriginal.negociacion_precio_original ?? null;
  const tienePrecioNegociado = precioNegociadoGuardado !== null && precioNegociadoGuardado > 0;

  // Precio base para el desglose:
  // - Si hay precio negociado guardado: usar precio original de negociación como precio base
  // - Si no hay precio negociado: usar el precio original de la cotización (antes de aplicar condiciones comerciales)
  const precioBaseParaDesglose = tienePrecioNegociado && precioOriginalNegociacion !== null
    ? precioOriginalNegociacion
    : (cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price);

  // Convertir condición comercial a formato compatible con CondicionesComercialesDesglose
  const condicionParaResumen = condicionComercial ? {
    id: condicionComercial.id || '',
    name: condicionComercial.name,
    description: condicionComercial.description ?? null,
    discount_percentage: condicionComercial.discount_percentage ?? null,
    advance_type: condicionComercial.advance_type || 'percentage',
    advance_percentage: condicionComercial.advance_percentage ?? null,
    advance_amount: condicionComercial.advance_amount ?? null,
  } : null;

  // Calcular "Total a pagar" del desglose (igual que se muestra en CondicionesComercialesDesglose)
  const totalAPagar = useMemo(() => {
    if (!condicionComercial || !condicionParaResumen) {
      return null;
    }

    // Si hay precio negociado guardado, el total a pagar es el precio negociado
    if (tienePrecioNegociado && precioNegociadoGuardado !== null) {
      return precioNegociadoGuardado;
    }

    // Calcular igual que el desglose: precioBase - descuento
    const descuentoMonto = condicionParaResumen.discount_percentage
      ? precioBaseParaDesglose * (condicionParaResumen.discount_percentage / 100)
      : 0;
    const subtotal = precioBaseParaDesglose - descuentoMonto;
    return subtotal;
  }, [condicionComercial, condicionParaResumen, precioBaseParaDesglose, tienePrecioNegociado, precioNegociadoGuardado]);

  // Notificar al padre el total a pagar calculado
  useEffect(() => {
    if (onTotalAPagarCalculado) {
      onTotalAPagarCalculado(totalAPagar);
    }
  }, [totalAPagar, onTotalAPagarCalculado]);

  if (!condicionComercial || !condicionParaResumen) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Pago con condiciones comerciales aplicadas */}
      <CondicionesComercialesDesglose
        precioBase={precioBaseParaDesglose}
        condicion={condicionParaResumen}
        negociacionPrecioOriginal={tienePrecioNegociado ? precioOriginalNegociacion : null}
        negociacionPrecioPersonalizado={precioNegociadoGuardado}
      />
    </div>
  );
}
