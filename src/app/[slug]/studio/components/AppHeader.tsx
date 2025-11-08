'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, ExternalLink, Calendar } from 'lucide-react';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { useZenMagicChat } from './ZenMagic';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { AgendaUnifiedSheet } from '@/components/shared/agenda';
import { useAgendaNotifications } from '@/hooks/useAgendaNotifications';

interface AppHeaderProps {
    studioSlug: string;
}

export function AppHeader({ studioSlug }: AppHeaderProps) {
    const { isOpen, toggleChat } = useZenMagicChat();
    const [agendaOpen, setAgendaOpen] = useState(false);
    
    const { unreadCount, markAsRead } = useAgendaNotifications({
        studioSlug,
        enabled: true,
    });

    // Marcar como leído cuando se abre el sheet
    useEffect(() => {
        if (agendaOpen && unreadCount > 0) {
            markAsRead();
        }
    }, [agendaOpen, unreadCount, markAsRead]);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center">
                <BreadcrumbHeader studioSlug={studioSlug} />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Badge de Almacenamiento */}
                <StorageBadge studioSlug={studioSlug} />

                {/* Botón de Agenda */}
                <ZenButton
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full text-zinc-400 hover:text-zinc-200"
                    onClick={() => setAgendaOpen(true)}
                    title="Ver Agenda"
                >
                    <Calendar className="h-5 w-5" />
                    {unreadCount > 0 && !agendaOpen && (
                        <ZenBadge
                            variant="destructive"
                            size="sm"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold border-2 border-zinc-900"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </ZenBadge>
                    )}
                    <span className="sr-only">Ver Agenda</span>
                </ZenButton>

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

            {/* Sheet de Agenda Unificada */}
            <AgendaUnifiedSheet
                open={agendaOpen}
                onOpenChange={setAgendaOpen}
                studioSlug={studioSlug}
            />
        </header>
    );
}
