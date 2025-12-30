'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ZenDialog, ZenButton, ZenInput, ZenCard, ZenCardContent, ZenSwitch } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import {
  Eye,
  CheckCircle2,
  FileText,
  Loader2,
  DollarSign,
  CalendarIcon,
  AlertCircle,
  X,
  ChevronDown,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar as CalendarLucide,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { autorizarCotizacion, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { autorizarCotizacionLegacy } from '@/lib/actions/studio/commercial/promises/authorize-legacy.actions';
import { getPromiseByIdAsPromiseWithContact } from '@/lib/actions/studio/commercial/promises/promises.actions';
import { CondicionComercialSelectorModal } from './CondicionComercialSelectorModal';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';

interface Cotizacion {
  id: string;
  name: string;
  price: number;
  status: string;
  selected_by_prospect: boolean;
  condiciones_comerciales_id: string | null;
  condiciones_comerciales?: {
    id: string;
    name: string;
  } | null;
}

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface AuthorizeCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion;
  promiseId: string;
  studioSlug: string;
  condicionesComerciales: CondicionComercial[];
  paymentMethods: PaymentMethod[];
  onSuccess?: () => void;
}

export function AuthorizeCotizacionModal({
  isOpen,
  onClose,
  cotizacion,
  promiseId,
  studioSlug,
  condicionesComerciales,
  paymentMethods,
  onSuccess,
}: AuthorizeCotizacionModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Detección del tipo de cliente
  const isClienteNuevo = cotizacion.selected_by_prospect === true;
  const isClienteLegacy = !cotizacion.selected_by_prospect;

  // Estado para Cliente Legacy (selector de condiciones)
  const [selectedCondicionId, setSelectedCondicionId] = useState<string>(
    cotizacion.condiciones_comerciales_id || ''
  );

  // Estado para Registro de Pago (toggle único)
  const [registrarPago, setRegistrarPago] = useState(true); // true por defecto
  const [pagoConcepto, setPagoConcepto] = useState('Anticipo');
  const [pagoMonto, setPagoMonto] = useState<string>('');
  const [pagoFecha, setPagoFecha] = useState<Date | undefined>(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showCondicionSelector, setShowCondicionSelector] = useState(false);
  const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<any>(null);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [showDatosCliente, setShowDatosCliente] = useState(false);
  const [promiseData, setPromiseData] = useState<any>(null);
  const [loadingPromise, setLoadingPromise] = useState(true);

  // Calcular balance con descuento de condición comercial
  const subtotal = cotizacion.price;
  const [descuento, setDescuento] = useState(0);
  const [total, setTotal] = useState(subtotal);

  // Validar datos de pago si registrarPago = true
  const pagoDataValid = !registrarPago || (
    pagoMonto &&
    parseFloat(pagoMonto) > 0 &&
    paymentMethodId &&
    pagoFecha
  );

  // Calcular descuento y total cuando cambie la condición comercial
  useEffect(() => {
    if (isClienteLegacy && selectedCondicionId) {
      const condicion = condicionesComerciales.find(cc => cc.id === selectedCondicionId);
      if (condicion && condicion.discount_percentage) {
        const descuentoCalculado = subtotal * (condicion.discount_percentage / 100);
        setDescuento(descuentoCalculado);
        setTotal(subtotal - descuentoCalculado);
      } else {
        setDescuento(0);
        setTotal(subtotal);
      }
    } else {
      // Cliente nuevo: usar precio original
      setDescuento(0);
      setTotal(subtotal);
    }
  }, [selectedCondicionId, condicionesComerciales, subtotal, isClienteLegacy]);

  useEffect(() => {
    // Si hay métodos de pago, seleccionar el primero por defecto
    if (paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId]);

  // Cargar datos de la promesa (contacto + evento)
  useEffect(() => {
    if (isOpen && promiseId) {
      loadPromiseData();
    }
  }, [isOpen, promiseId]);

  const loadPromiseData = async () => {
    setLoadingPromise(true);
    try {
      const result = await getPromiseByIdAsPromiseWithContact(studioSlug, promiseId);
      if (result.success && result.data) {
        setPromiseData(result.data);
      }
    } catch (error) {
      console.error('[loadPromiseData] Error:', error);
    } finally {
      setLoadingPromise(false);
    }
  };

  // Cargar cotización completa cuando se abre el preview
  const handleOpenPreview = async () => {
    setLoadingCotizacion(true);
    setShowCotizacionPreview(true);

    try {
      const result = await getCotizacionById(cotizacion.id, studioSlug);
      if (result.success && result.data) {
        setCotizacionCompleta(result.data);
      } else {
        toast.error('Error al cargar la cotización');
        setShowCotizacionPreview(false);
      }
    } catch (error) {
      console.error('[handleOpenPreview] Error:', error);
      toast.error('Error al cargar la cotización');
      setShowCotizacionPreview(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  const handleAutorizar = async () => {
    // Validaciones
    if (!pagoDataValid) {
      toast.error('Completa los datos del pago');
      return;
    }

    if (isClienteLegacy && !selectedCondicionId) {
      toast.error('Selecciona las condiciones comerciales');
      return;
    }

    setIsLoading(true);

    try {
      if (isClienteNuevo) {
        // FLUJO DIGITAL: No crea evento, cambia a contract_pending
        const result = await autorizarCotizacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: cotizacion.condiciones_comerciales_id || '',
          monto: total,
        });

        if (result.success) {
          toast.success('Cotización autorizada. Cliente recibirá acceso a su portal.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
        }
      } else {
        // FLUJO LEGACY: Crea evento inmediatamente
        const result = await autorizarCotizacionLegacy({
          studio_slug: studioSlug,
          cotizacion_id: cotizacion.id,
          promise_id: promiseId,
          condiciones_comerciales_id: selectedCondicionId,
          monto: total,
          registrar_pago: registrarPago,
          pago_data: registrarPago ? {
            concepto: pagoConcepto,
            monto: parseFloat(pagoMonto),
            fecha: pagoFecha!,
            payment_method_id: paymentMethodId,
          } : undefined,
        });

        if (result.success && result.data?.eventId) {
          toast.success('Evento creado exitosamente');
          onClose();
          router.push(`/${studioSlug}/studio/business/events/${result.data.eventId}`);
        } else {
          toast.error(result.error || 'Error al autorizar cotización');
        }
      }
    } catch (error) {
      console.error('[AuthorizeCotizacionModal] Error:', error);
      toast.error('Error al autorizar cotización');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Autorizar Cotización"
      description={
        isClienteNuevo
          ? 'El cliente pre-autorizó esta cotización. Confirma para habilitar el flujo de contrato digital.'
          : 'Autoriza esta cotización y crea el evento inmediatamente.'
      }
      maxWidth="lg"
      onSave={handleAutorizar}
      saveLabel={isLoading ? 'Autorizando...' : 'Autorizar y Crear Evento'}
      cancelLabel="Cancelar"
      isLoading={isLoading}
      saveVariant="primary"
    >
      <div className="space-y-4">
        {/* SECCIÓN 0: Datos del Cliente (Colapsable) */}
        <div className="border-b border-zinc-700 pb-3">
          <button
            onClick={() => setShowDatosCliente(!showDatosCliente)}
            className="flex items-center justify-between w-full hover:bg-zinc-800/30 p-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  showDatosCliente ? '' : '-rotate-90'
                }`}
              />
              <User className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-white">Datos del Cliente</span>
            </div>
            {!showDatosCliente && !loadingPromise && promiseData && (
              <span className="text-xs text-zinc-400 truncate max-w-xs">
                {promiseData.contact?.name} • {promiseData.contact?.phone}
              </span>
            )}
          </button>

          {showDatosCliente && (
            <div className="mt-3 space-y-3">
              {loadingPromise ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                </div>
              ) : promiseData ? (
                <>
                  {/* Card Cliente */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="text-xs font-medium text-zinc-400 uppercase">Cliente</h5>
                      <button
                        onClick={() => toast.info('Funcionalidad de edición próximamente')}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm text-white">
                          {promiseData.contact?.name || 'Sin nombre'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm text-white">
                          {promiseData.contact?.phone || 'Sin teléfono'}
                        </span>
                      </div>
                      {promiseData.contact?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="text-sm text-white truncate">
                            {promiseData.contact.email}
                          </span>
                        </div>
                      )}
                      {promiseData.contact?.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="text-sm text-white">
                            {promiseData.contact.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Evento */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                    <h5 className="text-xs font-medium text-zinc-400 uppercase mb-3">Evento</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm text-white">
                          {promiseData.event_type?.name || 'Sin tipo de evento'}
                        </span>
                      </div>
                      {promiseData.event_date && (
                        <div className="flex items-center gap-2">
                          <CalendarLucide className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="text-sm text-white">
                            {format(new Date(promiseData.event_date), 'PPP', { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500">No se pudieron cargar los datos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 1: Preview Cotización */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-700">
          <div>
            <h3 className="text-base font-semibold text-white">{cotizacion.name}</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Precio base: ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleOpenPreview}
            loading={loadingCotizacion}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver detalle
          </ZenButton>
        </div>

        {/* SECCIÓN 2: Condiciones Comerciales */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-zinc-300">Condiciones Comerciales</h4>
            {!isClienteNuevo && selectedCondicionId && (
              <button
                onClick={() => setShowCondicionSelector(true)}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cambiar
              </button>
            )}
          </div>

          {selectedCondicionId ? (
            // Mostrar condición seleccionada
            <div className={`rounded-lg p-2.5 border ${isClienteNuevo
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-zinc-800/50 border-zinc-700'
              }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isClienteNuevo ? 'text-emerald-400' : 'text-emerald-500'
                  }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    {condicionesComerciales.find(cc => cc.id === selectedCondicionId)?.name ||
                      cotizacion.condiciones_comerciales?.name ||
                      'Sin condiciones'}
                  </div>
                  {!isClienteNuevo && (() => {
                    const condicion = condicionesComerciales.find(cc => cc.id === selectedCondicionId);
                    return condicion && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        {condicion.advance_percentage && condicion.advance_percentage > 0 && (
                          <span>Anticipo {condicion.advance_percentage}%</span>
                        )}
                        <span>•</span>
                        <span>Desc. {condicion.discount_percentage ?? 0}%</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            // No hay condición seleccionada (solo Cliente Legacy)
            <button
              onClick={() => setShowCondicionSelector(true)}
              className="w-full border border-dashed border-zinc-700 rounded-lg p-3 text-center hover:border-zinc-600 hover:bg-zinc-800/30 transition-colors"
            >
              <p className="text-sm text-zinc-400">
                Seleccionar condiciones comerciales
              </p>
            </button>
          )}
        </div>

        {/* SECCIÓN 3: Resumen Balance */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal:</span>
              <span className="text-white">
                ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Descuento:</span>
                <span className="text-emerald-500">
                  -${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-700">
              <span className="text-white">Total:</span>
              <span className="text-emerald-500">
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: Estado Contrato (SOLO Cliente Nuevo) */}
        {isClienteNuevo && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">Contrato Digital</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  El cliente recibirá el contrato en su portal después de confirmar sus datos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 5: Registro de Pago */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg bg-zinc-900/50">
            <div className="flex-1">
              <label className="font-medium text-white text-sm block">
                Registrar pago ahora
              </label>
              <p className="text-xs text-zinc-400 mt-0.5">
                {registrarPago
                  ? 'El cliente ya realizó el pago'
                  : 'Se guardará con promesa de pago'}
              </p>
            </div>
            <ZenSwitch
              checked={registrarPago}
              onCheckedChange={setRegistrarPago}
            />
          </div>

          {/* Formulario de Pago */}
          {registrarPago && (
            <div className="space-y-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <ZenInput
                label="Concepto"
                value={pagoConcepto}
                onChange={(e) => setPagoConcepto(e.target.value)}
                placeholder="Ej: Anticipo 50%"
              />

              <ZenInput
                type="number"
                label="Monto"
                value={pagoMonto}
                onChange={(e) => setPagoMonto(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                  Fecha de pago
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between"
                    >
                      <span className={!pagoFecha ? 'text-zinc-500' : ''}>
                        {pagoFecha ? format(pagoFecha, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </span>
                      <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                    <Calendar
                      mode="single"
                      selected={pagoFecha}
                      onSelect={(date) => {
                        setPagoFecha(date);
                        setCalendarOpen(false);
                      }}
                      locale={es}
                      className="rounded-md border-0"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">
                  Método de pago
                </label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar método de pago</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Selector de Condiciones Comerciales */}
      {!isClienteNuevo && (
        <CondicionComercialSelectorModal
          isOpen={showCondicionSelector}
          onClose={() => setShowCondicionSelector(false)}
          condiciones={condicionesComerciales}
          selectedId={selectedCondicionId}
          onSelect={setSelectedCondicionId}
        />
      )}

      {/* Modal Preview de Cotización */}
      {showCotizacionPreview && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          {/* Overlay oscuro */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCotizacionPreview(false)}
          />

          {/* Contenido del modal */}
          <div className="relative z-10 w-full max-w-7xl bg-zinc-900 rounded-lg shadow-xl border border-zinc-800 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Cotización: {cotizacion.name}
              </h3>
              <button
                onClick={() => setShowCotizacionPreview(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {loadingCotizacion ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : cotizacionCompleta ? (
                <ResumenCotizacion
                  cotizacion={cotizacionCompleta}
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </ZenDialog>
  );
}

