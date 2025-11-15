'use client';

import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useEffect, useState } from 'react';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  /**
   * Tiempo de inactividad en minutos (configurable desde SecuritySettings)
   */
  inactivityTimeout?: number;
}

/**
 * Provider que maneja el timeout de sesión por inactividad
 * 
 * Debe ir envolviendo la app autenticada
 */
export function SessionTimeoutProvider({
  children,
  inactivityTimeout = 30,
}: SessionTimeoutProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Hook de session timeout
  useSessionTimeout({
    inactivityTimeout,
    showWarning: true,
    warningTime: 5,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

