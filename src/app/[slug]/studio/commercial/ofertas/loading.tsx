import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Megaphone } from 'lucide-react';

export default function OfertasLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Megaphone className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Ofertas Comerciales</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tus ofertas, landing pages y formularios de captura de leads
                                </ZenCardDescription>
                            </div>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
