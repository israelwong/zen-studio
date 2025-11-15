'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

interface SessionContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        setSession(null);
        setUser(null);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (error) {
      setSession(null);
      setUser(null);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('[SessionProvider] Error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Redirigir en caso de logout
        if (event === 'SIGNED_OUT') {
          const isProtectedRoute = pathname?.startsWith('/admin') || 
                                  pathname?.startsWith('/agente') || 
                                  pathname?.match(/\/[^/]+\/studio/);
          
          if (isProtectedRoute) {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname, refreshSession]);

  return (
    <SessionContext.Provider
      value={{
        user,
        session,
        loading,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

