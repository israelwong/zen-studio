'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { loadCotizacionParaNegociacion } from '@/lib/actions/studio/commercial/promises/negociacion.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { toast } from 'sonner';
import { NegociacionHeader } from './components/NegociacionHeader';
import { NegociacionItemsTree } from './components/NegociacionItemsTree';
import { CalculoConCondiciones } from './components/CalculoConCondiciones';
import { ComparacionView } from './components/ComparacionView';
import { SelectorCondicionesComerciales } from './components/SelectorCondicionesComerciales';
import { PrecioSimulador } from './components/PrecioSimulador';
import { ImpactoUtilidad } from './components/ImpactoUtilidad';
import { FinalizarNegociacion } from './components/FinalizarNegociacion';
import { NegociacionSkeleton } from './components/NegociacionSkeleton';
import {
  calcularPrecioNegociado,
  validarMargenNegociado,
} from '@/lib/utils/negociacion-calc';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';

export interface NegociacionState {
  precioPersonalizado: number | null;
  descuentoAdicional: number | null;
  condicionComercialId: string | null;
  condicionComercialTemporal: CondicionComercialTemporal | null;
  itemsCortesia: Set<string>;
  notas: string;
}

export default function NegociacionPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;

  const [cotizacionOriginal, setCotizacionOriginal] =
    useState<CotizacionCompleta | null>(null);
  const [configPrecios, setConfigPrecios] =
    useState<ConfiguracionPrecios | null>(null);
  const [condicionesComerciales, setCondicionesComerciales] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      discount_percentage: number | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      metodo_pago_id: string | null;
    }>
  >([]);
  const [condicionComercialCompleta, setCondicionComercialCompleta] = useState<
    CondicionComercial | CondicionComercialTemporal | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [negociacionState, setNegociacionState] = useState<NegociacionState>({
    precioPersonalizado: null,
    descuentoAdicional: null,
    condicionComercialId: null,
    condicionComercialTemporal: null,
    itemsCortesia: new Set(),
    notas: '',
  });
  const [totalAPagarCondiciones, setTotalAPagarCondiciones] = useState<number | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar cotizaciรณn
        const cotizacionResult = await loadCotizacionParaNegociacion(
          cotizacionId,
          studioSlug
        );

        if (!cotizacionResult.success || !cotizacionResult.data) {
          toast.error(
            cotizacionResult.error || 'Error al cargar cotizaciรณn'
          );
          router.back();
          return;
        }

        setCotizacionOriginal(cotizacionResult.data);

        // Si la cotización ya está en negociación, inicializar el estado con los valores guardados
        if (cotizacionResult.data.status === 'negociacion') {
          const cotizacion = cotizacionResult.data;
          
          // Identificar items marcados como cortesía
          const itemsCortesia = new Set<string>();
          cotizacion.items.forEach((item) => {
            if (item.is_courtesy) {
              itemsCortesia.add(item.id);
            }
          });

          // Inicializar estado con valores guardados
          setNegociacionState({
            precioPersonalizado: cotizacion.negociacion_precio_personalizado ?? null,
            descuentoAdicional: cotizacion.negociacion_descuento_adicional ?? null,
            condicionComercialId: cotizacion.condiciones_comerciales_id ?? null,
            condicionComercialTemporal: cotizacion.condicion_comercial_temporal ?? null,
            itemsCortesia,
            notas: cotizacion.negociacion_notas || '',
          });

          // Si hay condición comercial temporal, establecerla como completa
          if (cotizacion.condicion_comercial_temporal) {
            setCondicionComercialCompleta(cotizacion.condicion_comercial_temporal);
          }
        }

        // Cargar configuraciรณn de precios
        try {
          const configData = await obtenerConfiguracionPrecios(studioSlug);
          if (configData) {
            setConfigPrecios({
              utilidad_servicio: parseFloat(
                configData.utilidad_servicio || '0.30'
              ),
              utilidad_producto: parseFloat(
                configData.utilidad_producto || '0.20'
              ),
              comision_venta: parseFloat(
                configData.comision_venta || '0.10'
              ),
              sobreprecio: parseFloat(configData.sobreprecio || '0.05'),
            });
          } else {
            // Usar valores por defecto si no hay configuraciรณn
            setConfigPrecios({
              utilidad_servicio: 0.30,
              utilidad_producto: 0.20,
              comision_venta: 0.10,
              sobreprecio: 0.05,
            });
          }
        } catch (configError) {
          console.error('[NEGOCIACION] Error cargando configuraciรณn:', configError);
          // Usar valores por defecto en caso de error
          setConfigPrecios({
            utilidad_servicio: 0.30,
            utilidad_producto: 0.20,
            comision_venta: 0.10,
            sobreprecio: 0.05,
          });
        }
      } catch (error) {
        console.error('[NEGOCIACION] Error cargando datos:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al cargar datos de negociaciรณn';
        toast.error(errorMessage);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, router]);

  // Calcular precio negociado en tiempo real
  const calculoNegociado = useMemo(() => {
    if (!cotizacionOriginal || !configPrecios) return null;

    const tieneCambios =
      negociacionState.itemsCortesia.size > 0 ||
      negociacionState.precioPersonalizado !== null ||
      negociacionState.descuentoAdicional !== null ||
      negociacionState.condicionComercialId !== null ||
      negociacionState.condicionComercialTemporal !== null;

    if (!tieneCambios) return null;

    try {
      let condicionComercial: CondicionComercial | CondicionComercialTemporal | null = null;

      if (negociacionState.condicionComercialId) {
        const condicion = condicionesComerciales.find(
          (c) => c.id === negociacionState.condicionComercialId
        );
        if (condicion) {
          condicionComercial = {
            id: condicion.id,
            name: condicion.name,
            description: condicion.description,
            discount_percentage: condicion.discount_percentage,
            advance_percentage: condicion.advance_percentage,
            advance_type: condicion.advance_type,
            advance_amount: condicion.advance_amount,
            metodo_pago_id: condicion.metodo_pago_id,
          };
        }
      } else if (negociacionState.condicionComercialTemporal) {
        condicionComercial = negociacionState.condicionComercialTemporal;
      }

      // Calcular "Cálculo de items seleccionados" (Total a pagar - cortesías)
      const montoItemsCortesia = cotizacionOriginal.items.reduce((sum, item) => {
        if (negociacionState.itemsCortesia.has(item.id)) {
          return sum + (item.unit_price || 0) * item.quantity;
        }
        return sum;
      }, 0);
      
      const precioReferencia = totalAPagarCondiciones ?? (cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price);
      const calculoItemsSeleccionados = precioReferencia - montoItemsCortesia;

      // PRIORIDAD: Si hay precio personalizado, usar ese precio directamente
      // Si no hay precio personalizado, usar el "Cálculo de items seleccionados"
      const precioPersonalizadoNum = typeof negociacionState.precioPersonalizado === 'number' 
        ? negociacionState.precioPersonalizado 
        : parseFloat(String(negociacionState.precioPersonalizado || 0));
      
      // Usar precio personalizado si existe, sino usar calculoItemsSeleccionados
      const precioParaCalcular = (!isNaN(precioPersonalizadoNum) && precioPersonalizadoNum > 0) 
        ? precioPersonalizadoNum 
        : calculoItemsSeleccionados;
      
      if (precioParaCalcular > 0) {
        const costoTotal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + (item.cost || 0) * item.quantity,
          0
        );
        const gastoTotal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + (item.expense || 0) * item.quantity,
          0
        );
        const utilidadNeta = precioParaCalcular - costoTotal - gastoTotal;
        const margenPorcentaje =
          precioParaCalcular > 0
            ? (utilidadNeta / precioParaCalcular) * 100
            : 0;

        const costoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.cost ?? 0) * item.quantity),
          0
        );
        const gastoTotalOriginal = cotizacionOriginal.items.reduce(
          (sum, item) => sum + ((item.expense ?? 0) * item.quantity),
          0
        );
        const precioOriginal = cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price;
        const utilidadNetaOriginal = precioOriginal - costoTotalOriginal - gastoTotalOriginal;
        const impactoUtilidad = utilidadNeta - utilidadNetaOriginal;

        return {
          precioFinal: Number(precioParaCalcular.toFixed(2)),
          precioBase: Number(precioParaCalcular.toFixed(2)),
          descuentoTotal: 0,
          costoTotal: Number(costoTotal.toFixed(2)),
          gastoTotal: Number(gastoTotal.toFixed(2)),
          utilidadNeta: Number(utilidadNeta.toFixed(2)),
          margenPorcentaje: Number(margenPorcentaje.toFixed(2)),
          impactoUtilidad: Number(impactoUtilidad.toFixed(2)),
          items: cotizacionOriginal.items.map((item) => ({
            id: item.id,
            precioOriginal: (item.unit_price || 0) * item.quantity,
            precioNegociado: negociacionState.itemsCortesia.has(item.id)
              ? 0
              : (item.unit_price || 0) * item.quantity,
            isCortesia: negociacionState.itemsCortesia.has(item.id),
          })),
        };
      }

      return calcularPrecioNegociado({
        cotizacionOriginal,
        precioPersonalizado: null,
        descuentoAdicional: negociacionState.descuentoAdicional,
        condicionComercial,
        itemsCortesia: negociacionState.itemsCortesia,
        configPrecios,
      });
    } catch (error) {
      console.error('[NEGOCIACION] Error calculando precio:', error);
      return null;
    }
  }, [
    cotizacionOriginal,
    configPrecios,
    negociacionState,
    condicionesComerciales,
    totalAPagarCondiciones,
  ]);

  // Validaciรณn de margen
  const validacionMargen = useMemo(() => {
    if (!calculoNegociado) return null;

    return validarMargenNegociado(
      calculoNegociado.margenPorcentaje,
      calculoNegociado.precioFinal,
      calculoNegociado.costoTotal,
      calculoNegociado.gastoTotal
    );
  }, [calculoNegociado]);

  if (loading) {
    return <NegociacionSkeleton />;
  }

  if (!cotizacionOriginal || !configPrecios) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <ZenCard>
          <ZenCardContent className="py-12">
            <p className="text-red-400 text-center">
              Error al cargar datos de negociaciรณn
            </p>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <NegociacionHeader
        cotizacion={cotizacionOriginal}
        onBack={() => router.back()}
      />

      {/* Layout de 2 columnas: Items Tree y otros componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Items con estructura anidada */}
        <NegociacionItemsTree
          items={cotizacionOriginal.items}
          itemsCortesia={negociacionState.itemsCortesia}
          onItemsChange={(items) =>
            setNegociacionState((prev) => ({
              ...prev,
              itemsCortesia: items,
            }))
          }
        />

        {/* Columna 2: Condiciones y Cálculos */}
        <div className="space-y-6">
          {/* 1. Precio cotización original */}
          <ComparacionView
            original={{
              precioFinal: cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price, // Usar precio original si existe
              costoTotal:
                calculoNegociado?.costoTotal ??
                cotizacionOriginal.items.reduce(
                  (sum, item) => sum + (item.cost || 0) * item.quantity,
                  0
                ),
              gastoTotal:
                calculoNegociado?.gastoTotal ??
                cotizacionOriginal.items.reduce(
                  (sum, item) => sum + (item.expense || 0) * item.quantity,
                  0
                ),
              utilidadNeta:
                (cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price) -
                (calculoNegociado?.costoTotal ??
                  cotizacionOriginal.items.reduce(
                    (sum, item) => sum + (item.cost || 0) * item.quantity,
                    0
                  )) -
                (calculoNegociado?.gastoTotal ??
                  cotizacionOriginal.items.reduce(
                    (sum, item) => sum + (item.expense || 0) * item.quantity,
                    0
                  )),
              margenPorcentaje: 0,
            }}
            negociada={calculoNegociado}
          />

          {/* 2. Selector de condiciones comerciales */}
          <SelectorCondicionesComerciales
            studioSlug={studioSlug}
            condicionSeleccionada={negociacionState.condicionComercialId}
            condicionTemporal={negociacionState.condicionComercialTemporal}
            onCondicionChange={(condicionId, condicionTemporal, condicionCompleta) => {
              setNegociacionState((prev) => ({
                ...prev,
                condicionComercialId: condicionId,
                condicionComercialTemporal: condicionTemporal,
              }));
              if (condicionTemporal) {
                setCondicionComercialCompleta(condicionTemporal);
              } else if (condicionCompleta) {
                setCondicionComercialCompleta(condicionCompleta);
              } else {
                setCondicionComercialCompleta(null);
              }
            }}
            onCondicionesLoaded={(condiciones) => {
              setCondicionesComerciales(condiciones);
            }}
          />

          {/* 3. Desglose de precio con condiciones comerciales aplicadas */}
          {(() => {
            return (
              <>
                <CalculoConCondiciones
                  cotizacionOriginal={cotizacionOriginal}
                  condicionComercial={condicionComercialCompleta}
                  configuracionPrecios={configPrecios}
                  onTotalAPagarCalculado={setTotalAPagarCondiciones}
                />

                {/* 4. Precio de Negociación con Desglose integrado */}
                <PrecioSimulador
                  cotizacion={cotizacionOriginal}
                  precioPersonalizado={negociacionState.precioPersonalizado}
                  onPrecioChange={(precio) =>
                    setNegociacionState((prev) => ({
                      ...prev,
                      precioPersonalizado: precio,
                    }))
                  }
                  validacionMargen={validacionMargen}
                  precioReferencia={totalAPagarCondiciones}
                  itemsCortesia={negociacionState.itemsCortesia}
                  showDesglose={true}
                />

                {/* 5. Impacto en utilidad */}
                {calculoNegociado && (() => {
                  const costoTotalOriginal = cotizacionOriginal.items.reduce(
                    (sum, item) => sum + ((item.cost ?? 0) * item.quantity),
                    0
                  );
                  const gastoTotalOriginal = cotizacionOriginal.items.reduce(
                    (sum, item) => sum + ((item.expense ?? 0) * item.quantity),
                    0
                  );
                  const precioOriginal = cotizacionOriginal.precioOriginal ?? cotizacionOriginal.price;
                  const utilidadNetaOriginal =
                    precioOriginal - costoTotalOriginal - gastoTotalOriginal;
                  const margenOriginal =
                    precioOriginal > 0
                      ? (utilidadNetaOriginal / precioOriginal) * 100
                      : 0;

                  return (
                    <ImpactoUtilidad
                      original={{
                        precioFinal: precioOriginal,
                        utilidadNeta: utilidadNetaOriginal,
                        margenPorcentaje: margenOriginal,
                      }}
                      negociada={calculoNegociado}
                      validacionMargen={validacionMargen}
                    />
                  );
                })()}

                {/* 6. Finalizar negociación */}
                <FinalizarNegociacion
                  negociacionState={negociacionState}
                  calculoNegociado={calculoNegociado}
                  validacionMargen={validacionMargen}
                  cotizacionOriginal={cotizacionOriginal}
                  onNotasChange={(notas) =>
                    setNegociacionState((prev) => ({ ...prev, notas }))
                  }
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                  cotizacionId={cotizacionId}
                />
              </>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
