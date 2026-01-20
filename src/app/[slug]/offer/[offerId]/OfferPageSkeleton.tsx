import React from 'react';

/**
 * ⚠️ STREAMING: Skeleton para contenido deferred
 * Se muestra mientras cargan content blocks
 */
export function OfferPageSkeleton() {
    return (
        <div className="min-h-screen">
            <div className="max-w-md mx-auto min-h-screen md:py-24 pt-[81px] px-4 md:px-0">
                <div className="min-h-[calc(100vh-81px)] bg-zinc-950/60 backdrop-blur-sm rounded-xl overflow-hidden border border-zinc-800/50 p-6">
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-zinc-800/30 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
