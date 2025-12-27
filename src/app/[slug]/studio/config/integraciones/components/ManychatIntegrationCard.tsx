'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';

export function ManychatIntegrationCard() {
  return (
    <IntegrationCard
      name="Manychat"
      description="Automatiza conversaciones y respuestas con tus clientes"
      icon={MessageSquare}
      iconColor="text-green-400"
      isComingSoon={true}
    />
  );
}

