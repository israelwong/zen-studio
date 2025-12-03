"use client";

import { useState } from "react";
import {
  ZenInput,
  ZenTextarea,
  ZenSwitch,
  ZenButton,
} from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { EventTypesManager } from "@/components/shared/tipos-evento";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export function LeadFormEditor() {
  const { leadformData, updateLeadformData } = useOfferEditor();
  const params = useParams();
  const studioSlug = params.slug as string;

  const [newSubject, setNewSubject] = useState("");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState("");

  const handleAddSubject = () => {
    if (!newSubject.trim()) {
      toast.error("Escribe una opción de asunto");
      return;
    }

    const subjects = leadformData.subject_options || [];
    if (subjects.includes(newSubject.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    updateLeadformData({
      subject_options: [...subjects, newSubject.trim()],
    });

    setNewSubject("");
    setShowSubjectForm(false);
    toast.success("Opción de asunto agregada");
  };

  const handleRemoveSubject = (subject: string) => {
    updateLeadformData({
      subject_options: (leadformData.subject_options || []).filter(
        (s) => s !== subject
      ),
    });
    toast.success("Opción eliminada");
  };

  const handleStartEditSubject = (index: number, currentValue: string) => {
    setEditingSubjectIndex(index);
    setEditingSubjectValue(currentValue);
  };

  const handleSaveEditSubject = (index: number) => {
    if (!editingSubjectValue.trim()) {
      toast.error("El asunto no puede estar vacío");
      return;
    }

    const subjects = [...(leadformData.subject_options || [])];
    if (subjects[index] !== editingSubjectValue.trim() && subjects.includes(editingSubjectValue.trim())) {
      toast.error("Esta opción ya existe");
      return;
    }

    subjects[index] = editingSubjectValue.trim();
    updateLeadformData({
      subject_options: subjects,
    });

    setEditingSubjectIndex(null);
    setEditingSubjectValue("");
    toast.success("Opción actualizada");
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectIndex(null);
    setEditingSubjectValue("");
  };

  return (
    <div className="space-y-6">
      {/* Campos básicos info */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">
          Campos básicos (siempre incluidos)
        </h4>
        <ul className="text-sm text-zinc-500 space-y-1">
          <li>✓ Nombre completo (requerido)</li>
          <li>✓ Teléfono (requerido)</li>
          <li>✓ Email (opcional)</li>
        </ul>
      </div>

      {/* Título y descripción */}
      <div className="space-y-4">
        <ZenInput
          label="Título del Formulario"
          value={leadformData.title}
          onChange={(e) => updateLeadformData({ title: e.target.value })}
          placeholder="Solicita información"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-zinc-300">
              Descripción
            </span>
            <span className="text-xs text-zinc-500">
              {leadformData.description?.length || 0}/120
            </span>
          </div>
          <textarea
            value={leadformData.description}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 120) {
                updateLeadformData({ description: value });
              }
            }}
            placeholder="Completa el formulario para obtener más información"
            rows={2}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-all duration-200 outline-none focus:ring-[3px] focus:border-zinc-600 focus:ring-zinc-500/20 resize-none"
          />
        </div>
      </div>

      {/* Personalización del formulario */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-zinc-300">
            Personalización
          </h3>
        </div>
        <div className="space-y-4">
          {/* Email requerido */}
          <div className="flex items-center gap-3">
            <ZenSwitch
              checked={leadformData.email_required}
              onCheckedChange={(checked) =>
                updateLeadformData({ email_required: checked })
              }
              label="Email requerido"
            />
          </div>

          {/* Asunto: Tipos de Evento o Personalizado */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">
                  Asunto / Motivo de Consulta
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {leadformData.use_event_types
                    ? "El usuario seleccionará el tipo de evento que le interesa"
                    : "El usuario seleccionará una opción personalizada"}
                </p>
              </div>

              <ZenSwitch
                checked={leadformData.use_event_types}
                onCheckedChange={(checked) => updateLeadformData({ use_event_types: checked })}
                label="Usar tipos de evento"
              />
            </div>

            {leadformData.use_event_types ? (
              // NUEVO: Gestor de tipos de evento
              <EventTypesManager
                studioSlug={studioSlug}
                selectedTypes={leadformData.selected_event_type_ids || []}
                onChange={(types) => updateLeadformData({ selected_event_type_ids: types })}
              />
            ) : (
              // ACTUAL: Asuntos personalizados
              <div>

                {leadformData.subject_options && leadformData.subject_options.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {leadformData.subject_options.map((subject, index) => (
                      <div
                        key={index}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"
                      >
                        {editingSubjectIndex === index ? (
                          <>
                            <input
                              type="text"
                              value={editingSubjectValue}
                              onChange={(e) => setEditingSubjectValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEditSubject(index);
                                } else if (e.key === "Escape") {
                                  handleCancelEditSubject();
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEditSubject(index)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              Guardar
                            </ZenButton>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEditSubject}
                              className="text-zinc-400 hover:text-zinc-300"
                            >
                              Cancelar
                            </ZenButton>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-zinc-300">{subject}</span>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditSubject(index, subject)}
                              className="text-zinc-400 hover:text-zinc-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </ZenButton>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSubject(subject)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ZenButton>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!showSubjectForm ? (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubjectForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Opción
                  </ZenButton>
                ) : (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                    <ZenInput
                      label="Opción de asunto"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Ej: Cotización de sesión"
                    />
                    <div className="flex gap-2">
                      <ZenButton onClick={handleAddSubject} size="sm">
                        Agregar
                      </ZenButton>
                      <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowSubjectForm(false);
                          setNewSubject("");
                        }}
                      >
                        Cancelar
                      </ZenButton>
                    </div>
                  </div>
                )}

                {/* Feature: Mostrar paquetes después de registro */}
                {leadformData.use_event_types &&
                  leadformData.selected_event_type_ids &&
                  leadformData.selected_event_type_ids.length > 0 && (
                    <div className="border-t border-zinc-800 pt-4 mt-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-zinc-300">
                          Después de registrarse
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Opcional: Mostrar paquetes del tipo de evento seleccionado
                        </p>
                      </div>

                      <ZenSwitch
                        checked={leadformData.show_packages_after_submit || false}
                        onCheckedChange={(checked) =>
                          updateLeadformData({ show_packages_after_submit: checked })
                        }
                        label="Mostrar paquetes relacionados"
                      />

                      {leadformData.show_packages_after_submit && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                          <p className="text-xs text-blue-300">
                            ℹ️ El prospecto verá los paquetes disponibles según el tipo de evento seleccionado.
                            Si el tipo no tiene paquetes, se mostrará un mensaje indicándolo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Fecha de interés */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ZenSwitch
                checked={leadformData.enable_interest_date}
                onCheckedChange={(checked) =>
                  updateLeadformData({ enable_interest_date: checked })
                }
                label="Solicitar fecha de interés"
              />
            </div>

            {leadformData.enable_interest_date && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ZenSwitch
                    checked={leadformData.validate_with_calendar}
                    onCheckedChange={(checked) =>
                      updateLeadformData({ validate_with_calendar: checked })
                    }
                    label="Validar fecha de interés con agenda"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {leadformData.validate_with_calendar
                    ? "Solo se mostrarán fechas disponibles en tu agenda"
                    : "El usuario podrá seleccionar cualquier fecha"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success */}
      <div className="border-t border-zinc-800 pt-4 space-y-4">
        <ZenTextarea
          label="Mensaje de Éxito"
          value={leadformData.success_message}
          onChange={(e) =>
            updateLeadformData({ success_message: e.target.value })
          }
          rows={2}
        />

        <ZenInput
          label="URL de Redirección (opcional)"
          value={leadformData.success_redirect_url}
          onChange={(e) =>
            updateLeadformData({ success_redirect_url: e.target.value })
          }
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
