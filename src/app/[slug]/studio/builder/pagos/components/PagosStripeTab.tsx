'use client';

import { useState } from 'react';
import { CreditCard, Settings, AlertCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenInput } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { toast } from 'sonner';

interface PagosStripeTabProps {
    studioSlug: string;
}

export function PagosStripeTab({ studioSlug }: PagosStripeTabProps) {
    const [habilitado, setHabilitado] = useState(false);
    const [configuracionStripe, setConfiguracionStripe] = useState({
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
    });

    const handleSave = () => {
        toast.success('Configuración de Stripe guardada');
    };

    return (
        <div className="space-y-6">
            {/* Configuración Principal */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-400" />
                        Integración Stripe
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Configura la integración con Stripe para pagos con tarjeta
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Habilitar Stripe</p>
                            <p className="text-xs text-zinc-400">
                                Los clientes podrán pagar con tarjeta de crédito/débito
                            </p>
                        </div>
                        <Switch
                            checked={habilitado}
                            onCheckedChange={setHabilitado}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración Stripe */}
            {habilitado && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-400" />
                            Configuración Stripe
                        </ZenCardTitle>
                        <ZenCardDescription>
                            Claves de API de Stripe para procesar pagos
                        </ZenCardDescription>
                    </ZenCardHeader>
                    <ZenCardContent className="space-y-4">
                        <div className="space-y-4">
                            <ZenInput
                                label="Clave Pública (pk_...)"
                                placeholder="pk_test_..."
                                value={configuracionStripe.publicKey}
                                onChange={(e) => setConfiguracionStripe(prev => ({ ...prev, publicKey: e.target.value }))}
                            />
                            <ZenInput
                                label="Clave Secreta (sk_...)"
                                placeholder="sk_test_..."
                                type="password"
                                value={configuracionStripe.secretKey}
                                onChange={(e) => setConfiguracionStripe(prev => ({ ...prev, secretKey: e.target.value }))}
                            />
                            <ZenInput
                                label="Webhook Secret (whsec_...)"
                                placeholder="whsec_..."
                                type="password"
                                value={configuracionStripe.webhookSecret}
                                onChange={(e) => setConfiguracionStripe(prev => ({ ...prev, webhookSecret: e.target.value }))}
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
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Ficha pendiente de implementar</h4>
                            <p className="text-xs text-zinc-400">
                                Esta funcionalidad está en desarrollo. La integración con Stripe
                                se implementará en futuras versiones.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
