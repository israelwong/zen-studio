'use client';

import { useEffect } from 'react';

interface PromiseRedirectHandlerProps {
  slug: string;
  promiseId: string;
}

export function PromiseRedirectHandler({ slug, promiseId }: PromiseRedirectHandlerProps) {
  useEffect(() => {
    async function handleRedirect() {
      try {
        const response = await fetch(`/api/promise/${slug}/${promiseId}/redirect`);
        const data = await response.json();

        if (data.redirect) {
          // ⚠️ FIX: Usar window.location.href para redirect completo y evitar problemas de hidratación
          window.location.href = data.redirect;
        } else {
          window.location.href = `/${slug}/promise/${promiseId}/pendientes`;
        }
      } catch (error) {
        console.error('[PromiseRedirectHandler] Error:', error);
        window.location.href = `/${slug}/promise/${promiseId}/pendientes`;
      }
    }

    handleRedirect();
  }, [slug, promiseId]);

  return null;
}
