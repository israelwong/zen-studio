// src/components/setup/SetupSectionsGrid.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import {
    CheckCircle,
    AlertCircle,
    Clock,
    ArrowRight,
    Building2,
    DollarSign,
    Package,
    Users2,
    Settings,
    User,
    Zap,
    FileText,
    CreditCard,
    Banknote,
    Gift,
    Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { SetupSectionProgress } from '@/types/setup-validation';

interface SetupSectionsGridProps {
    sections: SetupSectionProgress[];
    studioSlug: string;
}

const SECTION_CONFIG = {
    // Estudio
    'estudio_identidad': {
        icon: Building2,
        href: '/configuracion/estudio/identidad',
        category: 'Estudio'
    },
    'estudio_contacto': {
        icon: User,
        href: '/configuracion/estudio/contacto',
        category: 'Estudio'
    },
    'estudio_redes_sociales': {
        icon: Zap,
        href: '/configuracion/estudio/redes-sociales',
        category: 'Estudio'
    },
    'estudio_horarios': {
        icon: Clock,
        href: '/configuracion/estudio/horarios',
        category: 'Estudio'
    },

    // Negocio
    'negocio_precios': {
        icon: DollarSign,
        href: '/configuracion/negocio/precios-y-utilidad',
        category: 'Negocio'
    },
    'negocio_condiciones': {
        icon: FileText,
        href: '/configuracion/negocio/condiciones-comerciales',
        category: 'Negocio'
    },
    'negocio_metodos_pago': {
        icon: CreditCard,
        href: '/configuracion/negocio/metodos-de-pago',
        category: 'Negocio'
    },
    'negocio_cuentas_bancarias': {
        icon: Banknote,
        href: '/configuracion/negocio/cuentas-bancarias',
        category: 'Negocio'
    },

    // Catálogo
    'catalogo_servicios': {
        icon: Package,
        href: '/commercial/catalogo',
        category: 'Catálogo'
    },
    'catalogo_paquetes': {
        icon: Gift,
        href: '/commercial/catalogo',
        category: 'Catálogo'
    },
    'catalogo_especialidades': {
        icon: Star,
        href: '/commercial/catalogo',
        category: 'Catálogo'
    },

    // Equipo
    'equipo_personal': {
        icon: Users2,
        href: '/configuracion/negocio/personal',
        category: 'Equipo'
    }
};

export function SetupSectionsGrid({ sections, studioSlug }: SetupSectionsGridProps) {
    const getStatusIcon = (section: SetupSectionProgress) => {
        switch (section.status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'in_progress':
                return <Clock className="h-5 w-5 text-yellow-400" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-400" />;
            default:
                return <AlertCircle className="h-5 w-5 text-zinc-500" />;
        }
    };

    const getStatusBadge = (section: SetupSectionProgress) => {
        switch (section.status) {
            case 'completed':
                return (
                    <Badge variant="outline" className="border-green-500 text-green-400">
                        Completado
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                        En Progreso
                    </Badge>
                );
            case 'error':
                return (
                    <Badge variant="outline" className="border-red-500 text-red-400">
                        Error
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="border-zinc-500 text-zinc-400">
                        Pendiente
                    </Badge>
                );
        }
    };

    const getCardBorderClass = (section: SetupSectionProgress) => {
        switch (section.status) {
            case 'completed':
                return 'border-green-500/50 bg-green-950/20';
            case 'in_progress':
                return 'border-yellow-500/50 bg-yellow-950/20';
            case 'error':
                return 'border-red-500/50 bg-red-950/20';
            default:
                return 'border-zinc-700 bg-zinc-900';
        }
    };

    // Agrupar secciones por categoría
    const groupedSections = sections.reduce((acc, section) => {
        const config = SECTION_CONFIG[section.id as keyof typeof SECTION_CONFIG];
        const category = config?.category || 'Otros';

        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(section);

        return acc;
    }, {} as Record<string, SetupSectionProgress[]>);

    const categoryOrder = ['Estudio', 'Negocio', 'Catálogo', 'Equipo', 'Otros'];

    return (
        <div className="space-y-8">
            {categoryOrder.map((category, categoryIndex) => {
                const categorySections = groupedSections[category];
                if (!categorySections || categorySections.length === 0) return null;

                return (
                    <div key={`category-${categoryIndex}-${category}`} className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-semibold text-white">{category}</h2>
                            <div className="flex-1 border-t border-zinc-700"></div>
                        </div>

                        <div className="space-y-2">
                            {categorySections.map((section, sectionIndex) => {
                                const config = SECTION_CONFIG[section.id as keyof typeof SECTION_CONFIG];
                                const Icon = config?.icon || Settings;
                                const href = `/studio/${studioSlug}${config?.href || '/configuracion'}`;

                                return (
                                    <div
                                        key={`${category}-${sectionIndex}-${section.id}`}
                                        className={`flex items-center space-x-4 p-3 rounded-lg border transition-colors hover:bg-zinc-800/50 ${getCardBorderClass(section)}`}
                                    >
                                        {/* Columna 1: Nombre con icono */}
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-white truncate">
                                                {section.name}
                                            </span>
                                        </div>

                                        {/* Columna 2: Barra de progreso */}
                                        <div className="flex items-center space-x-2 w-24">
                                            <div className="w-full bg-zinc-700 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${section.status === 'completed'
                                                        ? 'bg-green-500'
                                                        : section.status === 'in_progress'
                                                            ? 'bg-yellow-500'
                                                            : section.status === 'error'
                                                                ? 'bg-red-500'
                                                                : 'bg-zinc-600'
                                                        }`}
                                                    style={{ width: `${section.completionPercentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-zinc-400 w-8 text-right">
                                                {section.completionPercentage}%
                                            </span>
                                        </div>

                                        {/* Columna 3: Estado y acción */}
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(section)}
                                            <Link href={href}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7 px-3"
                                                >
                                                    {section.status === 'completed' ? 'Revisar' : 'Configurar'}
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
