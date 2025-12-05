'use client';

import React, { useState, useEffect } from 'react';
import { Search, Inbox } from 'lucide-react';
import Link from 'next/link';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { UserAvatar } from '@/components/auth/user-avatar';
import { StorageBadge } from './StorageBadge';
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';
import { ZenButton } from '@/components/ui/zen';

interface AppHeaderProps {
    studioSlug: string;
    onCommandOpen?: () => void;
}

export function AppHeader({ studioSlug, onCommandOpen }: AppHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isMac, setIsMac] = useState(false);

    // Evitar problemas de hidratación con Radix UI
    useEffect(() => {
        setIsMounted(true);
        setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center">
                <BreadcrumbHeader studioSlug={studioSlug} />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">

                {/* Badge de Almacenamiento - oculto en mobile */}
                <div className="hidden md:block">
                    <StorageBadge studioSlug={studioSlug} />
                </div>

                {/* Inbox - Conversaciones */}
                <Link
                    href={`/${studioSlug}/studio/commercial/inbox`}
                    className="relative"
                >
                    <ZenButton
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full text-zinc-400 hover:text-zinc-200 transition-all"
                        title="Inbox"
                    >
                        <Inbox className="h-5 w-5" />
                        {/* Badge de contador - preparado para futuro */}
                        {/* {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )} */}
                    </ZenButton>
                </Link>

                {/* Notificaciones */}
                <NotificationsDropdown studioSlug={studioSlug} />

                {/* Botón de Comando (⌘K / Ctrl+K) */}
                {isMounted && (
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hidden md:flex gap-2 px-4 border border-zinc-700"
                        onClick={onCommandOpen}
                    >
                        <Search className="h-4 w-4" />
                        <span className="text-sm text-zinc-600">Buscar...</span>
                        <span className="text-xs ml-auto">{isMac ? '⌘' : 'Ctrl'}+K</span>
                    </ZenButton>
                )}

                {/* Avatar del usuario - siempre visible */}
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}
