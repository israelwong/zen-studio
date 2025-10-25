"use client";

import React, { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";
import { TiposEventoList } from "./TiposEventoList";
import { PaquetesAcordeonNavigation } from "./PaquetesAcordeonNavigation";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import type { PaqueteFromDB } from "@/lib/actions/schemas/paquete-schemas";

interface PaquetesNavigationWrapperProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onTiposEventoChange: (newTiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (newPaquetes: PaqueteFromDB[]) => void;
}

type NavigationMode = "accordion" | "navigator";

export function PaquetesNavigationWrapper({
    studioSlug,
    tiposEvento,
    paquetes,
    onNavigateToTipoEvento,
    onTiposEventoChange,
    onPaquetesChange,
}: PaquetesNavigationWrapperProps) {
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
                    </div>
                </div>

                <div className="text-xs text-zinc-500">
                    {navigationMode === "accordion"
                        ? "Vista expandible con drag & drop"
                        : "Navegación por niveles con breadcrumbs"
                    }
                </div>
            </div>

            {/* Contenido según el modo seleccionado */}
            {navigationMode === "accordion" ? (
                <PaquetesAcordeonNavigation
                    studioSlug={studioSlug}
                    tiposEvento={tiposEvento}
                    paquetes={paquetes}
                    onNavigateToTipoEvento={onNavigateToTipoEvento}
                    onTiposEventoChange={onTiposEventoChange}
                    onPaquetesChange={onPaquetesChange}
                />
            ) : (
                <TiposEventoList
                    studioSlug={studioSlug}
                    tiposEvento={tiposEvento}
                    paquetes={paquetes}
                    onNavigateToTipoEvento={onNavigateToTipoEvento}
                    onTiposEventoChange={onTiposEventoChange}
                    onPaquetesChange={onPaquetesChange}
                />
            )}
        </div>
    );
}
