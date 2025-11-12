'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';

interface TerminosCondicionesManagerProps {
  studioSlug: string;
}

export function TerminosCondicionesManager({ studioSlug }: TerminosCondicionesManagerProps) {
  const handleClick = () => {
    toast.info('Gestión de términos y condiciones próximamente', {
      description: 'Esta funcionalidad estará disponible en una próxima actualización',
    });
  };

  return (
    <ZenButton variant="ghost" size="sm" onClick={handleClick}>
      <FileText className="h-4 w-4 mr-2" />
      Términos y Condiciones
    </ZenButton>
  );
}

