'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';

export function ZenMagicIntegrationCard() {
  return (
    <IntegrationCard
      name="ZEN Magic"
      description="Asistente virtual dinámico para automatización de tareas"
      icon={Sparkles}
      iconColor="text-yellow-400"
      isComingSoon={true}
    />
  );
}

