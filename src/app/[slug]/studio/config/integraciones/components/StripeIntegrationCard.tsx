'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';

export function StripeIntegrationCard() {
  return (
    <IntegrationCard
      name="Stripe"
      description="Procesa pagos de forma segura con Stripe"
      icon={CreditCard}
      iconColor="text-indigo-400"
      isComingSoon={true}
    />
  );
}

