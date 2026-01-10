'use client';

import React from 'react';
import { SectionLayout } from '@/app/admin/components/section-layout';
import { Play, History, Settings, Plus } from 'lucide-react';

const campaignNavigation = [
    {
        name: 'Activas',
        href: '/admin/campanas/activas',
        icon: Play,
        description: 'Campañas en curso'
    },
    {
        name: 'Historial',
        href: '/admin/campanas/historial',
        icon: History,
        description: 'Campañas finalizadas'
    },
    {
        name: 'Plataformas',
        href: '/admin/campanas/plataformas',
        icon: Settings,
        description: 'Gestionar plataformas'
    }
];

export default function CampanasLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SectionLayout
            title="Campañas"
            description="Gestiona tus campañas de marketing"
            navigationItems={campaignNavigation}
            actionButton={{
                label: "Nueva Campaña",
                href: "/admin/campanas/activas",
                icon: "Plus"
            }}
        >
            {children}
        </SectionLayout>
    );
}
