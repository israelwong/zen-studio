// src/components/setup/SetupRecommendations.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { Lightbulb, ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { SetupSectionProgress } from '@/types/setup-validation';

interface SetupRecommendationsProps {
    sections: SetupSectionProgress[];
    studioSlug: string;
}

export function SetupRecommendations({ sections, studioSlug }: SetupRecommendationsProps) {
    // Encontrar secciones prioritarias
    const pendingSections = sections.filter(s => s.status === 'pending');
    const errorSections = sections.filter(s => s.status === 'error');
    const inProgressSections = sections.filter(s => s.status === 'in_progress');

    // Lógica de recomendaciones
    const getRecommendations = () => {
        const recommendations = [];

        // Errores críticos primero
        if (errorSections.length > 0) {
            recommendations.push({
                type: 'error',
                title: 'Corregir Errores Críticos',
                description: `Hay ${errorSections.length} sección(es) con errores que necesitan atención inmediata.`,
                sections: errorSections.slice(0, 2),
                priority: 'high'
            });
        }

        // Secciones fundamentales pendientes
        const fundamentalSections = ['estudio_identidad', 'estudio_contacto', 'negocio_precios'];
        const pendingFundamental = pendingSections.filter(s =>
            fundamentalSections.includes(s.sectionId)
        );

        if (pendingFundamental.length > 0) {
            recommendations.push({
                type: 'fundamental',
                title: 'Completar Configuración Básica',
                description: 'Estas secciones son fundamentales para el funcionamiento de tu estudio.',
                sections: pendingFundamental,
                priority: 'high'
            });
        }

        // Secciones en progreso
        if (inProgressSections.length > 0) {
            recommendations.push({
                type: 'progress',
                title: 'Continuar Configuración',
                description: `Tienes ${inProgressSections.length} sección(es) parcialmente configurada(s).`,
                sections: inProgressSections.slice(0, 2),
                priority: 'medium'
            });
        }

        // Próximos pasos lógicos
        const completedSections = sections.filter(s => s.status === 'completed');
        if (completedSections.length > 0 && pendingSections.length > 0) {
            // Lógica de dependencias
            const nextLogicalSteps = getNextLogicalSteps(completedSections, pendingSections);

            if (nextLogicalSteps.length > 0) {
                recommendations.push({
                    type: 'next_steps',
                    title: 'Próximos Pasos Recomendados',
                    description: 'Basado en tu progreso actual, estos son los siguientes pasos lógicos.',
                    sections: nextLogicalSteps.slice(0, 2),
                    priority: 'medium'
                });
            }
        }

        return recommendations.slice(0, 3); // Máximo 3 recomendaciones
    };

    const getNextLogicalSteps = (completed: SetupSectionProgress[], pending: SetupSectionProgress[]) => {
        const completedIds = completed.map(s => s.sectionId);

        // Lógica de dependencias
        if (completedIds.includes('negocio_precios') &&
            pending.some(s => s.sectionId === 'negocio_condiciones')) {
            return pending.filter(s => s.sectionId === 'negocio_condiciones');
        }

        if (completedIds.includes('catalogo_servicios') &&
            pending.some(s => s.sectionId === 'catalogo_paquetes')) {
            return pending.filter(s => s.sectionId === 'catalogo_paquetes');
        }

        return pending.slice(0, 2);
    };

    const recommendations = getRecommendations();

    if (recommendations.length === 0) {
        return (
            <Card className="bg-green-950/20 border-green-500/50">
                <CardHeader>
                    <CardTitle className="text-green-400 flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>¡Excelente Progreso!</span>
                    </CardTitle>
                    <CardDescription className="text-green-300">
                        Has completado la configuración básica de tu estudio. Tu negocio está listo para operar.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Recomendaciones</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                    <Card
                        key={`rec-${index}-${rec.type}`}
                        className={`${rec.priority === 'high'
                            ? rec.type === 'error'
                                ? 'bg-red-950/20 border-red-500/50'
                                : 'bg-yellow-950/20 border-yellow-500/50'
                            : 'bg-blue-950/20 border-blue-500/50'
                            }`}
                    >
                        <CardHeader>
                            <CardTitle className={`flex items-center space-x-2 ${rec.priority === 'high'
                                ? rec.type === 'error'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                                : 'text-blue-400'
                                }`}>
                                {rec.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                                {rec.type === 'fundamental' && <AlertTriangle className="h-4 w-4" />}
                                {rec.type === 'progress' && <TrendingUp className="h-4 w-4" />}
                                {rec.type === 'next_steps' && <Lightbulb className="h-4 w-4" />}
                                <span className="text-sm font-medium">{rec.title}</span>
                            </CardTitle>
                            <CardDescription className={
                                rec.priority === 'high'
                                    ? rec.type === 'error'
                                        ? 'text-red-300'
                                        : 'text-yellow-300'
                                    : 'text-blue-300'
                            }>
                                {rec.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {rec.sections.map((section, sectionIndex) => {
                                const href = getSectionHref(section.sectionId, studioSlug);

                                return (
                                    <div key={`${rec.type}-${sectionIndex}-${section.sectionId}`} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">
                                                {section.sectionName}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {section.completionPercentage}% completado
                                            </p>
                                        </div>

                                        <Link href={href}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className={`${rec.priority === 'high'
                                                    ? rec.type === 'error'
                                                        ? 'border-red-600 text-red-300 hover:bg-red-800'
                                                        : 'border-yellow-600 text-yellow-300 hover:bg-yellow-800'
                                                    : 'border-blue-600 text-blue-300 hover:bg-blue-800'
                                                    }`}
                                            >
                                                {rec.type === 'error' ? 'Corregir' : 'Configurar'}
                                                <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function getSectionHref(sectionId: string, studioSlug: string): string {
    const routes: Record<string, string> = {
        'estudio_identidad': '/configuracion/estudio/identidad',
        'estudio_contacto': '/configuracion/estudio/contacto',
        'estudio_redes_sociales': '/configuracion/estudio/redes-sociales',
        'estudio_horarios': '/configuracion/estudio/horarios',
        'negocio_precios': '/configuracion/negocio/precios-y-utilidad',
        'negocio_condiciones': '/configuracion/negocio/condiciones-comerciales',
        'negocio_metodos_pago': '/configuracion/negocio/metodos-de-pago',
        'negocio_cuentas_bancarias': '/configuracion/negocio/cuentas-bancarias',
        'catalogo_servicios': '/builder/commercial/catalogo',
        'catalogo_paquetes': '/builder/commercial/catalogo',
        'catalogo_especialidades': '/builder/commercial/catalogo',
        'equipo_personal': '/configuracion/negocio/personal'
    };

    return `/studio/${studioSlug}${routes[sectionId] || '/configuracion'}`;
}
