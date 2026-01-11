'use client';

import React from 'react';
import { ZenCard } from '@/components/ui/zen';

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                    <div className="h-6 w-64 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Overview Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <ZenCard key={i} className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-800/50 rounded w-24 animate-pulse" />
                                <div className="h-8 bg-zinc-800/50 rounded w-16 animate-pulse" />
                                <div className="h-3 bg-zinc-800/50 rounded w-32 animate-pulse" />
                            </div>
                            <div className="w-11 h-11 bg-zinc-800/50 rounded-lg animate-pulse" />
                        </div>
                    </ZenCard>
                ))}
            </div>

            {/* Two Column Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Content Skeleton - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                        <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                    <ZenCard className="p-0 overflow-hidden">
                        {/* Header skeleton */}
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                                <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse" />
                            </div>
                        </div>
                        {/* Content skeleton */}
                        <div className="divide-y divide-zinc-800">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-4">
                                    <div className="w-8 h-8 bg-zinc-800/50 rounded-lg animate-pulse" />
                                    <div className="w-20 h-20 bg-zinc-800/50 rounded-md animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-zinc-800/50 rounded w-3/4 animate-pulse" />
                                        <div className="h-3 bg-zinc-800/50 rounded w-1/2 animate-pulse" />
                                    </div>
                                    <div className="h-4 bg-zinc-800/50 rounded w-12 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </ZenCard>
                </div>

                {/* Traffic Sources Skeleton - Takes 1 column */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                        <div className="h-6 w-40 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                    <ZenCard className="p-6">
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 bg-zinc-800/50 rounded w-24 animate-pulse" />
                                    <div className="h-3 bg-zinc-800/50 rounded w-16 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </ZenCard>
                </div>
            </div>
        </div>
    );
}
