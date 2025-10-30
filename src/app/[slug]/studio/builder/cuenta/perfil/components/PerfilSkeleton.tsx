'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';

export function PerfilSkeleton() {
    return (
        <div className="space-y-6 max-w-screen-lg mx-auto my-16">
            {/* Header Navigation Skeleton */}
            <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900/40 via-zinc-900/20 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-xl shadow-2xl shadow-black/10 p-6 md:p-8">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Título skeleton */}
                    <div className="space-y-2">
                        <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-zinc-700 rounded animate-pulse" />
                    </div>

                    {/* Botón skeleton */}
                    <div className="h-10 w-32 bg-zinc-700 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Formulario skeleton */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                        <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Campo Nombre */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                            <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                        </div>
                        <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                    </div>

                    {/* Campo Email */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                            <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
                        </div>
                        <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                    </div>

                    {/* Campo Teléfono */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                        </div>
                        <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                    </div>

                    {/* Botón skeleton */}
                    <div className="flex justify-end pt-4">
                        <div className="h-10 w-40 bg-zinc-700 rounded-lg animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
