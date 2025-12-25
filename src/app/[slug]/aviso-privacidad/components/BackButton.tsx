'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

export function BackButton() {
  const router = useRouter();

  return (
    <ZenButton
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="text-zinc-400 hover:text-zinc-100 mb-4"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      Regresar
    </ZenButton>
  );
}

