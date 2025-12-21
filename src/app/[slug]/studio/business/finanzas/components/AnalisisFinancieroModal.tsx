'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ZenDialog } from '@/components/ui/zen';
import { obtenerAnalisisFinanciero, type AnalisisFinancieroData } from '@/lib/actions/studio/business/finanzas';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { formatCurrency } from '@/lib/actions/utils/formatting';

interface AnalisisFinancieroModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studioSlug: string;
    month: Date;
}

const COLORS = {
    ingresos: '#10b981',
    egresos: '#ef4444',
    utilidad: '#3b82f6',
    pie: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
};

export function AnalisisFinancieroModal({ open, onOpenChange, studioSlug, month }: AnalisisFinancieroModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalisisFinancieroData | null>(null);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, month, studioSlug]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await obtenerAnalisisFinanciero(studioSlug, month);
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Error cargando análisis financiero:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ZenDialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title="Análisis Financiero"
            description={month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            maxWidth="5xl"
            closeOnClickOutside={false}
        >
            {loading ? (
                <div className="space-y-8 py-2">
                    <div className="grid grid-cols-3 gap-6">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : data ? (
                <div className="space-y-8 py-2">
                    {/* Balance */}
                    <div className="grid grid-cols-3 gap-6 border-b border-zinc-800 pb-6">
                        <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Ingresos</p>
                            <p className="text-3xl font-light text-emerald-400">
                                {formatCurrency(data.balance.ingresos)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Egresos</p>
                            <p className="text-3xl font-light text-rose-400">
                                {formatCurrency(data.balance.egresos)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Utilidad</p>
                            <p
                                className={`text-3xl font-light ${
                                    data.balance.utilidad >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {formatCurrency(data.balance.utilidad)}
                            </p>
                        </div>
                    </div>

                    {/* Ingresos por Evento */}
                    <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
                            Ingresos por Evento
                        </h3>
                        {data.ingresosPorEvento.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.ingresosPorEvento} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="evento"
                                        stroke="#71717a"
                                        fontSize={11}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        tick={{ fill: '#71717a' }}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={11}
                                        tick={{ fill: '#71717a' }}
                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#18181b',
                                            border: '1px solid #27272a',
                                            borderRadius: '6px',
                                            padding: '8px 12px',
                                        }}
                                        formatter={(value: number) => formatCurrency(value)}
                                        labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                                    />
                                    <Bar dataKey="monto" fill={COLORS.ingresos} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                                No hay ingresos registrados
                            </div>
                        )}
                    </div>

                    {/* Egresos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
                                Egresos por Categoría
                            </h3>
                            {data.egresosPorCategoria.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={data.egresosPorCategoria} layout="vertical" barSize={24}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            stroke="#71717a"
                                            fontSize={11}
                                            tick={{ fill: '#71717a' }}
                                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            dataKey="categoria"
                                            type="category"
                                            stroke="#71717a"
                                            fontSize={11}
                                            width={80}
                                            tick={{ fill: '#71717a' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                            }}
                                            formatter={(value: number) => formatCurrency(value)}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                                        />
                                        <Bar dataKey="monto" fill={COLORS.egresos} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                                    No hay egresos registrados
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
                                Distribución de Egresos
                            </h3>
                            {data.egresosPorCategoria.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={data.egresosPorCategoria}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={70}
                                            innerRadius={30}
                                            dataKey="monto"
                                        >
                                            {data.egresosPorCategoria.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS.pie[index % COLORS.pie.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                            }}
                                            formatter={(value: number) => formatCurrency(value)}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                                    No hay egresos registrados
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center text-zinc-500 text-sm">
                    No se pudieron cargar los datos
                </div>
            )}
        </ZenDialog>
    );
}

