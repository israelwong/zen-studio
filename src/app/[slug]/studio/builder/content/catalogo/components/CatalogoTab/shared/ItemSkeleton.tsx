import { ZenCard } from "@/components/ui/zen";

/**
 * Skeleton para NIVEL 3 - Lista de Items
 * Muestra 5 items fake con estructura de ItemsListView
 */
export function ItemSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header con breadcrumb y botón Nuevo Item */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-6 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-zinc-700 rounded animate-pulse" />
            </div>

            {/* Items List */}
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <ZenCard key={i} className="p-4">
                        <div className="flex items-center justify-between">
                            {/* Left content */}
                            <div className="flex-1 min-w-0">
                                {/* Item name */}
                                <div className="h-5 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                                {/* Item info (price, type) */}
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-1 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-1 bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                                </div>
                            </div>

                            {/* Right badges & buttons */}
                            <div className="flex items-center gap-2 ml-4">
                                <div className="h-6 w-12 bg-zinc-700 rounded-full animate-pulse" />
                                <div className="h-6 w-12 bg-zinc-700 rounded-full animate-pulse" />
                                <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                            </div>
                        </div>
                    </ZenCard>
                ))}
            </div>

            {/* Back button skeleton */}
            <div className="h-10 w-20 bg-zinc-700 rounded animate-pulse" />
        </div>
    );
}
