'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useFavicon } from '@/hooks/useFavicon';
import { obtenerEventoDetalle, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import { ZenSidebarProvider } from '@/components/ui/zen';
import { ClientLayoutWrapper } from '../components/ClientLayoutWrapper';
import { Loader2 } from 'lucide-react';
import type { ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

export default function EventoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const [evento, setEvento] = useState<ClientEventDetail | null>(null);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${slug}/cliente/login`);
    }
  }, [isLoading, isAuthenticated, router, slug]);

  // Verificar que el clientId coincida con el cliente autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated && cliente && clientId !== cliente.id) {
      router.push(`/${slug}/cliente/${cliente.id}`);
    }
  }, [isLoading, isAuthenticated, cliente, clientId, router, slug]);

  // Cargar datos del evento
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id || !eventId) {
        return;
      }

      try {
        setLoading(true);
        const [eventoResponse, studioInfoData] = await Promise.all([
          obtenerEventoDetalle(eventId, cliente.id),
          obtenerStudioPublicInfo(slug),
        ]);

        if (eventoResponse.success && eventoResponse.data) {
          setEvento(eventoResponse.data);
        } else {
          router.push(`/${slug}/cliente/${clientId}`);
          return;
        }

        if (studioInfoData) {
          setStudioInfo(studioInfoData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        router.push(`/${slug}/cliente/${clientId}`);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id && eventId) {
      fetchData();
    }
  }, [isAuthenticated, cliente, clientId, eventId, router, slug]);

  // Mostrar loading simple mientras verifica sesión
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión o evento, mostrar loading mientras redirige
  if (!isAuthenticated || !cliente || clientId !== cliente.id || !evento) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <ZenSidebarProvider>
      <ClientLayoutWrapper
        slug={slug}
        cliente={cliente}
        evento={evento}
        studioInfo={studioInfo}
      >
        {children}
      </ClientLayoutWrapper>
    </ZenSidebarProvider>
  );
}
