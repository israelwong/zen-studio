/**
 * ⚠️ STREAMING: Skeleton nativo para transiciones
 * Se muestra automáticamente durante navegación
 */
export default function OfferLoading() {
    return (
        <div className="min-h-screen bg-zinc-950">
            <div className="max-w-md mx-auto min-h-screen md:py-24 pt-[81px] px-4 md:px-0">
                <div className="min-h-[calc(100vh-81px)] bg-zinc-950/60 backdrop-blur-sm rounded-xl overflow-hidden border border-zinc-800/50 p-6">
                    <div className="space-y-4">
                        <div className="h-8 w-3/4 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-4 w-full bg-zinc-800/30 rounded animate-pulse" />
                        <div className="h-64 bg-zinc-800/30 rounded-lg animate-pulse" />
                        <div className="h-32 bg-zinc-800/30 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
