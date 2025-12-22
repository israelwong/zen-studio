'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';

interface StripeIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
}

export function StripeIntegrationModal({ isOpen, onClose, studioSlug }: StripeIntegrationModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-400" />
          <span>Stripe</span>
          <ZenBadge variant="secondary" className="text-xs">
            Próximamente
          </ZenBadge>
        </div>
      }
      description="Procesa pagos de forma segura con Stripe"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="bg-indigo-950/20 rounded-lg p-4 border border-indigo-800/50">
          <p className="text-sm text-zinc-300">
            Esta integración estará disponible próximamente. Podrás procesar pagos de forma segura con Stripe.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

