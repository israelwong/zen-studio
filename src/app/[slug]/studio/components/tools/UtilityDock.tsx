'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ContactRound, CalendarCheck, FileText, Shield, Receipt, CreditCard, Settings } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import dynamic from 'next/dynamic';

const TerminosCondicionesEditor = dynamic(
  () => import('@/components/shared/terminos-condiciones/TerminosCondicionesEditor').then(mod => mod.TerminosCondicionesEditor),
  { ssr: false }
);

const AvisoPrivacidadManager = dynamic(
  () => import('@/components/shared/avisos-privacidad/AvisoPrivacidadManager').then(mod => mod.AvisoPrivacidadManager),
  { ssr: false }
);

const ContractTemplateManagerModal = dynamic(
  () => import('@/components/shared/contracts/ContractTemplateManagerModal').then(mod => mod.ContractTemplateManagerModal),
  { ssr: false }
);

const CondicionesComercialesManager = dynamic(
  () => import('@/components/shared/condiciones-comerciales/CondicionesComercialesManager').then(mod => mod.CondicionesComercialesManager),
  { ssr: false }
);

const PaymentMethodsModal = dynamic(
  () => import('@/components/shared/payments/PaymentMethodsModal').then(mod => mod.PaymentMethodsModal),
  { ssr: false }
);

const ConfigurationCatalogModal = dynamic(
  () => import('@/components/shared/configuracion/ConfigurationCatalogModal').then(mod => mod.ConfigurationCatalogModal),
  { ssr: false }
);

interface UtilityDockProps {
  studioSlug: string;
  onAgendaClick?: () => void;
  onContactsClick?: () => void;
  onTareasOperativasClick?: () => void;
  onPromisesConfigClick?: () => void;
}

