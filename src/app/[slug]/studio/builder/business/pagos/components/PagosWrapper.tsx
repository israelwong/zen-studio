'use client';

import { useState } from 'react';
import { CreditCard, Banknote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { PagosDirectosTab } from './PagosDirectosTab';
import { PagosStripeTab } from './PagosStripeTab';

type TabType = 'directos' | 'stripe';

interface PagosWrapperProps {
    studioSlug: string;
}

export function PagosWrapper({ studioSlug }: PagosWrapperProps) {
    const [activeTab, setActiveTab] = useState<TabType>('directos');

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-800/50 p-1 rounded-lg">
                <TabsTrigger
                    value="directos"
                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-green-400 data-[state=active]:shadow-lg transition-all duration-200"
                >
                    <Banknote className="h-4 w-4" />
                    <span>Pagos Directos</span>
                </TabsTrigger>
                <TabsTrigger
                    value="stripe"
                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-green-400 data-[state=active]:shadow-lg transition-all duration-200"
                >
                    <CreditCard className="h-4 w-4" />
                    <span>Stripe</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="directos">
                <PagosDirectosTab studioSlug={studioSlug} />
            </TabsContent>

            <TabsContent value="stripe">
                <PagosStripeTab studioSlug={studioSlug} />
            </TabsContent>
        </Tabs>
    );
}
