'use client';

import { useState } from 'react';
import { Eye, EyeOff, UserCheck, UserX, List, Grid } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';

interface PaquetesConfiguracionProps {
    studioSlug: string;
}

export function PaquetesConfiguracion({ studioSlug }: PaquetesConfiguracionProps) {
    // Estados hardcodeados para presentación
    const [visibleEnMenu, setVisibleEnMenu] = useState(true);
    const [requiereRegistro, setRequiereRegistro] = useState(false);
    const [vistaEnPantalla, setVistaEnPantalla] = useState<'lista' | 'reticula'>('lista');

    return (
        <div className="space-y-6">
            {/* Configuración de Visibilidad */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-400" />
                        Visibilidad en Menú
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Controla si los paquetes son visibles en el menú de navegación del sitio
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Visible en menú de navegación</p>
                            <p className="text-xs text-zinc-400">
                                Los paquetes aparecerán en el menú principal del sitio
                            </p>
                        </div>
                        <Switch
                            checked={visibleEnMenu}
                            onCheckedChange={setVisibleEnMenu}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración de Registro */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        {requiereRegistro ? (
                            <UserCheck className="h-5 w-5 text-green-400" />
                        ) : (
                            <UserX className="h-5 w-5 text-zinc-400" />
                        )}
                        Requisitos de Acceso
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Define si los visitantes necesitan registrarse para ver los paquetes
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Requiere registro</p>
                            <p className="text-xs text-zinc-400">
                                Solo las personas que llenen un lead form podrán ver los paquetes
                            </p>
                        </div>
                        <Switch
                            checked={requiereRegistro}
                            onCheckedChange={setRequiereRegistro}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración de Vista */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        {vistaEnPantalla === 'lista' ? (
                            <List className="h-5 w-5 text-blue-400" />
                        ) : (
                            <Grid className="h-5 w-5 text-blue-400" />
                        )}
                        Vista en Pantalla
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Selecciona cómo se mostrarán los paquetes en el sitio
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-white">Vista en lista</p>
                                <p className="text-xs text-zinc-400">
                                    Los paquetes se muestran en formato de lista vertical
                                </p>
                            </div>
                            <Switch
                                checked={vistaEnPantalla === 'lista'}
                                onCheckedChange={(checked) => checked && setVistaEnPantalla('lista')}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-white">Vista en retícula</p>
                                <p className="text-xs text-zinc-400">
                                    Los paquetes se muestran en formato de cuadrícula
                                </p>
                            </div>
                            <Switch
                                checked={vistaEnPantalla === 'reticula'}
                                onCheckedChange={(checked) => checked && setVistaEnPantalla('reticula')}
                            />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información Adicional */}
            <ZenCard variant="outline">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Eye className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Configuración de Presentación</h4>
                            <p className="text-xs text-zinc-400">
                                Esta configuración afecta cómo se muestran los paquetes en el sitio web público. 
                                Los cambios se aplicarán inmediatamente.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
