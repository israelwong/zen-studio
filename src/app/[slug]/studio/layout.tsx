import React, { cache } from 'react';
import { ZenSidebarProvider } from '@/components/ui/zen/layout/ZenSidebar';
import { ZenMagicChatProvider } from './components/ZenMagic';
import { ContactsSheetProvider } from '@/components/shared/contacts/ContactsSheetContext';
import { SessionTimeoutProvider } from '@/components/providers/SessionTimeoutProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { StudioInitializer } from './components/init/StudioInitializer';
import { Toaster } from '@/components/ui/shadcn/sonner';
import { StudioLayoutWrapper } from './components/layout/StudioLayoutWrapper';
import { obtenerIdentidadStudio } from '@/lib/actions/studio/profile/identidad/identidad.actions';
import { calcularStorageCompleto } from '@/lib/actions/shared/calculate-storage.actions';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';
import { getRemindersDueCount } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import type { IdentidadData } from '@/app/[slug]/studio/business/identity/types';
import type { StorageStats } from '@/lib/actions/shared/calculate-storage.actions';

// ✅ OPTIMIZACIÓN: Cachear funciones pesadas usando React cache()
const getCachedIdentidad = cache(async (studioSlug: string): Promise<IdentidadData | { error: string }> => {
  return await obtenerIdentidadStudio(studioSlug);
});

const getCachedStorage = cache(async (studioSlug: string) => {
  return await calcularStorageCompleto(studioSlug);
});

// ✅ PASO 4: Pre-cargar conteos del header en el servidor (eliminar POSTs del cliente)
const getCachedAgendaCount = cache(async (studioSlug: string) => {
  return await getAgendaCount(studioSlug);
});

const getCachedRemindersCount = cache(async (studioSlug: string) => {
  const [overdueResult, todayResult] = await Promise.all([
    getRemindersDueCount(studioSlug, {
      includeCompleted: false,
      dateRange: 'overdue',
    }),
    getRemindersDueCount(studioSlug, {
      includeCompleted: false,
      dateRange: 'today',
    }),
  ]);
  
  let totalCount = 0;
  if (overdueResult.success && overdueResult.data !== undefined) {
    totalCount += overdueResult.data;
  }
  if (todayResult.success && todayResult.data !== undefined) {
    totalCount += todayResult.data;
  }
  
  return totalCount;
});

// ✅ PASO 4: Pre-cargar userId para useStudioNotifications (eliminar POST del cliente)
const getCachedHeaderUserId = cache(async (studioSlug: string) => {
  return await getCurrentUserId(studioSlug);
});

export default async function StudioLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;
    
    // ✅ PASO 4: Pre-cargar TODO en el servidor (una sola vez) - eliminar POSTs del cliente
    const [identidadData, storageData, agendaCountResult, remindersCount, headerUserIdResult] = await Promise.all([
      getCachedIdentidad(slug).catch(() => null),
      getCachedStorage(slug).catch(() => null), // No bloquear si falla
      getCachedAgendaCount(slug).catch(() => ({ success: false as const, count: 0, error: 'Error' })),
      getCachedRemindersCount(slug).catch(() => 0),
      getCachedHeaderUserId(slug).catch(() => ({ success: false as const, error: 'Error' })), // ✅ Para useStudioNotifications
    ]);
    
    const agendaCount = agendaCountResult.success ? (agendaCountResult.count || 0) : 0;
    const headerUserId = headerUserIdResult.success ? headerUserIdResult.data : null;

    // Obtener configuración de timeout usando importación dinámica con timeout
    let sessionTimeout = 30; // Default 30 minutos
    try {
        const { obtenerConfiguracionesSeguridad } = await import('@/lib/actions/studio/account/seguridad/seguridad.actions');
        // Usar Promise.race para evitar bloqueos largos
        const settings = await Promise.race([
            obtenerConfiguracionesSeguridad(slug),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // Timeout de 5s
        ]);
        if (settings?.session_timeout) {
            sessionTimeout = settings.session_timeout;
        }
    } catch (error) {
        // Silenciar errores de timeout para no bloquear el render
        if (error instanceof Error && !error.message.includes('timeout')) {
            console.error('[StudioLayout] Error cargando settings de seguridad:', error);
        }
    }

    return (
        <SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
            <RealtimeProvider studioSlug={slug} enabled={true}>
                <StudioInitializer studioSlug={slug} />
                <ZenMagicChatProvider>
                    <ContactsSheetProvider>
                        <ZenSidebarProvider>
                            <StudioLayoutWrapper 
                                studioSlug={slug}
                                initialIdentidadData={identidadData && !('error' in identidadData) ? identidadData : null}
                                initialStorageData={storageData?.success ? storageData.data : null}
                                initialAgendaCount={agendaCount} // ✅ PASO 4: Pre-cargado en servidor
                                initialRemindersCount={remindersCount} // ✅ PASO 4: Pre-cargado en servidor
                                initialHeaderUserId={headerUserId} // ✅ PASO 4: Pre-cargado en servidor (para useStudioNotifications)
                            >
                                {children}
                            </StudioLayoutWrapper>
                            <Toaster position="top-right" richColors />
                        </ZenSidebarProvider>
                    </ContactsSheetProvider>
                </ZenMagicChatProvider>
            </RealtimeProvider>
        </SessionTimeoutProvider>
    );
}
