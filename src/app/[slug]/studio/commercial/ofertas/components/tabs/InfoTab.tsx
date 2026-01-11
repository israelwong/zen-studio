"use client";

import { useState, useEffect, useMemo } from "react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch, ZenButton } from "@/components/ui/zen";
import { InfoEditor } from "../editors/InfoEditor";
import { OfferCardPreview } from "@/components/previews";
import { useOfferEditor } from "../OfferEditorContext";
import { checkOfferSlugExists } from "@/lib/actions/studio/offers/offers.actions";
import { obtenerCondicionComercial } from "@/lib/actions/studio/config/condiciones-comerciales.actions";
import { obtenerTipoEventoPorId } from "@/lib/actions/studio/negocio/tipos-evento.actions"; // Solo para inicialización en modo edición

interface InfoTabProps {
  studioSlug: string;
  mode: "create" | "edit";
  offerId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  savedOfferId?: string | null;
}

export function InfoTab({ studioSlug, mode, offerId, onSave, onCancel, isSaving, savedOfferId }: InfoTabProps) {
  // Usar savedOfferId si está disponible (después del primer guardado), sino offerId
  const currentOfferId = savedOfferId || offerId;
  const { formData, updateFormData } = useOfferEditor();

  const [nameError, setNameError] = useState<string | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [conditionDescription, setConditionDescription] = useState<string | null>(null);
  const [eventTypeName, setEventTypeName] = useState<string | null>(null);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(false);
  const [conditionRefreshKey, setConditionRefreshKey] = useState(0);

  // Callback mejorado para recibir tanto ID como nombre del tipo de evento
  const handleEventTypeChange = (eventTypeId: string | null, eventTypeName?: string | null) => {
    updateFormData({ event_type_id: eventTypeId });
    setEventTypeName(eventTypeName || null);
  };

  // Cargar discount_percentage y description cuando cambia business_term_id o conditionRefreshKey
  useEffect(() => {
    const loadConditionData = async () => {
      if (!formData.business_term_id) {
        setDiscountPercentage(null);
        setConditionDescription(null);
        setIsLoadingDiscount(false);
        return;
      }

      setIsLoadingDiscount(true);
      try {
        const result = await obtenerCondicionComercial(studioSlug, formData.business_term_id);
        if (result.success && result.data) {
          // Actualizar descuento
          const newDiscount = result.data.discount_percentage;
          setDiscountPercentage(newDiscount);
          
          // Actualizar descripción de la condición comercial
          const newDescription = result.data.description;
          setConditionDescription(newDescription);
        } else {
          setDiscountPercentage(null);
          setConditionDescription(null);
        }
      } catch (error) {
        console.error("Error loading condition data:", error);
        setDiscountPercentage(null);
        setConditionDescription(null);
      } finally {
        setIsLoadingDiscount(false);
      }
    };

    loadConditionData();
  }, [formData.business_term_id, studioSlug, conditionRefreshKey]);

  // Cargar nombre del tipo de evento al inicializar (solo en modo edición)
  useEffect(() => {
    if (mode === "edit" && formData.event_type_id && !eventTypeName) {
      const loadEventTypeName = async () => {
        try {
          // Solo necesitamos el nombre, no los paquetes
          const result = await obtenerTipoEventoPorId(formData.event_type_id!, false);
          if (result.success && result.data) {
            setEventTypeName(result.data.nombre);
          }
        } catch (error) {
          console.error("Error loading event type on init:", error);
        }
      };
      loadEventTypeName();
    }
  }, [formData.event_type_id, mode, eventTypeName]);

  // Validar slug único cuando cambia
  useEffect(() => {
    const validateSlug = async () => {
      if (!formData.slug || !formData.slug.trim()) {
        setNameError(null);
        setSlugHint(null);
        setIsValidatingSlug(false);
        return;
      }

      setIsValidatingSlug(true);
      setNameError(null);

      try {
        // Excluir la oferta actual si estamos editando o si ya se guardó (tiene ID)
        const slugExists = await checkOfferSlugExists(
          studioSlug,
          formData.slug,
          currentOfferId || undefined
        );

        if (slugExists) {
          setNameError("Ya existe una oferta con este nombre");
          setSlugHint(null);
        } else {
          setNameError(null);
          setSlugHint(`Slug: ${formData.slug}`);
        }
      } catch (error) {
        console.error("Error validating slug:", error);
        setNameError(null);
        setSlugHint(null);
      } finally {
        setIsValidatingSlug(false);
      }
    };

    const timeoutId = setTimeout(() => {
      validateSlug();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug, studioSlug, currentOfferId]);

  const showActionButtons = !savedOfferId && mode === "create";

  // Validar disponibilidad para habilitar botón de crear
  const isAvailabilityValid = formData.is_permanent || 
    (formData.has_date_range && formData.start_date && formData.end_date);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Col 1: Editor */}
      <div>
        <ZenCard>
          <ZenCardHeader>
            <ZenCardTitle>
              Información <span className="text-xs font-normal text-zinc-600">(Paso 1 de 3)</span>
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent>
            <InfoEditor
              studioSlug={studioSlug}
              nameError={nameError}
              isValidatingSlug={isValidatingSlug}
              slugHint={slugHint}
              mode={mode}
              onEventTypeChange={handleEventTypeChange}
              onConditionUpdated={() => {
                // Forzar recarga de los datos de la condición comercial
                setConditionRefreshKey(prev => prev + 1);
              }}
            />

            {/* Botones de acción */}
            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-zinc-800">
              {mode === "create" && showActionButtons ? (
                <>
                  <ZenButton
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    Cancelar
                  </ZenButton>
                  <ZenButton
                    onClick={onSave}
                    loading={isSaving}
                    disabled={isSaving || !!nameError || !isAvailabilityValid}
                    className="flex-1"
                  >
                    Crear Oferta
                  </ZenButton>
                </>
              ) : mode === "edit" ? (
                <>
                  <ZenButton
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    Cancelar
                  </ZenButton>
                  <ZenButton
                    onClick={onSave}
                    loading={isSaving}
                    disabled={isSaving || !!nameError || !isAvailabilityValid}
                    className="flex-1"
                  >
                    Actualizar Oferta
                  </ZenButton>
                </>
              ) : null}
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-6 px-12">
          {/* Preview Desktop */}
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Vista Desktop (Sidebar)
            </p>
            <OfferCardPreview
              key={`desktop-${formData.business_term_id || 'none'}-${discountPercentage || 'null'}-${conditionDescription || 'null'}`}
              name={formData.name}
              description={conditionDescription || formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
              discountPercentage={discountPercentage}
              validUntil={formData.end_date ? formData.end_date.toISOString() : null}
              isPermanent={formData.is_permanent}
              hasDateRange={formData.has_date_range}
              startDate={formData.start_date ? formData.start_date.toISOString() : null}
              eventTypeName={eventTypeName}
              variant="desktop"
            />
          </div>

          {/* Preview Mobile */}
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Vista Mobile (Carousel)
            </p>
            <OfferCardPreview
              key={`mobile-${formData.business_term_id || 'none'}-${discountPercentage || 'null'}-${conditionDescription || 'null'}`}
              name={formData.name}
              description={conditionDescription || formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
              discountPercentage={discountPercentage}
              validUntil={formData.end_date ? formData.end_date.toISOString() : null}
              isPermanent={formData.is_permanent}
              hasDateRange={formData.has_date_range}
              startDate={formData.start_date ? formData.start_date.toISOString() : null}
              eventTypeName={eventTypeName}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
