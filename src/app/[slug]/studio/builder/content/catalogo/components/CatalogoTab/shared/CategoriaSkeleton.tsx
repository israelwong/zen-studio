import { ZenCard } from "@/components/ui/zen";

/**
 * Skeleton para NIVEL 2 - Lista de Categorías
 * Muestra estructura de lista vertical con drag handles (como la vista real)
 */
export function CategoriaSkeleton() {
    return (
        <div className="space-y-6">
            {/* Breadcrumb y encabezado */}
            <div>
                <button
                    disabled
                    className="flex items-center gap-2 text-sm text-zinc-400 mb-4"
                >
                    <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse" />
                    Volver
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-24 bg-zinc-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Lista vertical de categorías - 4 items skeleton */}
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <ZenCard key={i} className="p-4">
                        <div className="flex items-start gap-3">
                            {/* Drag Handle */}
                            <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse flex-shrink-0 mt-1" />

                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse" />
                                    <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse flex-shrink-0" />
                                </div>
                                <div className="h-3 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
                                <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                                <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                            </div>
                        </div>
                    </ZenCard>
                ))}
            </div>
        </div>
    );
}
