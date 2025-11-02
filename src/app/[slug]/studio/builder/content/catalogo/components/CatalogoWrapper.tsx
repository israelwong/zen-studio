"use client";

import React from "react";
import { CatalogoAcordeonNavigation } from "./CatalogoTab/CatalogoAcordeonNavigation";

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

interface CatalogoWrapperProps {
    studioSlug: string;
    secciones: Seccion[];
    onNavigateToUtilidad?: () => void;
}

export function CatalogoWrapper({
    studioSlug,
    secciones,
    onNavigateToUtilidad,
}: CatalogoWrapperProps) {
    return (
        <div className="space-y-4">
            <CatalogoAcordeonNavigation
                studioSlug={studioSlug}
                secciones={secciones}
            />
        </div>
    );
}
