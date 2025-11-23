'use client';

import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { UserAvatar } from '@/components/auth/user-avatar';

interface ProfileEditorHeaderProps {
    studioSlug: string;
}

export function ProfileEditorHeader({ studioSlug }: ProfileEditorHeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-zinc-900/50 px-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-zinc-300">Editor de Perfil Público</span>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
                <Link href={`/${studioSlug}`}>
                    <ZenButton
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        Ver Público
                    </ZenButton>
                </Link>
                <UserAvatar studioSlug={studioSlug} />
            </div>
        </header>
    );
}

