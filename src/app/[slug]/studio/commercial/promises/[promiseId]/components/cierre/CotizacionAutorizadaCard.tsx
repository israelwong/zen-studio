'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, FileText, Calendar, DollarSign, Loader2, Eye } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
} from '@/components/ui/zen';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getCondicionesComerciales, getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import { ContractPreviewForPromiseModal } from '../contratos/ContractPreviewForPromiseModal';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { formatNumber } from '@/lib/actions/utils/formatting';

interface CotizacionAutorizadaCardProps {
  cotizacion: CotizacionListItem;
  eventoId: string;
  studioSlug: string;
}

export function CotizacionAutorizadaCard({
  cotizacion,
  eventoId,
  studioSlug,
}: CotizacionAutorizadaCardProps) {
  const router = useRouter();
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContractPreview, setShowContractPreview] = useState(false);
  
  useEffect(() => {
    const loadResumen = async () => {
      setLoading(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventoId);
        if (result.success && result.data) {
          setResumen(result.data);
          // Debug: verificar datos del contrato
          console.log('[CotizacionAutorizadaCard] Resumen cargado:', {
            hasCotizacion: !!result.data.cotizacion,
            contract_content_snapshot: result.data.cotizacion?.contract_content_snapshot ? 'EXISTS' : 'NULL',
            contract_template_id_snapshot: result.data.cotizacion?.contract_template_id_snapshot,
            contract_template_name_snapshot: result.data.cotizacion?.contract_template_name_snapshot,
          });
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoading(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventoId]);

  // Usar datos del resumen (con snapshots inmutables) si están disponibles
  const cotizacionData = resumen?.cotizacion || cotizacion;
  const condiciones = resumen?.cotizacion 
    ? getCondicionesComerciales(resumen.cotizacion)
    : getCondicionesComerciales(cotizacionData);
  const contrato = resumen?.cotizacion
    ? getContrato(resumen.cotizacion)
    : getContrato(cotizacionData);
  
  // Debug: verificar contrato obtenido
  useEffect(() => {
    if (resumen?.cotizacion) {
      console.log('[CotizacionAutorizadaCard] Contrato obtenido:', {
        contrato,
        hasContent: !!contrato?.content,
        cotizacionSnapshots: {
          contract_content_snapshot: resumen.cotizacion.contract_content_snapshot ? 'EXISTS' : 'NULL',
          contract_template_id_snapshot: resumen.cotizacion.contract_template_id_snapshot,
          contract_template_name_snapshot: resumen.cotizacion.contract_template_name_snapshot,
        }
      });
    }
  }, [contrato, resumen]);
  
  // Calcular totales
  const subtotal = cotizacionData.price;
  const descuento = condiciones?.discount_percentage 
    ? subtotal * (condiciones.discount_percentage / 100)
    : (cotizacionData.discount || 0);
  const total = subtotal - descuento;
  
  // Información del pago inicial
  const pagoInicial = resumen?.montoInicial || null;
  const hayPagoInicial = pagoInicial && pagoInicial > 0;
  const primerPago = resumen?.pagos?.[0];

  if (loading) {
    return (
      <ZenCard className="h-full flex flex-col">
        <ZenCardContent className="p-6 flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <>
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <ZenCardTitle className="text-sm">Cotización Autorizada</ZenCardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evento creado exitosamente
              </p>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 flex flex-col overflow-y-auto">
          <div className="space-y-4">
            {/* Nombre de la cotización */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">
                {cotizacionData.name}
              </h3>
            </div>

            {/* Desglose de Cotización */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                Desglose de Cotización
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Subtotal:</dt>
                  <dd className="text-zinc-300">
                    ${formatNumber(subtotal, 2)} MXN
                  </dd>
                </div>
                
                {condiciones && (
                  <>
                    {condiciones.name && (
                      <div className="flex justify-between pt-2 border-t border-zinc-700/50">
                        <dt className="text-zinc-400">Condiciones comerciales:</dt>
                        <dd className="text-zinc-300">{condiciones.name}</dd>
                      </div>
                    )}
                    {condiciones.description && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {condiciones.description}
                      </div>
                    )}
                    {condiciones.advance_percentage && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-400">Anticipo:</dt>
                        <dd className="text-blue-400">
                          {condiciones.advance_percentage}%
                          {condiciones.advance_amount && (
                            <span className="text-zinc-500 ml-1">
                              (${formatNumber(condiciones.advance_amount, 2)})
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                    {condiciones.discount_percentage && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-400">Descuento:</dt>
                        <dd className="text-emerald-400">
                          {condiciones.discount_percentage}%
                          <span className="text-zinc-500 ml-1">
                            (-${formatNumber(descuento, 2)})
                          </span>
                        </dd>
                      </div>
                    )}
                  </>
                )}
                
                {descuento > 0 && !condiciones?.discount_percentage && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Descuento:</dt>
                    <dd className="text-emerald-400">
                      -${formatNumber(descuento, 2)}
                    </dd>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-zinc-700/50 font-semibold">
                  <dt className="text-zinc-300">Total:</dt>
                  <dd className="text-white">
                    ${formatNumber(total, 2)} MXN
                  </dd>
                </div>
              </dl>
            </div>

            {/* Pago Inicial */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Pago Inicial
                </h3>
              </div>
              {hayPagoInicial && primerPago ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Monto:</span>
                    <span className="text-emerald-400 font-semibold">
                      ${formatNumber(pagoInicial, 2)} MXN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Concepto:</span>
                    <span className="text-zinc-300">{primerPago.concept}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Método:</span>
                    <span className="text-zinc-500">{primerPago.metodo_pago}</span>
                  </div>
                  {primerPago.payment_date && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Fecha:</span>
                      <span className="text-zinc-500">
                        {new Date(primerPago.payment_date).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Promesa de pago
                </p>
              )}
            </div>

            {/* Contrato - Solo mostrar si hay contrato inmutable del resumen */}
            {contrato && contrato.content ? (
              <div 
                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => setShowContractPreview(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-300">
                        {contrato.template_name || 'Contrato'}
                      </h3>
                      {contrato.signed_at ? (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Firmado el {new Date(contrato.signed_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Versión {contrato.version || 1}
                        </p>
                      )}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            ) : resumen?.cotizacion?.contract_content_snapshot ? (
              // Fallback: mostrar contrato directamente desde el resumen si getContrato no lo detectó
              <div 
                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => setShowContractPreview(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-300">
                        {resumen.cotizacion.contract_template_name_snapshot || 'Contrato'}
                      </h3>
                      {resumen.cotizacion.contract_signed_at_snapshot ? (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Firmado el {new Date(resumen.cotizacion.contract_signed_at_snapshot).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Versión {resumen.cotizacion.contract_version_snapshot || 1}
                        </p>
                      )}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            ) : null}

            {/* Fecha de creación del evento */}
            {resumen?.evento?.created_at && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Evento creado el {new Date(resumen.evento.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* Botón para ir al evento */}
            <ZenButton
              variant="primary"
              onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
              className="w-full mt-4"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Gestionar Evento
            </ZenButton>

            <p className="text-xs text-zinc-500 text-center">
              Este evento ya fue creado y está en gestión
            </p>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal de previsualización de contrato */}
      {showContractPreview && (contrato?.content || resumen?.cotizacion?.contract_content_snapshot) && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={() => setShowContractPreview(false)}
          onEdit={() => {}}
          studioSlug={studioSlug}
          promiseId={cotizacion.promise_id || ''}
          cotizacionId={cotizacion.id}
          eventId={eventoId} // Pasar eventId para usar getEventContractData con snapshots inmutables
          template={{
            id: contrato?.template_id || resumen?.cotizacion?.contract_template_id_snapshot || '',
            name: contrato?.template_name || resumen?.cotizacion?.contract_template_name_snapshot || 'Contrato',
            content: contrato?.content || resumen?.cotizacion?.contract_content_snapshot || '',
            studio_id: '',
            created_at: new Date(),
            updated_at: new Date(),
          }}
          customContent={contrato?.content || resumen?.cotizacion?.contract_content_snapshot || null}
          condicionesComerciales={condiciones ? {
            id: '',
            name: condiciones.name || '',
            description: condiciones.description || null,
            discount_percentage: condiciones.discount_percentage || null,
            advance_percentage: condiciones.advance_percentage || null,
            advance_type: condiciones.advance_type || null,
            advance_amount: condiciones.advance_amount || null,
          } : undefined}
          isContractSigned={!!(contrato?.signed_at || resumen?.cotizacion?.contract_signed_at_snapshot)}
        />
      )}
    </>
  );
}
