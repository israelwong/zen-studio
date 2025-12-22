"use client";

import React, { useState, useRef, useCallback } from "react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton, ZenInput, ZenLabel, ZenSwitch } from "@/components/ui/zen";
import {
  ContractEditor,
  ContractEditorRef,
  ContractEditorToolbar,
  type ContractVariable,
} from "@/app/[slug]/studio/config/contratos/components";
import { ContractVariables } from "@/components/ui/zen";
import { CONTRACT_VARIABLES } from "@/types/contracts";
import { cn } from "@/lib/utils";

export type ContractEditorModalMode =
  | "create-template"
  | "edit-template"
  | "create-event-contract"
  | "edit-event-contract";

interface ContractEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ContractEditorModalMode;
  studioSlug: string;

  // Contenido
  initialContent?: string;
  templateContent?: string; // Para modo event-contract

  // Metadata (solo para templates)
  initialName?: string;
  initialDescription?: string;
  initialIsDefault?: boolean;

  // Evento (solo para event-contract)
  eventId?: string;

  // Callbacks
  onSave: (data: {
    content: string;
    name?: string;
    description?: string;
    is_default?: boolean;
  }) => Promise<void>;

  // UI
  title?: string;
  description?: string;
  saveLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function ContractEditorModal({
  isOpen,
  onClose,
  mode,
  studioSlug,
  initialContent = "",
  templateContent,
  initialName = "",
  initialDescription = "",
  initialIsDefault = false,
  eventId,
  onSave,
  title,
  description,
  saveLabel,
  cancelLabel = "Cancelar",
  isLoading = false,
}: ContractEditorModalProps) {
  const [content, setContent] = useState(initialContent || templateContent || "");
  const [name, setName] = useState(initialName);
  const [templateDescription, setTemplateDescription] = useState(initialDescription);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const editorRef = useRef<ContractEditorRef>(null);

  // Resetear estados cuando se abre/cierra
  React.useEffect(() => {
    if (isOpen) {
      setContent(initialContent || templateContent || "");
      setName(initialName);
      setTemplateDescription(initialDescription);
      setIsDefault(initialIsDefault);
    }
  }, [
    isOpen,
    initialContent,
    templateContent,
    initialName,
    initialDescription,
    initialIsDefault,
  ]);

  const handleVariableClick = useCallback(
    (variable: string) => {
      if (editorRef.current) {
        editorRef.current.insertVariableAtCursor(variable);
      }
    },
    []
  );

  const handleSave = async () => {
    const data: {
      content: string;
      name?: string;
      description?: string;
      is_default?: boolean;
    } = {
      content,
    };

    if (mode === "create-template" || mode === "edit-template") {
      data.name = name;
      data.description = templateDescription;
      data.is_default = isDefault;
    }

    await onSave(data);
  };

  const variables: ContractVariable[] = CONTRACT_VARIABLES.map((v) => {
    let category: "cliente" | "evento" | "comercial" | "studio" | "bloque" = "studio";

    if (v.key.includes("cotizacion") || v.key.includes("condiciones") || v.key.includes("[")) {
      category = "bloque";
    } else if (
      v.key.includes("cliente") ||
      v.key.includes("email") ||
      v.key.includes("telefono")
    ) {
      category = "cliente";
    } else if (v.key.includes("evento") || v.key.includes("fecha") || v.key.includes("tipo")) {
      category = "evento";
    } else if (v.key.includes("total") || v.key.includes("pago")) {
      category = "comercial";
    }

    return {
      key: v.key,
      label: v.label,
      description: v.description,
      category,
      example: v.example,
    };
  });

  const getDefaultTitle = () => {
    switch (mode) {
      case "create-template":
        return "Nueva Plantilla de Contrato";
      case "edit-template":
        return "Editar Plantilla de Contrato";
      case "create-event-contract":
        return "Crear Contrato de Evento";
      case "edit-event-contract":
        return "Editar Contrato de Evento";
      default:
        return "Editor de Contrato";
    }
  };

  const getDefaultDescription = () => {
    switch (mode) {
      case "create-template":
        return "Crea una plantilla maestra para generar contratos";
      case "edit-template":
        return "Edita la plantilla de contrato";
      case "create-event-contract":
        return "Edita el contenido del contrato antes de generarlo";
      case "edit-event-contract":
        return "Edita el contrato del evento";
      default:
        return "";
    }
  };

  const getDefaultSaveLabel = () => {
    switch (mode) {
      case "create-template":
        return "Crear Plantilla";
      case "edit-template":
        return "Guardar Cambios";
      case "create-event-contract":
      case "edit-event-contract":
        return "Generar Contrato";
      default:
        return "Guardar";
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title || getDefaultTitle()}
      description={description || getDefaultDescription()}
      maxWidth="7xl"
      onSave={handleSave}
      onCancel={onClose}
      saveLabel={saveLabel || getDefaultSaveLabel()}
      cancelLabel={cancelLabel}
      isLoading={isLoading}
      closeOnClickOutside={false}
    >
      <div className="flex h-full min-h-0">
        {/* Editor (flex-1) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800 overflow-hidden">
          {/* Metadata para templates */}
          {(mode === "create-template" || mode === "edit-template") && (
            <div className="p-4 border-b border-zinc-800 space-y-4 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <ZenLabel htmlFor="modal-name">Nombre de la Plantilla *</ZenLabel>
                  <ZenInput
                    id="modal-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Contrato General"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <ZenLabel htmlFor="modal-description">Descripción</ZenLabel>
                  <ZenInput
                    id="modal-description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Descripción breve de la plantilla"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-200">Plantilla por defecto</p>
                  <p className="text-sm text-zinc-500">
                    Se usará automáticamente si no se especifica otra
                  </p>
                </div>
                <ZenSwitch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
            </div>
          )}

          {/* Editor con Toolbar */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ContractEditor
              ref={editorRef}
              content={content}
              onChange={setContent}
              variables={variables}
              showToolbar={true}
              className="h-full"
            />
          </div>
        </div>

        {/* Variables Panel (400px fijo) */}
        <div className="w-[400px] flex-shrink-0 overflow-y-auto bg-zinc-900/30 border-l border-zinc-800">
          <div className="p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Variables Disponibles</h3>
            <ContractVariables showCard={false} onVariableClick={handleVariableClick} />
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}

