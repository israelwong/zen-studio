"use client";

import { useState, useCallback } from "react";
import { ZenButton } from "@/components/ui/zen";
import { ContentBlocksEditor } from "@/components/content-blocks";
import { CategorizedComponentSelector, ComponentOption } from "@/app/[slug]/profile/edit/content/portfolios/components/CategorizedComponentSelector";
import { useOfferEditor } from "../OfferEditorContext";
import { ContentBlock } from "@/types/content-blocks";
import { Plus } from "lucide-react";

interface LandingEditorProps {
  studioSlug: string;
}

export function LandingEditor({ studioSlug }: LandingEditorProps) {
  const { contentBlocks, updateContentBlocks } = useOfferEditor();

  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);

  const handleDragStateChange = useCallback((isDragging: boolean) => {
    // Callback requerido por ContentBlocksEditor
    void isDragging;
  }, []);

  const handleAddComponentFromSelector = (component: ComponentOption) => {
    const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let config: Record<string, unknown> = {};

    switch (component.type) {
      case "text":
        config = {
          text: "",
          textType: "text",
          fontSize: "base",
          fontWeight: "normal",
          alignment: "left",
        };
        break;
      case "separator":
        config = { style: "solid", height: 0.5 };
        break;
      case "media-gallery":
        config = {
          mode: component.mode || "grid",
          columns: component.mode === "grid" ? 3 : undefined,
          gap: 4,
          borderStyle: "rounded",
          aspectRatio: "auto",
          showCaptions: false,
          showTitles: false,
          lightbox: component.mode !== "slide",
          autoplay: component.mode === "slide" ? 3000 : undefined,
          perView: component.mode === "slide" ? 1 : undefined,
          showArrows: component.mode === "slide",
          showDots: component.mode === "slide",
        };
        break;
      case "video":
        config = {
          autoPlay: false,
          muted: true,
          loop: false,
          controls: true,
        };
        break;
      case "hero":
      case "hero-image":
      case "hero-video":
      case "hero-text":
      case "hero-contact":
        config = {
          title: "Tu Título Aquí",
          subtitle: "Subtítulo Impactante",
          description: "Descripción que cautive a tus prospectos",
          buttons: [
            {
              text: "Solicitar información",
              href: "#",
              variant: "primary",
              size: "lg",
            },
          ],
          overlay: true,
          overlayOpacity: 50,
          textAlignment: "center",
          verticalAlignment: "center",
          backgroundType: component.type === "hero-video" ? "video" : "image",
          containerStyle: "fullscreen",
          autoPlay: component.type === "hero-video" ? true : undefined,
          muted: component.type === "hero-video" ? true : undefined,
          loop: component.type === "hero-video" ? true : undefined,
        };
        break;
      default:
        config = {};
    }

    const newBlock: ContentBlock = {
      id: generateId(),
      type: component.type,
      order: insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length,
      presentation: "block",
      media: [],
      config,
    };

    const indexToInsert = insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length;

    updateContentBlocks((prev) => {
      if (indexToInsert < prev.length) {
        const newBlocks = [...prev];
        newBlocks.splice(indexToInsert, 0, newBlock);
        return newBlocks.map((block, index) => ({ ...block, order: index }));
      }
      return [...prev, newBlock];
    });

    setShowComponentSelector(false);
    setInsertAtIndex(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          Componentes de Contenido
        </h3>
        <ZenButton
          variant="outline"
          size="sm"
          onClick={() => {
            setInsertAtIndex(undefined);
            setShowComponentSelector(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </ZenButton>
      </div>

      <ContentBlocksEditor
        blocks={contentBlocks}
        onBlocksChange={(updatedBlocksOrFn) => {
          updateContentBlocks(updatedBlocksOrFn);
        }}
        studioSlug={studioSlug}
        hideHeader={true}
        onAddComponentClick={() => {
          setInsertAtIndex(undefined);
          setShowComponentSelector(true);
        }}
        onDragStateChange={handleDragStateChange}
      />

      <CategorizedComponentSelector
        isOpen={showComponentSelector}
        onClose={() => {
          setShowComponentSelector(false);
          setInsertAtIndex(undefined);
        }}
        onSelect={handleAddComponentFromSelector}
      />
    </div>
  );
}
