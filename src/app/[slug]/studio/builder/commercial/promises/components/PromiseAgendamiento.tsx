'use client';

import React from 'react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from '@/components/ui/zen';

interface PromiseAgendamientoProps {
  studioSlug: string;
  promiseId: string | null;
  isSaved: boolean;
}

export function PromiseAgendamiento({
  studioSlug,
  promiseId,
  isSaved,
}: PromiseAgendamientoProps) {
  if (!isSaved || !promiseId) {
    return null;
  }

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Agendamiento
          </ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <p className="text-xs text-zinc-500 text-center px-4">
            Agendamiento (pendiente por implementar)
          </p>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

