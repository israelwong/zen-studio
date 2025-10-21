'use client';

import React from 'react';
import { Bell, Sparkles, ExternalLink } from 'lucide-react';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { ZenButton } from '@/components/ui/zen';
import { useZenMagicChat } from './ZenMagic';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';

interface AppHeaderProps {
    studioSlug: string;
}

export function AppHeader({ studioSlug }: AppHeaderProps) {
    const { isOpen, toggleChat } = useZenMagicChat();

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center">
                <BreadcrumbHeader studioSlug={studioSlug} />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Badge de Almacenamiento */}
                <StorageBadge studioSlug={studioSlug} />

                {/* Botones ocultos en mobile */}
                <ZenButton variant="ghost" size="icon" className="rounded-full hidden lg:flex">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notificaciones</span>
                </ZenButton>

                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-zinc-400 hover:text-zinc-200 hidden lg:flex"
                    onClick={() => window.open(`/${studioSlug}`, '_blank')}
                    title="Ver página pública"
                >
                    <ExternalLink className="h-5 w-5" />
                    <span className="sr-only">Ver página pública</span>
                </ZenButton>

                <ZenButton
                    variant="ghost"
                    size="icon"
                    className={`rounded-full ${isOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200'} hidden lg:flex`}
                    onClick={toggleChat}
                >
                    <Sparkles className="h-5 w-5" />
                    <span className="sr-only">ZEN Magic</span>
                </ZenButton>

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
