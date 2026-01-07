'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenDialog,
} from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { ResumenCotizacionAutorizada, type CotizacionItem as ResumenCotizacionItem } from './ResumenCotizacionAutorizada';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

// Tipo extendido con items y relaciones
type CotizacionAprobada = NonNullable<EventoDetalle['cotizaciones']>[number];

interface EventCotizacionesCardProps {
  studioSlug: string;
  eventId: string;
  promiseId?: string | null;
  cotizaciones?: EventoDetalle['cotizaciones'];
  eventData?: EventoDetalle;
  onUpdated?: () => void;
}


export function EventCotizacionesCard({
  studioSlug,
  eventId,
  promiseId,
  cotizaciones,
  eventData,
  onUpdated,
}: EventCotizacionesCardProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount: number;
    status: string;
    cotizacion_items: ResumenCotizacionItem[];
  } | null>(null);
  const [resumen, setResumen] = useState<any>(null);

  // Obtener la primera cotización aprobada
  const cotizacionAprobada = (cotizaciones || []).find(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  ) as CotizacionAprobada | undefined;

  // Cargar resumen del evento para obtener la descripción
  useEffect(() => {
    const loadResumen = async () => {
      if (!cotizacionAprobada) return;
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      }
    };
    loadResumen();
  }, [studioSlug, eventId, cotizacionAprobada?.id]);

  // Obtener descripción desde resumen
  const cotizacionConDescripcion = useMemo(() => {
    if (!cotizacionAprobada) return null;
    const descripcion = resumen?.cotizacion?.description || null;
    return {
      ...cotizacionAprobada,
      description: descripcion,
    };
  }, [cotizacionAprobada, resumen]);

  // Calcular resumen financiero usando snapshots
  const resumenFinanciero = useMemo(() => {
    if (!cotizacionAprobada) return null;

    const precioBase = cotizacionAprobada.price || 0;

    // Usar snapshots de condiciones comerciales (inmutables)
    const condicionSnapshot = {
      advance_percentage: cotizacionAprobada.condiciones_comerciales_advance_percentage_snapshot != null
        ? Number(cotizacionAprobada.condiciones_comerciales_advance_percentage_snapshot)
        : null,
      advance_type: cotizacionAprobada.condiciones_comerciales_advance_type_snapshot,
      advance_amount: cotizacionAprobada.condiciones_comerciales_advance_amount_snapshot != null
        ? Number(cotizacionAprobada.condiciones_comerciales_advance_amount_snapshot)
        : null,
      discount_percentage: cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot != null
        ? Number(cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot)
        : null,
    };

    // Calcular descuento
    const descuentoMonto = condicionSnapshot.discount_percentage
      ? precioBase * (condicionSnapshot.discount_percentage / 100)
      : 0;

    const subtotal = precioBase - descuentoMonto;

    // Calcular anticipo
    let anticipoMonto = 0;
    if (condicionSnapshot.advance_type === 'fixed_amount' && condicionSnapshot.advance_amount) {
      anticipoMonto = Number(condicionSnapshot.advance_amount);
    } else if (condicionSnapshot.advance_type === 'percentage' && condicionSnapshot.advance_percentage) {
      anticipoMonto = subtotal * (condicionSnapshot.advance_percentage / 100);
    }

    const diferido = subtotal - anticipoMonto;
    const total = subtotal;

    return {
      precioBase,
      descuentoMonto,
      subtotal,
      anticipoMonto,
      diferido,
      total,
      condicionSnapshot,
    };
  }, [cotizacionAprobada]);

  const handlePreview = async () => {
    if (!cotizacionAprobada) return;

    setLoadingCotizacion(true);
    setShowViewModal(true);
    try {
      const result = await getCotizacionById(cotizacionAprobada.id, studioSlug);
      if (result.success && result.data) {
        // Calcular descuento desde snapshots
        const discountPercentage = cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot != null
          ? Number(cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot)
          : null;
        const discount = discountPercentage
          ? result.data.price * (discountPercentage / 100)
          : 0;

        // Convertir al formato esperado por ResumenCotizacionAutorizada
        const cotizacionFormateada = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          discount,
          status: result.data.status,
          cotizacion_items: result.data.items.map((item: any) => ({
            id: item.id,
            item_id: item.item_id,
            quantity: item.quantity,
            name: item.name_snapshot || item.name,
            description: item.description_snapshot || item.description,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            cost: item.cost,
            cost_snapshot: item.cost,
            profit_type: null,
            profit_type_snapshot: null,
            task_type: null,
            assigned_to_crew_member_id: null,
            scheduler_task_id: null,
            assignment_date: null,
            delivery_date: null,
            internal_delivery_days: null,
            client_delivery_days: null,
            status: 'active',
            seccion_name: item.seccion_name_snapshot || item.seccion_name,
            category_name: item.category_name_snapshot || item.category_name,
            seccion_name_snapshot: item.seccion_name_snapshot,
            category_name_snapshot: item.category_name_snapshot,
          })),
        };
        setCotizacionCompleta(cotizacionFormateada);
      } else {
        toast.error(result.error || 'Error al cargar la cotización');
        setShowViewModal(false);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      toast.error('Error al cargar la cotización');
      setShowViewModal(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Cotización
            </ZenCardTitle>
            {cotizacionAprobada && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {cotizacionConDescripcion && resumenFinanciero ? (
            <div className="space-y-4">
              {/* Nombre y descripción */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-zinc-200">{cotizacionConDescripcion.name}</p>
                </div>
                {cotizacionConDescripcion.description && (
                  <div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{cotizacionConDescripcion.description}</p>
                  </div>
                )}
              </div>

              {/* Resumen financiero */}
              <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
                {/* Precio */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Precio:</span>
                  <span className="text-zinc-200 font-medium">{formatearMoneda(resumenFinanciero.precioBase)}</span>
                </div>

                {/* Descuento */}
                {resumenFinanciero.descuentoMonto > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">
                      Descuento {resumenFinanciero.condicionSnapshot.discount_percentage ? `(${resumenFinanciero.condicionSnapshot.discount_percentage}%)` : ''}:
                    </span>
                    <span className="text-red-400 font-medium">-{formatearMoneda(resumenFinanciero.descuentoMonto)}</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-zinc-400">Subtotal:</span>
                  <span className="text-zinc-200 font-medium">{formatearMoneda(resumenFinanciero.subtotal)}</span>
                </div>

                {/* Anticipo */}
                {resumenFinanciero.anticipoMonto > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">
                      Anticipo {resumenFinanciero.condicionSnapshot.advance_percentage ? `(${resumenFinanciero.condicionSnapshot.advance_percentage}%)` : ''}:
                    </span>
                    <span className="text-blue-400 font-medium">{formatearMoneda(resumenFinanciero.anticipoMonto)}</span>
                  </div>
                )}

                {/* Diferido */}
                {resumenFinanciero.anticipoMonto > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Diferido:</span>
                    <span className="text-zinc-300 font-medium">{formatearMoneda(resumenFinanciero.diferido)}</span>
                  </div>
                )}

                {/* Total a pagar */}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800 font-semibold">
                  <span className="text-zinc-200">Total a pagar:</span>
                  <span className="text-emerald-400 text-sm">{formatearMoneda(resumenFinanciero.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500">
                No hay cotización autorizada
              </p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal Preview Cotización */}
      <ZenDialog
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setCotizacionCompleta(null);
        }}
        title={`Cotización: ${cotizacionAprobada?.name || ''}`}
        description="Vista previa completa de la cotización con desglose y condiciones comerciales"
        maxWidth="4xl"
        onCancel={() => {
          setShowViewModal(false);
          setCotizacionCompleta(null);
        }}
        cancelLabel="Cerrar"
        zIndex={10070}
      >
        {loadingCotizacion ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : cotizacionCompleta ? (
          cotizacionCompleta.cotizacion_items && cotizacionCompleta.cotizacion_items.length > 0 ? (
            <ResumenCotizacionAutorizada
              cotizacion={cotizacionCompleta}
              studioSlug={studioSlug}
              promiseId={cotizacionAprobada?.promise_id || undefined}
            />
          ) : (
            <ResumenCotizacion
              cotizacion={{
                id: cotizacionCompleta.id,
                name: cotizacionCompleta.name,
                description: cotizacionCompleta.description,
                price: cotizacionCompleta.price,
                status: cotizacionCompleta.status,
                items: [],
              }}
              studioSlug={studioSlug}
              promiseId={cotizacionAprobada?.promise_id || undefined}
            />
          )
        ) : null}
      </ZenDialog>
    </>
  );
}
