"use client";

import { SectionLayout } from "@/app/admin/components/section-layout";
import {
    Gift,
    Users,
    BarChart3,
    Settings,
    Home
} from "lucide-react";

const discountNavigation = [
    {
        name: 'Dashboard',
        href: '/admin/descuentos',
        icon: Home,
        description: 'Vista general de descuentos'
    },
    {
        name: 'Códigos Generales',
        href: '/admin/descuentos/general',
        icon: Gift,
        description: 'Códigos de descuento generales'
    },
    {
        name: 'Códigos de Agentes',
        href: '/admin/descuentos/agentes',
        icon: Users,
        description: 'Códigos generados por agentes'
    },
    {
        name: 'Reportes',
        href: '/admin/descuentos/reportes',
        icon: BarChart3,
        description: 'Estadísticas y métricas'
    },
    {
        name: 'Configuración',
        href: '/admin/descuentos/configuracion',
        icon: Settings,
        description: 'Configuración global'
    }
];

export default function DescuentosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SectionLayout
            title="Descuentos"
            description="Gestiona códigos de descuento y promociones"
            navigationItems={discountNavigation}
        >
            {children}
        </SectionLayout>
    );
}
