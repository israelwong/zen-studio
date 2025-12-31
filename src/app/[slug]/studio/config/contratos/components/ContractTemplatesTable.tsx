"use client";

import React, { useState } from "react";
import { ContractTemplate } from "@/types/contracts";
import {
  ZenButton,
  ZenBadge,
  ZenSwitch,
  ZenConfirmModal,
} from "@/components/ui/zen";
import { Edit, Copy, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableTemplateRowProps {
  template: ContractTemplate;
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onToggle: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onDeleteClick: (templateId: string) => void;
  onSetDefault: (templateId: string) => void;
}

function SortableTemplateRow({
  template,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  onDeleteClick,
  onSetDefault,
}: SortableTemplateRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
    >
      <td className="w-8 py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical className="h-4 w-4 text-zinc-500" />
        </div>
      </td>
      {/* Columna 1: Nombre, Descripción */}
      <td className="py-4 px-4">
        <div className="space-y-1">
          <span className="text-sm font-medium text-zinc-300">
            {template.name}
          </span>
          <p className="text-xs text-zinc-500 line-clamp-2">
            {template.description || "Sin descripción"}
          </p>
        </div>
      </td>
      {/* Columna 2: Por defecto con Switch */}
      <td className="py-4 px-4">
        <div className="flex items-center justify-center">
          <ZenSwitch
            checked={template.is_default}
            onCheckedChange={() => onSetDefault(template.id)}
            variant="amber"
          />
        </div>
      </td>
      {/* Columna 3: Estado con Switch */}
      <td className="py-4 px-4">
        <div className="flex items-center justify-center">
          <ZenSwitch
            checked={template.is_active}
            onCheckedChange={() => onToggle(template.id)}
            disabled={template.is_default}
            variant="green"
          />
        </div>
      </td>
      {/* Columna 4: Versión */}
      <td className="py-4 px-4 text-center">
        <span className="text-xs text-zinc-600">v{template.version}</span>
      </td>
      {/* Columna 5: Botones de acción */}
      <td className="py-4 px-4">
        <div className="flex items-center justify-end gap-2">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(template.id);
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(template.id);
            }}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(template.id);
            }}
            disabled={template.is_default}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </ZenButton>
        </div>
      </td>
    </tr>
  );
}

export interface ContractTemplatesTableProps {
  templates: ContractTemplate[];
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onToggle: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onSetDefault: (templateId: string) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  isReordering?: boolean;
  className?: string;
}

export function ContractTemplatesTable({
  templates,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  onSetDefault,
  onDragEnd,
  isReordering = false,
  className = "",
}: ContractTemplatesTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);
  const [defaultConfirmOpen, setDefaultConfirmOpen] = useState(false);
  const [templateToSetDefault, setTemplateToSetDefault] = useState<ContractTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDeleteClick = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTemplateToDelete(template);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      onDelete(templateToDelete.id);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSetDefaultClick = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template && !template.is_default) {
      setTemplateToSetDefault(template);
      setDefaultConfirmOpen(true);
    }
  };

  const handleSetDefaultConfirm = () => {
    if (templateToSetDefault) {
      onSetDefault(templateToSetDefault.id);
      setDefaultConfirmOpen(false);
      setTemplateToSetDefault(null);
    }
  };

  if (templates.length === 0) {
    return null;
  }

  const tableContent = (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          {onDragEnd && <th className="w-8 py-3 px-4"></th>}
          <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Plantilla
          </th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Por defecto
          </th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Estado
          </th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Versión
          </th>
          <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {onDragEnd ? (
          <SortableContext
            items={templates.map((template) => template.id)}
            strategy={verticalListSortingStrategy}
          >
            {templates.map((template) => (
              <SortableTemplateRow
                key={template.id}
                template={template}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggle={onToggle}
                onDelete={onDelete}
                onDeleteClick={handleDeleteClick}
                onSetDefault={handleSetDefaultClick}
              />
            ))}
          </SortableContext>
        ) : (
          templates.map((template) => (
            <tr
              key={template.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
            >
              {/* Columna 1: Nombre, Descripción */}
              <td className="py-4 px-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-zinc-300">
                    {template.name}
                  </span>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {template.description || "Sin descripción"}
                  </p>
                </div>
              </td>
              {/* Columna 2: Por defecto con Switch */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-center">
                  <ZenSwitch
                    checked={template.is_default}
                    onCheckedChange={() => handleSetDefaultClick(template.id)}
                    variant="amber"
                  />
                </div>
              </td>
              {/* Columna 3: Estado con Switch */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-center">
                  <ZenSwitch
                    checked={template.is_active}
                    onCheckedChange={() => onToggle(template.id)}
                    disabled={template.is_default}
                    variant="green"
                  />
                </div>
              </td>
              {/* Columna 4: Versión */}
              <td className="py-4 px-4 text-center">
                <span className="text-xs text-zinc-600">v{template.version}</span>
              </td>
              {/* Columna 5: Botones de acción */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-2">
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(template.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </ZenButton>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(template.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </ZenButton>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(template.id);
                    }}
                    disabled={template.is_default}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ZenButton>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className={cn("relative rounded-lg border border-zinc-800 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        {onDragEnd ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            {tableContent}
          </DndContext>
        ) : (
          tableContent
        )}
      </div>
      {isReordering && (
        <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm">Actualizando orden...</span>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Plantilla"
        description={`¿Estás seguro de que deseas eliminar la plantilla "${templateToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Modal de confirmación de cambio de plantilla por defecto */}
      <ZenConfirmModal
        isOpen={defaultConfirmOpen}
        onClose={() => {
          setDefaultConfirmOpen(false);
          setTemplateToSetDefault(null);
        }}
        onConfirm={handleSetDefaultConfirm}
        title="Cambiar Plantilla por Defecto"
        description={`¿Deseas cambiar a esta plantilla por defecto? Se usará para crear los contratos de tus clientes, pero tienes la opción de elegir la plantilla que deseas de manera manual para cada cliente.`}
        confirmText="Cambiar"
        cancelText="Cancelar"
        variant="default"
      />
    </div>
  );
}

