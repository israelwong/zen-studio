'use client';

import { useEffect, useState } from 'react';
import { PromiseRedirectSkeleton } from './PromiseRedirectSkeleton';

interface PromiseRedirectHandlerProps {
  slug: string;
  promiseId: string;
}

export function PromiseRedirectHandler({ slug, promiseId }: PromiseRedirectHandlerProps) {
  const [error, setError] = useState<string | null>(null);
  const currentPath = `/${slug}/promise/${promiseId}`;

  useEffect(() => {
    async function handleRedirect() {
      try {
        const response = await fetch(`/api/promise/${slug}/${promiseId}/redirect`);
        const data = await response.json();

        if (data.redirect) {
          // ⚠️ FIX: Usar window.location.href para redirect completo y evitar problemas de hidratación
          window.location.href = data.redirect;
        } else {
          // Si no hay redirect, redirigir a /pendientes por defecto (para ver paquetes)
          window.location.href = `/${slug}/promise/${promiseId}/pendientes`;
        }
      } catch (error) {
        console.error('[PromiseRedirectHandler] Error:', error);
        setError('Error al cargar la información. Por favor, intenta nuevamente.');
      }
    }

    handleRedirect();
  }, [slug, promiseId, currentPath]);

  // Si hay error, mostrar mensaje en lugar de skeleton
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center">
              <svg
                className="w-8 h-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Información no disponible
          </h2>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  // Mostrar skeleton mientras se valida el redireccionamiento
  return <PromiseRedirectSkeleton />;
}
