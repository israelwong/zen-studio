'use client';

/**
 * Skeleton simple para mostrar mientras se valida el redireccionamiento
 * No muestra texto, solo elementos visuales minimalistas
 */
export function PromiseRedirectSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-zinc-800 rounded-full animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-20 bg-zinc-800 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Contenido principal con padding-top para header */}
      <div className="pt-[65px] min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Skeleton minimalista centrado */}
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-zinc-800 rounded-full animate-pulse" />
            <div className="space-y-3 w-full max-w-md">
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-3/4 mx-auto bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
