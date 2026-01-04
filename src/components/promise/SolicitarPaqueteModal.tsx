'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { PublicPromiseDataForm } from '@/components/shared/promise/PublicPromiseDataForm';
import type { PublicPaquete } from '@/types/public-promise';
import { toast } from 'sonner';
import { solicitarPaquetePublico } from '@/lib/actions/public/paquetes.actions';
import { updatePublicPromiseData } from '@/lib/actions/public/promesas.actions';
import { getTotalServicios } from '@/lib/utils/public-promise';

interface PrecioCalculado {
  precioBase: number;
  descuentoCondicion: number;
  precioConDescuento: number;
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipoMontoFijo: number | null;
  anticipo: number;
  diferido: number;
}

interface SolicitarPaqueteModalProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComercialesId?: string | null;
  condicionesComercialesMetodoPagoId?: string | null;
  precioCalculado?: PrecioCalculado | null;
  showPackages?: boolean;
  onSuccess?: () => void;
}

export function SolicitarPaqueteModal({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComercialesId,
  condicionesComercialesMetodoPagoId,
  precioCalculado,
  showPackages = false,
  onSuccess,
}: SolicitarPaqueteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmitForm = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
    setIsSubmitting(true);

    try {
      // 1. Actualizar datos de la promesa
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      if (!updateResult.success) {
        toast.error('Error al actualizar datos', {
          description: updateResult.error || 'Por favor, intenta de nuevo.',
        });
        setIsSubmitting(false);
        return;
      }

      // 2. Solicitar paquete (crea cotización y pasa a en_cierre)
      const result = await solicitarPaquetePublico(
        promiseId,
        paquete.id,
        studioSlug,
        condicionesComercialesId,
        condicionesComercialesMetodoPagoId
      );

      if (!result.success) {
        toast.error('Error al enviar solicitud', {
          description: result.error || 'Por favor, intenta de nuevo o contacta al estudio.',
        });
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar solicitud', {
        description: 'Por favor, intenta de nuevo o contacta al estudio.',
      });
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };


  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && !showSuccessModal && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Paquete</DialogTitle>
            <DialogDescription>
              Confirma que deseas solicitar este paquete. Completa tus datos para continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen de paquete */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
              <h4 className="font-semibold text-white mb-3">{paquete.name}</h4>

              {precioCalculado ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Precio base</span>
                    <span className="text-sm font-medium text-zinc-300">
                      {formatPrice(precioCalculado.precioBase)}
                    </span>
                  </div>
                  {precioCalculado.descuentoCondicion > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Descuento adicional</span>
                      <span className="text-sm font-medium text-red-400">
                        -{precioCalculado.descuentoCondicion}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                    <span className="text-sm font-semibold text-white">Total a pagar</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {formatPrice(precioCalculado.precioConDescuento)}
                    </span>
                  </div>
                  {precioCalculado.anticipo > 0 && (
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          {precioCalculado.advanceType === 'fixed_amount'
                            ? 'Anticipo'
                            : `Anticipo (${precioCalculado.anticipoPorcentaje ?? 0}%)`}
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {formatPrice(precioCalculado.anticipo)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">Diferido</span>
                        <span className="text-sm font-medium text-zinc-300">
                          {formatPrice(precioCalculado.diferido)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
                    Incluye {getTotalServicios(paquete.servicios)} servicio
                    {getTotalServicios(paquete.servicios) !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatPrice(paquete.price)}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Incluye {getTotalServicios(paquete.servicios)} servicio
                    {getTotalServicios(paquete.servicios) !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>

            {/* Formulario de datos usando componente compartido */}
            <PublicPromiseDataForm
              promiseId={promiseId}
              studioSlug={studioSlug}
              onSubmit={handleSubmitForm}
              isSubmitting={isSubmitting}
              showEventTypeAndDate={true}
            />

            {/* Información importante */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Al confirmar la solicitud del paquete iniciarás el proceso de contratación.
              </p>
            </div>

            {/* Botones */}
            {!(isSubmitting && showPackages) && (
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {!isSubmitting && (
                  <ZenButton
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </ZenButton>
                )}
                <ZenButton
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar Solicitud
                    </>
                  )}
                </ZenButton>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent className="sm:max-w-md" overlayZIndex={10060}>
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-center">Solicitud Enviada</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center text-zinc-300 leading-relaxed">
              Tu solicitud ha sido enviada exitosamente. Se ha creado una cotización y el estudio la revisará y se pondrá en contacto contigo pronto.
            </p>
          </div>

          <div className="flex justify-center">
            <ZenButton onClick={handleCloseSuccess} className="min-w-[120px]">
              Entendido
            </ZenButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
