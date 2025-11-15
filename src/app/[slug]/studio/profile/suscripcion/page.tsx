'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { CreditCard } from 'lucide-react';

export default function SuscripcionPage() {
    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                        <CreditCard className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                        <ZenCardTitle>Suscripción</ZenCardTitle>
                        <ZenCardDescription>
                            Gestiona tu plan, módulos y facturación
                        </ZenCardDescription>
                    </div>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6">
                <div className="text-center py-12 text-zinc-400">
                    <p>Página de Suscripción en desarrollo</p>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

