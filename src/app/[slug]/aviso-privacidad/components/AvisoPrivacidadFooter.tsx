'use client';

import Link from 'next/link';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface AvisoPrivacidadFooterProps {
  studioInfo: StudioPublicInfo | null;
}

export function AvisoPrivacidadFooter({ studioInfo }: AvisoPrivacidadFooterProps) {
  const currentYear = new Date().getFullYear();
  const studioName = studioInfo?.studio_name || 'Portal de Cliente';

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-xs text-zinc-400">
            © {currentYear} {studioName}. Todos los derechos reservados.
          </p>
          <p className="text-center text-[10px] text-zinc-600">
            Powered by{' '}
            <a
              href="https://www.zenn.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              ZEN México
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

