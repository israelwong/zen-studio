import { ZenCard } from "@/components/ui/zen";

/**
 * Skeleton para NIVEL 1 - Lista de Secciones
 * Muestra 3 secciones fake con estructura de SeccionesListView
 */
export function SeccionSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header con título y botón Nueva Sección */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-64 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-zinc-700 rounded animate-pulse" />
            </div>

            {/* Storage Indicator Skeleton */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-2 w-full bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-zinc-700 rounded animate-pulse mt-2" />
            </div>

            {/* Secciones List - 3 skeleton cards */}
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <ZenCard key={i} className="p-3">
                        <div className="flex items-center gap-4">
                            {/* Drag handle skeleton */}
                            <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse flex-shrink-0" />

                            {/* Cover image skeleton */}
                            <div className="w-12 h-12 bg-zinc-700 rounded-lg flex-shrink-0 animate-pulse" />

                            {/* Content skeleton */}
                            <div className="flex-1 min-w-0">
                                <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-1 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-1 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                                </div>
                            </div>

                            {/* Action buttons skeleton */}
                            <div className="flex items-center gap-2 opacity-0">
                                <div className="p-2 h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                                <div className="p-2 h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                                <div className="p-2 h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                            </div>
                        </div>
                    </ZenCard>
                ))}
            </div>

            {/* Total summary skeleton */}
            <div className="text-center">
                <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse mx-auto" />
            </div>
        </div>
    );
}
