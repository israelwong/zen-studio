'use client';

import { useState } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenSelect } from '@/components/ui/zen';
import { crearCrewMemberRapido } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';
import type { PersonalType } from '@prisma/client';

interface QuickAddCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrewCreated: (crewMemberId: string) => void;
  studioSlug: string;
}

const TIPOS_PERSONAL: Array<{ value: PersonalType; label: string }> = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'PROVEEDOR', label: 'Proveedor' },
];

export function QuickAddCrewModal({
  isOpen,
  onClose,
  onCrewCreated,
  studioSlug,
}: QuickAddCrewModalProps) {
  const [name, setName] = useState('');
  const [tipo, setTipo] = useState<PersonalType>('OPERATIVO');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setIsCreating(true);
    try {
      const result = await crearCrewMemberRapido(studioSlug, {
        name: name.trim(),
        tipo,
      });

      if (result.success && result.data) {
        toast.success(`Personal "${result.data.name}" agregado correctamente`);
        onCrewCreated(result.data.id);
        // Reset form
        setName('');
        setTipo('OPERATIVO');
        onClose();
      } else {
        toast.error(result.error || 'Error al crear personal');
      }
    } catch (error) {
      toast.error('Error al crear personal');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setTipo('OPERATIVO');
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="Agregar personal rápidamente"
      description="Completa los datos mínimos para agregar personal y asignarlo a la tarea."
      maxWidth="sm"
      closeOnClickOutside={false}
      onCancel={handleCancel}
      cancelLabel="Cancelar"
      onSave={handleCreate}
      saveLabel="Agregar personal"
      isLoading={isCreating}
      zIndex={10070}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
            Nombre <span className="text-red-400">*</span>
          </label>
          <ZenInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            disabled={isCreating}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim().length >= 2) {
                handleCreate();
              }
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
            Tipo <span className="text-red-400">*</span>
          </label>
          <ZenSelect
            value={tipo}
            onValueChange={(value) => setTipo(value as PersonalType)}
            disabled={isCreating}
            options={TIPOS_PERSONAL.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
          />
        </div>

        <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            <strong>Nota:</strong> Puedes agregar más información (email, teléfono, salarios) más tarde desde la gestión de personal.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}
