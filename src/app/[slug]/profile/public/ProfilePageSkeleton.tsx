import React from 'react';

/**
 * ⚠️ STREAMING: Skeleton para contenido deferred
 * Se muestra mientras cargan posts y portfolios
 */
export function ProfilePageSkeleton() {
    return (
        <main className="w-full mx-auto max-w-[920px]">
            <div className="grid grid-cols-1 lg:grid-cols-[430px_430px] gap-4 p-4 lg:p-6 lg:justify-center">
                {/* Col 1: Main content */}
                <div className="space-y-4">
                    {/* Navigation Tabs Skeleton */}
                    <div className="sticky z-20 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20 p-4">
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-8 w-20 bg-zinc-800/50 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 overflow-hidden p-6">
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 bg-zinc-800/30 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Col 2: Sidebar Skeleton */}
                <aside className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:h-fit">
                    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 p-6">
                        <div className="h-48 bg-zinc-800/30 rounded animate-pulse" />
                    </div>
                </aside>
            </div>
        </main>
    );
}
