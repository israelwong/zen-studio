"use client";

import { SectionLayout } from "@/app/admin/components/section-layout";
import { Settings, FolderOpen } from "lucide-react";

const servicesNavigation = [
    {
        name: 'Servicios',
        href: '/admin/services',
        icon: Settings,
        description: 'Gestiona todos los servicios'
    },
    {
        name: 'Categorías',
        href: '/admin/services/categorias',
        icon: FolderOpen,
        description: 'Organiza servicios por categorías'
    }
];

export default function ServicesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SectionLayout
            title="Servicios"
            description="Administra los servicios disponibles para configurar límites en los planes"
            navigationItems={servicesNavigation}
        >
            {children}
        </SectionLayout>
    );
}
