"use client";

import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { useOfferEditor } from "../OfferEditorContext";

interface LandingPreviewProps {
  studioSlug: string;
}

/**
 * Preview del landing page usando el componente real público
 * Garantiza consistencia 1:1 con la vista real
 */
export function LandingPreview({ studioSlug }: LandingPreviewProps) {
  const { formData, contentBlocks } = useOfferEditor();

  // CTA por defecto para preview
  const defaultCTA = {
    buttons: [
      {
        id: "cta-1",
        text: "Solicitar información",
        variant: "primary" as const,
        position: "bottom" as const,
      },
    ],
  };

  return (
    <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
      <OfferLandingPage
        studioSlug={studioSlug}
        offerId="preview"
        offerSlug={formData.slug || "preview"}
        contentBlocks={contentBlocks}
        ctaConfig={defaultCTA}
        onTrackView={() => { }} // No track en preview
      />
    </div>
  );
}
