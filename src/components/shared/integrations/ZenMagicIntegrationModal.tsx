'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';

interface ZenMagicIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
}

export function ZenMagicIntegrationModal({ isOpen, onClose, studioSlug }: ZenMagicIntegrationModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          <span>ZEN Magic</span>
          <ZenBadge variant="secondary" className="text-xs">
            Próximamente
          </ZenBadge>
        </div>
      }
      description="Asistente virtual dinámico para automatización de tareas"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="bg-yellow-950/20 rounded-lg p-4 border border-yellow-800/50">
          <p className="text-sm text-zinc-300">
            Esta integración estará disponible próximamente. ZEN Magic es un asistente virtual dinámico que te ayudará a automatizar tareas y optimizar tu flujo de trabajo.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

