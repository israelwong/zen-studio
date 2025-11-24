'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { EventsWrapper } from './components/EventsWrapper';

export default function EventsPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>Eventos</ZenCardTitle>
              <ZenCardDescription>
                Gestiona tus eventos autorizados y sus procesos operativos
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <EventsWrapper studioSlug={studioSlug} />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
