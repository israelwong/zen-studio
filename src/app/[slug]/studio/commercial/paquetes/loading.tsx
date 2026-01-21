import { PaquetesSkeleton } from './PaquetesSkeleton';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Package } from 'lucide-react';

export default function PaquetesLoading() {
    return (
        <div className="space-y-6">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <Package className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Paquetes</ZenCardTitle>
                                <ZenCardDescription>
                                    Crea y gestiona paquetes de servicios
                                </ZenCardDescription>
                            </div>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <PaquetesSkeleton />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
