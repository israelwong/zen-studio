import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { FolderOpen } from 'lucide-react';

export default function PortafoliosLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <FolderOpen className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Portafolios</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tus proyectos y trabajos destacados
                                </ZenCardDescription>
                            </div>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="min-w-[1000px]">
                                {/* Header skeleton */}
                                <div className="border-b border-zinc-800">
                                    <div className="grid grid-cols-7 gap-4 px-4 py-4">
                                        <div className="h-4 w-8 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                {/* Rows skeleton */}
                                <div className="divide-y divide-zinc-800">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="grid grid-cols-7 gap-4 px-4 py-4">
                                            <div className="flex items-center justify-center">
                                                <div className="h-4 w-4 bg-zinc-800/50 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <div className="h-5 w-11 bg-zinc-800/50 rounded-full animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
                                                    <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse"></div>
                                                    <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <div className="h-4 w-12 bg-zinc-800/50 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
