'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { CrewMemberForm } from './CrewMemberForm';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  skills: Array<{
    id: string;
    name: string;
    color: string | null;
    icono: string | null;
    is_primary: boolean;
  }>;
  fixed_salary: number | null;
  variable_salary: number | null;
  account: {
    id: string;
    email: string;
    is_active: boolean;
  } | null;
}

interface CrewMemberFormModalProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  initialMember?: CrewMember | null;
  onSuccess: () => void;
}

export function CrewMemberFormModal({
  studioSlug,
  isOpen,
  onClose,
  initialMember,
  onSuccess,
}: CrewMemberFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {initialMember ? 'Editar Personal' : 'Crear Personal'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          <CrewMemberForm
            studioSlug={studioSlug}
            initialMember={initialMember}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

