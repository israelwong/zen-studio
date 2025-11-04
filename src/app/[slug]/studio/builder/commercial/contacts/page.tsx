'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ContactRound } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { ContactsWrapper } from './components';

export default function ContactsPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <ContactRound className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>Contacts</ZenCardTitle>
              <ZenCardDescription>
                Gestiona tus contactos y prospectos
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <ContactsWrapper studioSlug={studioSlug} />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

