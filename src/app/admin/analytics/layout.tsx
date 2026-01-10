"use client";

import { SectionLayout } from "@/app/admin/components/section-layout";
import { Target, Users, DollarSign, BarChart3 } from "lucide-react";

const analyticsNavigation = [
    {
        name: 'Marketing',
        href: '/admin/analytics/marketing',
        icon: Target,
        description: 'Métricas de marketing y campañas'
    },
    {
        name: 'Ventas',
        href: '/admin/analytics/ventas',
        icon: Users,
        description: 'Rendimiento de ventas y agentes'
    },
    {
        name: 'Facturación',
        href: '/admin/analytics/facturacion',
        icon: DollarSign,
        description: 'Estados de facturación y pagos'
    },
    {
        name: 'Finanzas',
        href: '/admin/analytics/finanzas',
        icon: BarChart3,
        description: 'Análisis financiero y rentabilidad'
    }
];

export default function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SectionLayout
            title="Analytics"
            description="Dashboard estratégico para super administrador"
            navigationItems={analyticsNavigation}
        >
            {children}
        </SectionLayout>
    );
}
