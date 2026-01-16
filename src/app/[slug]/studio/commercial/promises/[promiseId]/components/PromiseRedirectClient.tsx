'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromiseContentSkeleton } from './PromiseLayoutSkeleton';

interface PromiseRedirectClientProps {
  studioSlug: string;
  promiseId: string;
  state: 'pendiente' | 'cierre' | 'autorizada' | null;
}

export function PromiseRedirectClient({
  studioSlug,
  promiseId,
  state,
}: PromiseRedirectClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (!state) {
      // Si no hay estado, redirigir a la lista de promesas
      router.replace(`/${studioSlug}/studio/commercial/promises`);
      return;
    }

    // Redirigir según el estado
    let targetPath = '';
    if (state === 'autorizada') {
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`;
    } else if (state === 'cierre') {
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`;
    } else {
      // Estado pendiente
      targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/pendiente`;
    }

    // Pequeño delay para asegurar que el skeleton se muestre
    const timer = setTimeout(() => {
      router.replace(targetPath);
    }, 100);

    return () => clearTimeout(timer);
  }, [state, studioSlug, promiseId, router]);

  // Mostrar skeleton mientras se procesa la redirección
  return <PromiseContentSkeleton />;
}
