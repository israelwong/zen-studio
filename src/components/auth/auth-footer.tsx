'use client';

import Link from 'next/link';
import { usePlatformName, usePlatformDomain } from '@/hooks/usePlatformConfig';

/**
 * AuthFooter - Footer minimalista para páginas de autenticación
 * Sin separador decorativo, solo créditos ZEN
 */
export function AuthFooter() {
    const companyName = usePlatformName();
    const domain = usePlatformDomain();
    const domainUrl = domain ? `https://${domain}` : '/';

    return (
        <div className="mt-8 text-center space-y-1">
            <p className="text-zinc-500 text-xs font-light">
                by <Link href={domainUrl} className="font-semibold text-zinc-400 hover:text-zinc-300 transition-colors">{companyName}</Link> {new Date().getFullYear()}
            </p>
            <p className="text-zinc-500 text-xs font-light">
                todos los derechos reservados
            </p>
            <Link
                href={domainUrl}
                className="block text-zinc-500 text-xs font-light hover:text-zinc-400 transition-colors"
            >
                {domain || 'www.zenn.mx'}
            </Link>
        </div>
    )
}
