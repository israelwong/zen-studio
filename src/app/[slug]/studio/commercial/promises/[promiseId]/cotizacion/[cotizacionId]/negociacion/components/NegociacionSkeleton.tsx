'use client';

import React from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenButton,
} from '@/components/ui/zen';
import { ArrowLeft } from 'lucide-react';

export function NegociacionSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ZenButton
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            iconPosition="left"
            disabled
          >
            Volver
          </ZenButton>
          <div>
            <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mt-2" />
          </div>
        </div>
      </div>

      {/* Layout de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Items Tree Skeleton */}
        <ZenCard>
          <ZenCardHeader>
            <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          </ZenCardHeader>
          <ZenCardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="ml-6 space-y-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ZenCardContent>
        </ZenCard>

        {/* Columna 2: Condiciones y Cálculos Skeleton */}
        <div className="space-y-6">
          {/* ComparacionView Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* SelectorCondicionesComerciales Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-56 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-3">
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            </ZenCardContent>
          </ZenCard>

          {/* CalculoConCondiciones Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-52 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </ZenCardContent>
          </ZenCard>

          {/* PrecioSimulador Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-44 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* ImpactoUtilidad Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* FinalizarNegociacion Skeleton */}
          <ZenCard>
            <ZenCardHeader>
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div className="h-24 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      </div>
    </div>
  );
}
