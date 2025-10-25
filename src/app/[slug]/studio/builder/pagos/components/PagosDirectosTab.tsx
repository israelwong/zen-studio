'use client';

import { useState } from 'react';
import { Banknote, Building2, AlertCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenInput } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { toast } from 'sonner';

interface PagosDirectosTabProps {
    studioSlug: string;
}

export function PagosDirectosTab({ studioSlug }: PagosDirectosTabProps) {
    const [habilitado, setHabilitado] = useState(false);
    const [cuentaBancaria, setCuentaBancaria] = useState({
        banco: '',
        numeroCuenta: '',
        titular: '',
        clabe: ''
    });

    const handleSave = () => {
        toast.success('Configuración de pagos directos guardada');
    };

    return (
        <div className="space-y-6">
            {/* Configuración Principal */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-400" />
                        Pagos Directos
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Configura los pagos directos a cuenta bancaria del negocio
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Habilitar pagos directos</p>
                            <p className="text-xs text-zinc-400">
                                Los clientes podrán pagar directamente a tu cuenta bancaria
                            </p>
                        </div>
                        <Switch
                            checked={habilitado}
                            onCheckedChange={setHabilitado}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información Bancaria */}
            {habilitado && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            Información Bancaria
                        </ZenCardTitle>
                        <ZenCardDescription>
                            Datos de la cuenta bancaria para recibir pagos
                        </ZenCardDescription>
                    </ZenCardHeader>
                    <ZenCardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenInput
                                label="Banco"
                                placeholder="Nombre del banco"
                                value={cuentaBancaria.banco}
                                onChange={(e) => setCuentaBancaria(prev => ({ ...prev, banco: e.target.value }))}
                            />
                            <ZenInput
                                label="Número de Cuenta"
                                placeholder="1234567890"
                                value={cuentaBancaria.numeroCuenta}
                                onChange={(e) => setCuentaBancaria(prev => ({ ...prev, numeroCuenta: e.target.value }))}
                            />
                            <ZenInput
                                label="Titular"
                                placeholder="Nombre del titular"
                                value={cuentaBancaria.titular}
                                onChange={(e) => setCuentaBancaria(prev => ({ ...prev, titular: e.target.value }))}
                            />
                            <ZenInput
                                label="CLABE"
                                placeholder="18 dígitos"
                                value={cuentaBancaria.clabe}
                                onChange={(e) => setCuentaBancaria(prev => ({ ...prev, clabe: e.target.value }))}
                            />
                        </div>
                        <ZenButton onClick={handleSave} className="w-full">
                            Guardar Configuración
                        </ZenButton>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Información Adicional */}
            <ZenCard variant="outline">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Ficha pendiente de implementar</h4>
                            <p className="text-xs text-zinc-400">
                                Esta funcionalidad está en desarrollo. Los pagos directos se procesarán
                                manualmente por el momento.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
