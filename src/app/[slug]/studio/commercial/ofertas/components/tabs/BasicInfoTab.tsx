"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch } from "@/components/ui/zen";
import { MobilePreviewOffer } from "@/app/[slug]/studio/components/MobilePreviewOffer";
import { BasicInfoEditor } from "../editors/BasicInfoEditor";
import { OfferCardPreview } from "../previews/OfferCardPreview";
import { useOfferEditor } from "../OfferEditorContext";
import { checkOfferSlugExists } from "@/lib/actions/studio/offers/offers.actions";

interface BasicInfoTabProps {
  studioSlug: string;
  mode: "create" | "edit";
  offerId?: string;
}

export function BasicInfoTab({ studioSlug, mode, offerId }: BasicInfoTabProps) {
  const { formData, updateFormData } = useOfferEditor();

  const [nameError, setNameError] = useState<string | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugHint, setSlugHint] = useState<string | null>(null);

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
        const slugExists = await checkOfferSlugExists(
          studioSlug,
          formData.slug,
          mode === "edit" ? offerId : undefined
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
  }, [formData.slug, studioSlug, mode, offerId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Col 1: Editor */}
      <div>
        <ZenCard>
          <ZenCardHeader>
            <div className="flex items-center justify-between">
              <ZenCardTitle>Información</ZenCardTitle>
              <ZenSwitch
                id="offer-active-switch"
                checked={formData.is_active}
                onCheckedChange={(checked) => updateFormData({ is_active: checked })}
                label="Oferta Activa"
              />
            </div>
          </ZenCardHeader>
          <ZenCardContent>
            <BasicInfoEditor
              studioSlug={studioSlug}
              nameError={nameError}
              isValidatingSlug={isValidatingSlug}
              slugHint={slugHint}
            />
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <MobilePreviewOffer
            data={{
              studio_name: "Tu Estudio",
              slogan: "Vista previa",
              logo_url: null,
            }}
            loading={false}
          >
            <OfferCardPreview
              name={formData.name}
              description={formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
            />
          </MobilePreviewOffer>
        </div>
      </div>
    </div>
  );
}
