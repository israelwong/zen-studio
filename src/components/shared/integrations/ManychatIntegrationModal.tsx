'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';

interface ManychatIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
}

export function ManychatIntegrationModal({ isOpen, onClose, studioSlug }: ManychatIntegrationModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-400" />
          <span>Manychat</span>
          <ZenBadge variant="secondary" className="text-xs">
            Próximamente
          </ZenBadge>
        </div>
      }
      description="Automatiza conversaciones y respuestas con tus clientes"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="bg-green-950/20 rounded-lg p-4 border border-green-800/50">
          <p className="text-sm text-zinc-300">
            Esta integración estará disponible próximamente. Podrás automatizar conversaciones y respuestas con tus clientes a través de Manychat.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

