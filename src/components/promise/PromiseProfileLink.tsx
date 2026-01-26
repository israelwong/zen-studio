'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface PromiseProfileLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'promise_return_url';
const DISMISSED_KEY = 'promise_return_dismissed';

/**
 * Link que guarda la URL de la promesa actual en localStorage
 * cuando el usuario hace clic para ir al perfil
 * 
 * ✅ Guarda la URL actual (pendientes, negociación, cierre) para regresar al mismo lugar
 */
export function PromiseProfileLink({ href, children, className }: PromiseProfileLinkProps) {
  const pathname = usePathname();

  // Guardar la URL actual cada vez que cambia (si estamos en una promesa)
  useEffect(() => {
    if (pathname && pathname.includes('/promise/')) {
      try {
        const promiseData = {
          url: pathname,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(promiseData));
        // Limpiar el flag de dismissed cuando se guarda una nueva promesa (sessionStorage)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(DISMISSED_KEY);
        }
      } catch (error) {
        console.error('[PromiseProfileLink] Error saving to localStorage:', error);
      }
    }
  }, [pathname]);

  const handleClick = () => {
    // Asegurar que guardamos la URL actual antes de navegar
    if (pathname && pathname.includes('/promise/')) {
      try {
        const promiseData = {
          url: pathname,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(promiseData));
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(DISMISSED_KEY);
        }
      } catch (error) {
        console.error('[PromiseProfileLink] Error saving to localStorage:', error);
      }
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
