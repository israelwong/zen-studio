import React from 'react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';

export function ContactsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and filters skeleton */}
      <div className="flex gap-4 items-center">
        <div className="h-10 bg-zinc-800/50 rounded-lg w-64 animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded-lg w-32 animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded-lg w-40 animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded-lg w-28 animate-pulse ml-auto" />
      </div>

      {/* Contacts list skeleton */}
      <ZenCard variant="default" padding="none">
        <ZenCardContent className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-700 rounded-full animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-700 rounded w-32 animate-pulse" />
                      <div className="h-3 bg-zinc-700 rounded w-48 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-zinc-700 rounded-full w-20 animate-pulse" />
                    <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                    <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Pagination skeleton */}
      <div className="flex justify-center items-center gap-2">
        <div className="h-10 bg-zinc-800/50 rounded-lg w-24 animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded-lg w-24 animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded-lg w-24 animate-pulse" />
      </div>
    </div>
  );
}

