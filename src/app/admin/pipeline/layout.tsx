"use client";

import { SectionLayout } from "@/app/admin/components/section-layout";
import { TrendingUp, Headphones, Plus } from "lucide-react";

const pipelineNavigation = [
    {
        name: 'Pipeline Comercial',
        href: '/admin/pipeline',
        icon: TrendingUp,
        description: 'Gestiona las etapas del proceso de ventas'
    },
    {
        name: 'Pipeline de Soporte',
        href: '/admin/pipeline?section=soporte',
        icon: Headphones,
        description: 'Gestiona las etapas del proceso de atención al cliente'
    }
];

export default function PipelineLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SectionLayout
            title="Gestión de Pipelines"
            description="Configura las etapas de los pipelines comerciales y de soporte"
            navigationItems={pipelineNavigation}
            actionButton={{
                label: "Nueva Etapa",
                onClick: () => {
                    // Esta función se manejará en el componente hijo
                    const event = new CustomEvent('createStage');
                    window.dispatchEvent(event);
                },
                icon: Plus
            }}
        >
            {children}
        </SectionLayout>
    );
}