export function UtilityDock({
  studioSlug,
  onAgendaClick,
  onContactsClick,
  onTareasOperativasClick,
  onPromisesConfigClick,
}: UtilityDockProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [terminosCondicionesOpen, setTerminosCondicionesOpen] = useState(false);
  const [avisoPrivacidadOpen, setAvisoPrivacidadOpen] = useState(false);
  const [contratosOpen, setContratosOpen] = useState(false);
  const [condicionesComercialesOpen, setCondicionesComercialesOpen] = useState(false);
  const [metodosPagoOpen, setMetodosPagoOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isMountedRef = true;

    const checkConnection = () => {
      if (!isMountedRef) return;

      obtenerEstadoConexion(studioSlug)
        .then((result) => {
          if (!isMountedRef) return;

          if (result.success && result.isConnected) {
            const hasCalendarScope =
              result.scopes?.some(
                (scope) =>
                  scope.includes('calendar') || scope.includes('calendar.events')
              ) || false;
            setHasGoogleCalendar(hasCalendarScope);
          } else {
            setHasGoogleCalendar(false);
          }
        })
        .catch(() => {
          if (!isMountedRef) return;
          setHasGoogleCalendar(false);
        });
    };

    checkConnection();

    const handleConnectionChange = () => {
      if (isMountedRef) {
        checkConnection();
      }
    };
    window.addEventListener('google-calendar-connection-changed', handleConnectionChange);

    return () => {
      isMountedRef = false;
      window.removeEventListener('google-calendar-connection-changed', handleConnectionChange);
    };
  }, [isMounted, studioSlug]);

  return (
    <aside
      className="relative shrink-0 w-12 border-l border-zinc-800 bg-zinc-950/50 flex flex-col items-center py-4 gap-2 z-40 overflow-visible"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Overlay expandido - posición absoluta que se expande hacia la izquierda sin afectar layout */}
      <div
        className={`absolute right-0 top-0 h-full bg-zinc-950/80 backdrop-blur-md border-l border-zinc-800 flex flex-col items-start py-4 px-3 shadow-xl transition-all duration-200 ease-in-out ${isHovered ? 'w-56 opacity-100 pointer-events-auto' : 'w-12 opacity-0 pointer-events-none'
          }`}
        style={{
          transform: isHovered ? 'translateX(0)' : 'translateX(0)',
        }}
      >
        {/* SECCIÓN 1: Calendario */}
        <div className="flex flex-col gap-2 w-full">
          {/* Título de sección */}
          <div className="px-3 py-1">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Calendario</span>
          </div>

          {/* General */}
          {onAgendaClick && (
            <ZenButton
              variant="ghost"
              size="sm"
              className="h-10 w-full justify-start gap-2 px-3 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              onClick={onAgendaClick}
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">General</span>
              <span className="sr-only">General</span>
            </ZenButton>
          )}

          {/* Operativo - Solo si Google Calendar está conectado */}
          {onTareasOperativasClick && isMounted && hasGoogleCalendar && (
            <ZenButton
              variant="ghost"
              size="sm"
              className="h-10 w-full justify-start gap-2 px-3 rounded-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
              onClick={onTareasOperativasClick}
            >
              <CalendarCheck className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Operativo</span>
              <span className="sr-only">Operativo</span>
            </ZenButton>
          )}
        </div>

        {/* Divider entre secciones */}
        {onContactsClick && <div className="w-full h-px bg-zinc-800 my-2" />}

        {/* SECCIÓN 2: Contactos */}
        {onContactsClick && (
          <div className="flex flex-col gap-2 w-full">
            <ZenButton
              variant="ghost"
              size="sm"
              className="h-10 w-full justify-start gap-2 px-3 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              onClick={onContactsClick}
            >
              <ContactRound className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Contactos</span>
              <span className="sr-only">Contactos</span>
            </ZenButton>

            {/* Configurar Promesas */}
            {onPromisesConfigClick && (
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-start gap-2 px-3 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                onClick={onPromisesConfigClick}
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span className="text-xs font-medium">Configurar</span>
                <span className="sr-only">Configurar</span>
              </ZenButton>
            )}
          </div>
        )}
      </div>

      {/* Botones base - siempre visibles (colapsados) */}
      {/* SECCIÓN 1: Calendario */}
      <div className="flex flex-col gap-2 items-center">
        {onAgendaClick && (
          <ZenButton
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            onClick={onAgendaClick}
          >
            <Calendar className="h-5 w-5" />
            <span className="sr-only">General</span>
          </ZenButton>
        )}

        {onTareasOperativasClick && isMounted && hasGoogleCalendar && (
          <ZenButton
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
            onClick={onTareasOperativasClick}
          >
            <CalendarCheck className="h-5 w-5" />
            <span className="sr-only">Operativo</span>
          </ZenButton>
        )}
      </div>

      {/* Divider entre secciones */}
      {onContactsClick && <div className="w-8 h-px bg-zinc-800 my-2" />}

      {/* SECCIÓN 2: Contactos */}
      {onContactsClick && (
        <div className="flex flex-col gap-2 items-center">
          <ZenButton
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            onClick={onContactsClick}
          >
            <ContactRound className="h-5 w-5" />
            <span className="sr-only">Contactos</span>
          </ZenButton>

          {/* Configurar Promesas */}
          {onPromisesConfigClick && (
            <ZenButton
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              onClick={onPromisesConfigClick}
              title="Configurar"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Configurar</span>
            </ZenButton>
          )}
        </div>
      )}

      {/* Modales Legales */}
      <TerminosCondicionesEditor
        studioSlug={studioSlug}
        isOpen={terminosCondicionesOpen}
        onClose={() => setTerminosCondicionesOpen(false)}
      />

      <AvisoPrivacidadManager
        studioSlug={studioSlug}
        isOpen={avisoPrivacidadOpen}
        onClose={() => setAvisoPrivacidadOpen(false)}
      />

      <ContractTemplateManagerModal
        isOpen={contratosOpen}
        onClose={() => setContratosOpen(false)}
        studioSlug={studioSlug}
      />

      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={condicionesComercialesOpen}
        onClose={() => setCondicionesComercialesOpen(false)}
      />

      <PaymentMethodsModal
        isOpen={metodosPagoOpen}
        onClose={() => setMetodosPagoOpen(false)}
        studioSlug={studioSlug}
      />
    </aside>
  );
}
