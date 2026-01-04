'use client';

import React, { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import type { PublicPaquete } from '@/types/public-promise';
import { toast } from 'sonner';
import { solicitarPaquetePublico } from '@/lib/actions/public/paquetes.actions';
import { getPublicPromiseData, updatePublicPromiseData } from '@/lib/actions/public/promesas.actions';
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
  const [loadingPromiseData, setLoadingPromiseData] = useState(false);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    event_name: '',
    event_location: '',
    event_date: null as Date | null,
    event_type_name: null as string | null,
  });

  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos de la promesa cuando se abre el modal
  useEffect(() => {
    if (isOpen && promiseId) {
      loadPromiseData();
    }
  }, [isOpen, promiseId]);

  const loadPromiseData = async () => {
    setLoadingPromiseData(true);
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.promise) {
        const promise = result.data.promise;
        setFormData({
          contact_name: promise.contact_name || '',
          contact_phone: promise.contact_phone || '',
          contact_email: promise.contact_email || '',
          contact_address: promise.contact_address || '',
          event_name: promise.event_name || '',
          event_location: promise.event_location || '',
          event_date: promise.event_date ? new Date(promise.event_date) : null,
          event_type_name: promise.event_type_name || null,
        });
      }
    } catch (error) {
      console.error('[SolicitarPaqueteModal] Error loading promise data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoadingPromiseData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contact_name?.trim()) {
      newErrors.contact_name = 'El nombre es requerido';
    }

    if (!formData.contact_phone?.trim()) {
      newErrors.contact_phone = 'El teléfono es requerido';
    }

    if (!formData.contact_email?.trim()) {
      newErrors.contact_email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Correo electrónico inválido';
    }

    if (!formData.contact_address?.trim()) {
      newErrors.contact_address = 'La dirección es requerida';
    }

    if (!formData.event_name?.trim()) {
      newErrors.event_name = 'El nombre del evento es requerido';
    }

    if (!formData.event_location?.trim()) {
      newErrors.event_location = 'La locación del evento es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSolicitar = async () => {
    // Validar formulario
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Actualizar datos de la promesa
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        contact_address: formData.contact_address,
        event_name: formData.event_name,
        event_location: formData.event_location,
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
    } finally {
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

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getEventNameLabel = (eventTypeName: string | null): string => {
    if (!eventTypeName) return 'Nombre del evento';
    
    const eventTypeLower = eventTypeName.toLowerCase();
    
    if (eventTypeLower.includes('xv años') || eventTypeLower.includes('quinceañera') || eventTypeLower.includes('15 años')) {
      return 'Nombre de la quinceañera';
    }
    
    if (eventTypeLower.includes('boda') || eventTypeLower.includes('matrimonio')) {
      return 'Nombre de los novios';
    }
    
    return 'Nombre del/de los festejado/s';
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

          {loadingPromiseData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
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

              {/* Formulario de datos */}
              <div className="space-y-4">
                <div className="border-t border-zinc-800 pt-4">
                  <h5 className="text-sm font-semibold text-zinc-300 mb-2">Datos de contacto</h5>
                  <p className="text-xs text-zinc-400 mb-4">
                    Datos necesarios para poder generar tu contrato de prestación de servicios profesionales
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ZenInput
                      label="Nombre"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      error={errors.contact_name}
                      required
                      disabled={isSubmitting}
                    />
                    <ZenInput
                      label="Teléfono"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      error={errors.contact_phone}
                      required
                      disabled={isSubmitting}
                    />
                    <ZenInput
                      label="Correo electrónico"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      error={errors.contact_email}
                      required
                      disabled={isSubmitting}
                      className="sm:col-span-2"
                    />
                    <ZenInput
                      label="Dirección"
                      value={formData.contact_address}
                      onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                      error={errors.contact_address}
                      required
                      disabled={isSubmitting}
                      className="sm:col-span-2"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <h5 className="text-sm font-semibold text-zinc-300 mb-4">Datos del evento</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tipo de evento - solo lectura */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Tipo de evento
                      </label>
                      <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                        {formData.event_type_name || 'No definido'}
                      </div>
                    </div>
                    {/* Fecha del evento - solo lectura */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Fecha del evento
                      </label>
                      <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                        {formData.event_date ? formatDate(formData.event_date) : 'No definida'}
                      </div>
                    </div>
                    {/* Nombre del evento - label dinámico */}
                    <ZenInput
                      label={getEventNameLabel(formData.event_type_name)}
                      value={formData.event_name}
                      onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                      error={errors.event_name}
                      required
                      disabled={isSubmitting}
                      className="sm:col-span-2"
                    />
                    {/* Locación del evento */}
                    <ZenInput
                      label="Locación del evento"
                      value={formData.event_location}
                      onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
                      error={errors.event_location}
                      required
                      disabled={isSubmitting}
                      className="sm:col-span-2"
                    />
                  </div>
                </div>
              </div>

              {/* Información importante */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Al solicitar este paquete, se creará una cotización automáticamente y el estudio recibirá una notificación. 
                  Te contactará para brindarte más detalles, resolver tus dudas y coordinar la contratación.
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
                    onClick={handleSolicitar}
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
          )}
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
