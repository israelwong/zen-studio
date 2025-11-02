"use client";

import { ZenCard } from "@/components/ui/zen";
import { Skeleton } from "@/components/ui/shadcn/Skeleton";

export function PortfolioCardSkeleton() {
    return (
        <ZenCard className="overflow-hidden">
            <div className="flex gap-4 p-4">
                {/* Columna 1: Portada (skeleton) */}
                <div className="relative w-32 h-32 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                    <Skeleton className="w-full h-full" />
                </div>

                {/* Columna 2: Contenido */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Línea 1: Estado y fecha */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>

                    {/* Línea 2: Título */}
                    <Skeleton className="h-5 w-3/4" />

                    {/* Línea 3: Descripción */}
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />

                    {/* Línea 4: Meta info (media count, storage) */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>

                {/* Columna 3: Menú de acciones */}
                <div className="flex-shrink-0">
                    <Skeleton className="h-6 w-6 rounded" />
                </div>
            </div>

            {/* Mensaje de duplicación */}
            <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50">
                <p className="text-sm text-zinc-400 text-center animate-pulse">
                    Duplicando proyecto, esto tomará unos segundos, sé paciente
                </p>
            </div>
        </ZenCard>
    );
}

