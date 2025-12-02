"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Copy, Check, FileText, Layout, MessageSquare, CheckCircle2 } from "lucide-react";
import {
  ZenButton,
  ZenConfirmModal,
} from "@/components/ui/zen";
import { OfferEditorProvider, useOfferEditor } from "./OfferEditorContext";
import { BasicInfoTab } from "./tabs/BasicInfoTab";
import { LandingPageTab } from "./tabs/LandingPageTab";
import { LeadFormTab } from "./tabs/LeadFormTab";
import { createOffer, updateOffer, deleteOffer } from "@/lib/actions/studio/offers/offers.actions";
import type { StudioOffer } from "@/types/offers";
import { toast } from "sonner";

interface OfferEditorProps {
  studioSlug: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
}

// Componente interno que usa el contexto
function OfferEditorContent({ studioSlug, mode, offer }: OfferEditorProps) {
  const router = useRouter();
  const {
    activeTab,
    setActiveTab,
    isSaving,
    setIsSaving,
    getOfferData,
    formData,
    contentBlocks,
  } = useOfferEditor();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Calcular completitud de cada tab
  const isBasicComplete = formData.name && formData.slug && formData.cover_media_url;
  const isLandingComplete = contentBlocks.length > 0;
  const isLeadformComplete = true; // Siempre completo (campos básicos heredados)

  const tabs = [
    { id: "basic" as const, label: "Información", icon: FileText, isComplete: isBasicComplete },
    { id: "landing" as const, label: "Landing Page", icon: Layout, isComplete: isLandingComplete },
    { id: "leadform" as const, label: "Formulario", icon: MessageSquare, isComplete: isLeadformComplete },
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validaciones básicas
      if (!formData.name.trim()) {
        toast.error("El nombre es requerido");
        setIsSaving(false);
        return;
      }

      if (!formData.slug.trim()) {
        toast.error("El slug es requerido");
        setIsSaving(false);
        return;
      }

      if (contentBlocks.length === 0) {
        toast.error("Agrega al menos un componente a la landing page");
        setIsSaving(false);
        return;
      }

      // Preparar datos para guardar
      const offerData = getOfferData();

      let result;
      if (mode === "create") {
        result = await createOffer(studioSlug, offerData);
      } else {
        if (!offer?.id) {
          toast.error("ID de oferta requerido para actualizar");
          setIsSaving(false);
          return;
        }
        result = await updateOffer(offer.id, studioSlug, {
          id: offer.id,
          ...offerData,
        });
      }

      if (!result.success) {
        toast.error(result.error || "Error al guardar la oferta");
        setIsSaving(false);
        return;
      }

      toast.success(
        mode === "create"
          ? "Oferta creada exitosamente"
          : "Oferta actualizada exitosamente"
      );

      router.push(`/${studioSlug}/studio/commercial/ofertas`);
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al guardar la oferta");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!offer?.id) return;

    setIsDeleting(true);
    try {
      const result = await deleteOffer(offer.id, studioSlug);

      if (result.success) {
        toast.success("Oferta eliminada exitosamente");
        router.push(`/${studioSlug}/studio/commercial/ofertas`);
      } else {
        toast.error(result.error || "Error al eliminar la oferta");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al eliminar la oferta");
      setIsDeleting(false);
    }
  };

  const publicUrl = offer
    ? `/${studioSlug}/offer/${offer.id}`
    : `/${studioSlug}/offer/${formData.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <ZenButton variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Regresar</span>
          </ZenButton>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
              {mode === "create" ? "Nueva Oferta" : "Editar Oferta"}
            </h1>
            <p className="text-sm text-zinc-400 hidden sm:block">
              {mode === "create"
                ? "Crea una nueva oferta comercial"
                : "Modifica tu oferta comercial"}
            </p>
          </div>
        </div>

        {/* Botones de Acción en Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link copiar (solo en edición) */}
          {offer && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${publicUrl}`
                  );
                  setLinkCopied(true);
                  toast.success("Link copiado");
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch {
                  toast.error("Error al copiar el link");
                }
              }}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </ZenButton>
          )}

          {/* Botón Eliminar (solo en edición) */}
          {mode === "edit" && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSaving}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
            >
              <Trash2 className="h-4 w-4" />
            </ZenButton>
          )}

          {/* Botón Cancelar */}
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setShowCancelModal(true)}
            disabled={isSaving}
            className="hidden sm:flex"
          >
            Cancelar
          </ZenButton>

          {/* Botón Guardar/Crear */}
          <ZenButton onClick={handleSave} loading={isSaving} size="sm">
            {mode === "create" ? "Crear Oferta" : "Guardar"}
          </ZenButton>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-500 ease-out"
            style={{
              width: `${(tabs.filter((t) => t.isComplete).length / tabs.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
          {tabs.filter((t) => t.isComplete).length} de {tabs.length}
        </span>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  {tab.isComplete && activeTab !== tab.id && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <BasicInfoTab studioSlug={studioSlug} mode={mode} offerId={offer?.id} />
      )}
      {activeTab === "landing" && <LandingPageTab studioSlug={studioSlug} />}
      {activeTab === "leadform" && <LeadFormTab studioSlug={studioSlug} />}

      {/* Modal Cancelar */}
      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => router.back()}
        title="Cancelar Edición"
        description="¿Estás seguro de que quieres cancelar? Se perderán todos los cambios no guardados."
        confirmText="Sí, Cancelar"
        cancelText="Continuar Editando"
        variant="destructive"
      />

      {/* Modal Eliminar */}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Oferta"
        description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}

// Componente principal que provee el contexto
export function OfferEditor(props: OfferEditorProps) {
  return (
    <OfferEditorProvider initialOffer={props.offer}>
      <OfferEditorContent {...props} />
    </OfferEditorProvider>
  );
}
