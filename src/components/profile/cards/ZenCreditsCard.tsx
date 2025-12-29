'use client';

import React from 'react';
import Link from 'next/link';
import { usePlatformName, usePlatformDomain } from '@/hooks/usePlatformConfig';

/**
 * ZenCreditsCard - Versión minimalista del ProfileFooter para sidebar desktop
 * Sin card, solo línea decorativa y créditos ZEN México
 */
export function ZenCreditsCard() {
    const companyName = usePlatformName();
    const domain = usePlatformDomain();
    const domainUrl = domain ? `https://${domain}` : '/';

    return (
        <div className="pt-4">
            {/* Línea decorativa superior */}
            <div className="h-px bg-linear-to-r from-transparent via-zinc-700 to-transparent mb-4" />

            {/* Créditos ZEN - Minimalista */}
            <div className="text-center space-y-1">
                <p className="text-zinc-500 text-xs font-light">
                    by <Link href={domainUrl} className="font-semibold text-zinc-400 hover:text-zinc-300 transition-colors">{companyName}</Link> {new Date().getFullYear()}
                </p>
                <p className="text-zinc-500 text-xs font-light">
                    todos los derechos reservados
                </p>
                <Link
                    href={domainUrl}
                    className="block text-zinc-500 text-xs font-light hover:text-zinc-400 transition-colors duration-200"
                >
                    {domain || 'www.zenn.mx'}
                </Link>
            </div>
        </div>
    );
}
