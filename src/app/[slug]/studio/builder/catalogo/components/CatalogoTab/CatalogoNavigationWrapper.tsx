"use client";

import React, { useState } from "react";
import { LayoutGrid, List, TreePine } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";
import { CatalogoContainer } from "./CatalogoContainer";
import { CatalogoAcordeonNavigation } from "./CatalogoAcordeonNavigation";
import { CatalogoHierarchyView } from "./CatalogoHierarchyView";

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

interface CatalogoNavigationWrapperProps {
    studioSlug: string;
    secciones: Seccion[];
    onNavigateToUtilidad?: () => void;
}

type NavigationMode = "accordion" | "navigator" | "hierarchy";

export function CatalogoNavigationWrapper({
    studioSlug,
    secciones,
    onNavigateToUtilidad,
}: CatalogoNavigationWrapperProps) {
    const [navigationMode, setNavigationMode] = useState<NavigationMode>("accordion");

    return (
        <div className="space-y-4">
            {/* Toggle de navegación */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Vista:</span>
                    <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                        <ZenButton
                            onClick={() => setNavigationMode("accordion")}
                            variant={navigationMode === "accordion" ? "primary" : "ghost"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Acordeón
                        </ZenButton>
                        <ZenButton
                            onClick={() => setNavigationMode("navigator")}
                            variant={navigationMode === "navigator" ? "primary" : "ghost"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <List className="w-4 h-4" />
                            Navegador
                        </ZenButton>
                        <ZenButton
                            onClick={() => setNavigationMode("hierarchy")}
                            variant={navigationMode === "hierarchy" ? "primary" : "ghost"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <TreePine className="w-4 h-4" />
                            Jerárquica
                        </ZenButton>
                    </div>
                </div>

                <div className="text-xs text-zinc-500">
                    {navigationMode === "accordion"
                        ? "Vista expandible con drag & drop"
                        : navigationMode === "navigator"
                        ? "Navegación por niveles con breadcrumbs"
                        : "Vista jerárquica con todos los niveles visibles"
                    }
                </div>
            </div>

            {/* Contenido según el modo seleccionado */}
            {navigationMode === "accordion" ? (
                <CatalogoAcordeonNavigation
                    studioSlug={studioSlug}
                    secciones={secciones}
                    onNavigateToUtilidad={onNavigateToUtilidad}
                />
            ) : navigationMode === "navigator" ? (
                <CatalogoContainer
                    studioSlug={studioSlug}
                    secciones={secciones}
                    onNavigateToUtilidad={onNavigateToUtilidad}
                />
            ) : (
                <CatalogoHierarchyView
                    studioSlug={studioSlug}
                    secciones={secciones}
                    onNavigateToUtilidad={onNavigateToUtilidad}
                />
            )}
        </div>
    );
}
