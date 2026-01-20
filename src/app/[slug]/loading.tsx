/**
 * ⚠️ STREAMING: Skeleton nativo para transiciones
 * Se muestra automáticamente durante navegación
 */
export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-zinc-950">
            <header className="sticky top-0 z-50">
                <div className="bg-zinc-900 border-b border-zinc-800">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-full animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <main className="w-full mx-auto max-w-[920px] p-4 lg:p-6">
                <div className="space-y-4">
                    <div className="h-12 bg-zinc-900/50 rounded-lg animate-pulse" />
                    <div className="h-96 bg-zinc-900/50 rounded-lg animate-pulse" />
                </div>
            </main>
        </div>
    );
}
