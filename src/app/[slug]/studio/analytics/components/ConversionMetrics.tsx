'use client';

import React from 'react';
import { Target, TrendingUp, MousePointerClick, DollarSign, Percent, Calendar, Eye } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import Image from 'next/image';

export function ConversionMetricsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                    <div className="h-6 w-48 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Main Metrics Skeleton */}
            <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((index) => (
                        <ZenCard key={index} className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="h-9 w-9 bg-zinc-800/50 rounded-lg animate-pulse" />
                            </div>
                            <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse mb-2" />
                            <div className="h-8 w-20 bg-zinc-800/50 rounded animate-pulse mb-1" />
                            <div className="h-3 w-40 bg-zinc-800/50 rounded animate-pulse" />
                        </ZenCard>
                    ))}
                </div>
            </div>

            {/* Funnel Card Skeleton */}
            <ZenCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 bg-zinc-800/50 rounded-lg animate-pulse" />
                    <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                            <div className="flex-1">
                                <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse mb-1.5" />
                                <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse" />
                            </div>
                            <div className="h-6 w-16 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </ZenCard>
        </div>
    );
}

interface ConversionMetricsProps {
    data: {
        totalSubmissions: number;
        totalLandingVisits: number;
        totalLeadformVisits: number;
        conversionRate: number;
        clickThroughRate: number;
        totalConversionValue: number;
        packagesByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
        topPackages: Array<{ id: string; name: string; coverUrl: string | null; categoryName: string; clicks: number }>;
        eventsConvertedThisMonth: number;
        pendingPromises: number;
    };
}

export function ConversionMetrics({ data }: ConversionMetricsProps) {
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
        return `$${num.toFixed(0)}`;
    };

    const formatPercent = (num: number): string => {
        return `${num.toFixed(1)}%`;
    };

    const cards = [
        {
            title: 'Total Conversiones',
            value: data.totalSubmissions,
            icon: Target,
            description: 'Formularios completados',
            color: 'text-emerald-400',
            bgColor: 'from-emerald-500/10 to-emerald-500/5',
            borderColor: 'border-emerald-500/20',
        },
        {
            title: 'Tasa de Conversión',
            value: data.conversionRate,
            icon: Percent,
            description: 'Submissions / Visitas Leadform',
            color: 'text-blue-400',
            bgColor: 'from-blue-500/10 to-blue-500/5',
            borderColor: 'border-blue-500/20',
            isPercent: true,
        },
        {
            title: 'Click Through Rate',
            value: data.clickThroughRate,
            icon: TrendingUp,
            description: 'Leadform / Landing',
            color: 'text-purple-400',
            bgColor: 'from-purple-500/10 to-purple-500/5',
            borderColor: 'border-purple-500/20',
            isPercent: true,
        },
        {
            title: 'Valor Total',
            value: data.totalConversionValue,
            icon: DollarSign,
            description: 'Valor de conversiones',
            color: 'text-yellow-400',
            bgColor: 'from-yellow-500/10 to-yellow-500/5',
            borderColor: 'border-yellow-500/20',
            isCurrency: true,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => (
                    <ZenCard key={index} className="p-5 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className="relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.bgColor} border ${card.borderColor}`}>
                                    <card.icon className={`w-4 h-4 ${card.color}`} />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-zinc-400 mb-2">
                                {card.title}
                            </p>
                            <p className={`text-2xl font-bold ${card.color} mb-1`}>
                                {card.isPercent
                                    ? formatPercent(card.value)
                                    : card.isCurrency
                                        ? formatNumber(card.value)
                                        : card.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500 line-clamp-1">
                                {card.description}
                            </p>
                        </div>
                    </ZenCard>
                ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funnel de Conversión */}
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10">
                            <MousePointerClick className="w-4 h-4 text-cyan-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Funnel de Conversión</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Visitas Landing</p>
                                <p className="text-sm text-zinc-300 mt-0.5">Usuarios que vieron la oferta</p>
                            </div>
                            <p className="text-lg font-bold text-white">
                                {data.totalLandingVisits.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Visitas Leadform</p>
                                <p className="text-sm text-zinc-300 mt-0.5">Usuarios que vieron el formulario</p>
                            </div>
                            <p className="text-lg font-bold text-blue-400">
                                {data.totalLeadformVisits.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Conversiones</p>
                                <p className="text-sm text-zinc-300 mt-0.5">Formularios completados</p>
                            </div>
                            <p className="text-lg font-bold text-emerald-400">
                                {data.totalSubmissions.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </ZenCard>

                {/* Eventos y Promesas */}
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-purple-500/10">
                            <Calendar className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Promesas y Eventos</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Promesas Pendientes</p>
                                <p className="text-sm text-zinc-300 mt-0.5">Requieren atención</p>
                            </div>
                            <p className="text-lg font-bold text-orange-400">
                                {data.pendingPromises.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Eventos Convertidos</p>
                                <p className="text-sm text-zinc-300 mt-0.5">En el período seleccionado</p>
                            </div>
                            <p className="text-lg font-bold text-purple-400">
                                {data.eventsConvertedThisMonth.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </ZenCard>
            </div>

            {/* Top Paquetes Más Vistos */}
            {data.topPackages.length > 0 && (
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Eye className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Paquetes Más Vistos</h3>
                    </div>
                    <div className="space-y-3">
                        {data.topPackages.map((pkg, index) => (
                            <div key={pkg.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                {/* Ranking */}
                                <div className="flex-shrink-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400' :
                                            index === 1 ? 'bg-gradient-to-br from-zinc-400/20 to-zinc-600/20 border border-zinc-400/30 text-zinc-300' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 text-orange-400' :
                                                    'bg-zinc-800/50 border border-zinc-700 text-zinc-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                </div>

                                {/* Cover Image */}
                                {pkg.coverUrl && (
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700">
                                        <Image
                                            src={pkg.coverUrl}
                                            alt={pkg.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}

                                {/* Content Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate mb-1">
                                        {pkg.name}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {pkg.categoryName}
                                    </p>
                                </div>

                                {/* Clicks */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Eye className="w-4 h-4 text-zinc-500" />
                                    <span className="text-sm font-semibold text-white">
                                        {pkg.clicks.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ZenCard>
            )}
        </div>
    );
}
