'use client';

import React, { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenSwitch, ZenInput } from '@/components/ui/zen';
import { getPromiseShareSettings, updatePromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { toast } from 'sonner';

interface PromiseShareOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
}

export function PromiseShareOptionsModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
}: PromiseShareOptionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingScope, setSavingScope] = useState<'all' | 'single' | null>(null);
  const [hasCotizacion, setHasCotizacion] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  const [showCategoriesSubtotals, setShowCategoriesSubtotals] = useState(false);
  const [showItemsPrices, setShowItemsPrices] = useState(false);
  const [minDaysToHire, setMinDaysToHire] = useState(30);
  const [showStandardConditions, setShowStandardConditions] = useState(true); // Siempre true, no modificable
  const [showOfferConditions, setShowOfferConditions] = useState(false);
  const [showPortafolios, setShowPortafolios] = useState(true);
  const [autoGenerateContract, setAutoGenerateContract] = useState(false);
  const [weContactYou, setWeContactYou] = useState(false);
  const [sendToContractProcess, setSendToContractProcess] = useState(false);
  const [showMinDaysToHire, setShowMinDaysToHire] = useState(true); // Activo por defecto

  useEffect(() => {
    if (isOpen && promiseId) {
      loadSettings();
    } else if (!isOpen) {
      // Resetear estados cuando el modal se cierra
      setLoading(false);
      setSaving(false);
    }
  }, [isOpen, promiseId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getPromiseShareSettings(studioSlug, promiseId);
      if (result.success && result.data) {
        setHasCotizacion(result.data.has_cotizacion);
        setHasOverride(!result.data.remember_preferences); // true si tiene override específico
        setShowPackages(result.data.show_packages);
        setShowCategoriesSubtotals(result.data.show_categories_subtotals);
        setShowItemsPrices(result.data.show_items_prices);
        setMinDaysToHire(result.data.min_days_to_hire);
        setShowStandardConditions(result.data.show_standard_conditions ?? true);
        setShowOfferConditions(result.data.show_offer_conditions ?? false);
        setShowPortafolios(result.data.portafolios ?? true);
        setAutoGenerateContract(result.data.auto_generate_contract ?? false);
      } else {
        toast.error(result.error || 'Error al cargar preferencias');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (rememberPreferences: boolean) => {
    if (minDaysToHire < 1) {
      toast.error('El mínimo de días debe ser mayor a 0');
      return;
    }

    setSaving(true);
    setSavingScope(rememberPreferences ? 'all' : 'single');
    try {
      const result = await updatePromiseShareSettings(studioSlug, promiseId, {
        show_packages: showPackages,
        show_categories_subtotals: showCategoriesSubtotals,
        show_items_prices: showItemsPrices,
        min_days_to_hire: minDaysToHire,
        show_standard_conditions: showStandardConditions,
        show_offer_conditions: showOfferConditions,
        portafolios: showPortafolios,
        auto_generate_contract: autoGenerateContract,
        // TODO: Agregar estos campos cuando estén disponibles en la acción del servidor
        // we_contact_you: weContactYou,
        // send_to_contract_process: sendToContractProcess,
        remember_preferences: rememberPreferences,
      });

      if (result.success) {
        if (rememberPreferences) {
          toast.success('Preferencias guardadas para todas las promesas');
        } else {
          toast.success('Preferencias guardadas solo para esta promesa');
        }
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar preferencias');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
      setSavingScope(null);
    }
  };



  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Opciones de automatización"
      description="Define que información verá el prospecto de manera automatica en la pagina de promesa"
      maxWidth="xl"
      zIndex={10080}
      footerLeftContent={
        saving ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-zinc-400">
              {savingScope === 'all'
                ? 'Guardando para todas las promesas...'
                : 'Guardando para esta promesa...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            <ZenButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </ZenButton>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <ZenButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleSave(true)}
                disabled={minDaysToHire < 1 || saving}
                loading={saving && savingScope === 'all'}
              >
                Guardar para todas las promesas
              </ZenButton>
              <ZenButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={minDaysToHire < 1 || saving}
                loading={saving && savingScope === 'single'}
                className="flex-1 min-w-[120px] border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500"
              >
                Solo para esta promesa
              </ZenButton>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Skeleton: Mostrar en vista general de promesas */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-64" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-24" />
                      <div className="h-3 bg-zinc-800 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Skeleton: Límite de días */}
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-48" />
                    <div className="h-3 bg-zinc-800 rounded w-56" />
                  </div>
                  <div className="w-20 h-10 bg-zinc-800 rounded" />
                </div>
              </div>
            </div>

            {/* Skeleton: Mostrar información en cotización y paquetes */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-72" />
              <div className="space-y-4">
                {/* Primera fila */}
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                      <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-40" />
                        <div className="h-3 bg-zinc-800 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Segunda fila */}
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                      <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-36" />
                        <div className="h-3 bg-zinc-800 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Skeleton: Después de confirmar interés */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-64" />
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-56" />
                  <div className="h-3 bg-zinc-800 rounded w-72" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Badge si tiene configuración personalizada */}
            {hasOverride && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-400 font-medium">
                  Configuración activa solo para esta promesa
                </span>
              </div>
            )}

            {/* Sección: Vista general */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Mostrar en vista general de promesas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={showPackages}
                    onCheckedChange={setShowPackages}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Paquetes
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {hasCotizacion
                        ? 'El prospecto verá los paquetes disponibles'
                        : 'Si no hay cotización existente se mostrarán los paquetes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={showPortafolios}
                    onCheckedChange={setShowPortafolios}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Portafolios
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      El prospecto verá los portafolios disponibles según el tipo de evento
                    </p>
                  </div>
                </div>
              </div>

              {/* Límite de días para contratar */}
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <ZenSwitch
                  checked={showMinDaysToHire}
                  onCheckedChange={() => { }} // Solo lectura por ahora
                  disabled
                  className="mt-0.5"
                />
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Límite de días para poder contratar
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Días que el prospecto tiene disponibles para contratar
                    </p>
                  </div>
                  <div className="w-20">
                    <ZenInput
                      type="number"
                      min="1"
                      value={minDaysToHire.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0) {
                          setMinDaysToHire(value);
                        } else if (e.target.value === '') {
                          // Permitir campo vacío temporalmente mientras se escribe
                          setMinDaysToHire(1);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (isNaN(value) || value < 1) {
                          setMinDaysToHire(1);
                        }
                      }}
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Información en cotización y paquetes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Mostrar información en cotización y paquetes</h3>
              <div className="space-y-4">
                {/* Primera fila: Condiciones comerciales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showStandardConditions}
                      onCheckedChange={() => { }}
                      disabled
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Condiciones comerciales estándar
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá las condiciones comerciales estándar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showOfferConditions}
                      onCheckedChange={setShowOfferConditions}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Condiciones comerciales especiales
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá las condiciones comerciales de tipo oferta
                      </p>
                    </div>
                  </div>
                </div>

                {/* Segunda fila: Subtotales y precios */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showCategoriesSubtotals}
                      onCheckedChange={setShowCategoriesSubtotals}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Subtotal por categoría
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá el subtotal por categoría
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showItemsPrices}
                      onCheckedChange={setShowItemsPrices}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Precio por item
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá el precio individual de cada item
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Después de confirmar interés y guardar registro */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Después de confirmar interés y guardar registro</h3>
              {/* TODO: Próxima implementación */}
              {/* <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={weContactYou}
                    onCheckedChange={(checked) => {
                      setWeContactYou(checked);
                      if (checked) {
                        setSendToContractProcess(false);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Nosotros te contactamos
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      El prospecto recibirá un mensaje indicando que serás contactado
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={sendToContractProcess}
                    onCheckedChange={(checked) => {
                      setSendToContractProcess(checked);
                      if (checked) {
                        setWeContactYou(false);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Enviarlo a página de proceso de contratación
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Redirigir al prospecto al proceso de contratación automáticamente
                    </p>
                  </div>
                </div>
              </div> */}

              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <ZenSwitch
                  checked={autoGenerateContract}
                  onCheckedChange={setAutoGenerateContract}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-200">
                    Generar contrato automáticamente al autorizar
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Si está activado, el contrato se generará automáticamente usando la plantilla por defecto cuando el prospecto autorice la cotización
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ZenDialog>
  );
}
