'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Check, Calendar, Clock, MapPin, Video, Link as LinkIcon, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { PromiseNotesButton } from './PromiseNotesButton';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { logWhatsAppSent, logProfileShared } from '@/lib/actions/studio/commercial/promises';
import { obtenerAgendamientoPorPromise, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDate } from '@/lib/actions/utils/formatting';
import { AgendaFormModal } from '@/components/shared/agenda';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { getPromiseViewStats, getCotizacionClickStats, getPaqueteClickStats } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';

interface PromiseDetailToolbarProps {
  studioSlug: string;
  promiseId: string | null;
  contactData: {
    contactId: string;
    contactName: string;
    phone: string;
  } | null;
  eventoId?: string | null;
  onCopyLink: () => void;
  onPreview: () => void;
}

export function PromiseDetailToolbar({
  studioSlug,
  promiseId,
  contactData,
  eventoId,
  onCopyLink,
  onPreview,
}: PromiseDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [statsPopoverOpen, setStatsPopoverOpen] = useState(false);
  const [viewStats, setViewStats] = useState<{
    totalViews: number;
    uniqueViews: number;
    lastView: Date | null;
    recentViews: Array<{ date: Date; ip: string; userAgent: string | null }>;
  } | null>(null);
  const [cotizacionStats, setCotizacionStats] = useState<Array<{
    cotizacionId: string;
    cotizacionName: string;
    clicks: number;
    lastClick: Date | null;
  }>>([]);
  const [paqueteStats, setPaqueteStats] = useState<Array<{
    paqueteId: string;
    paqueteName: string;
    clicks: number;
    lastClick: Date | null;
  }>>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const loadingStatsRef = useRef(false);

  useEffect(() => {
    if (!promiseId) return;

    const loadAgendamiento = async () => {
      setLoading(true);
      try {
        const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
        if (result.success) {
          setAgendamiento(result.data || null);
        }
      } catch (error) {
        console.error('Error loading agendamiento:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgendamiento();
  }, [promiseId, studioSlug]);

  const handleSuccess = async () => {
    if (!promiseId) return;
    setLoading(true);
    try {
      const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
      if (result.success) {
        setAgendamiento(result.data || null);
      }
    } catch (error) {
      console.error('Error loading agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar estadísticas (reutilizable) con timeout
  const loadStats = React.useCallback(async () => {
    if (!promiseId) return;
    
    // Prevenir múltiples llamadas simultáneas usando ref
    if (loadingStatsRef.current) {
      console.debug('[PromiseDetailToolbar] Ya hay una carga en progreso, ignorando...');
      return;
    }

    loadingStatsRef.current = true;
    setLoadingStats(true);
    
    // Timeout de 15 segundos (aumentado para queries optimizadas)
    const timeoutId = setTimeout(() => {
      console.error('[PromiseDetailToolbar] Timeout cargando estadísticas después de 15s');
      loadingStatsRef.current = false;
      setLoadingStats(false);
    }, 15000);

    try {
      const startTime = Date.now();
      const [viewsResult, cotizacionesResult, paquetesResult] = await Promise.all([
        getPromiseViewStats(promiseId),
        getCotizacionClickStats(promiseId),
        getPaqueteClickStats(promiseId),
      ]);
      const duration = Date.now() - startTime;
      console.debug(`[PromiseDetailToolbar] Estadísticas cargadas en ${duration}ms`);

      clearTimeout(timeoutId);

      if (viewsResult.success && viewsResult.data) {
        // Cargar estadísticas completas (incluyendo recentViews)
        setViewStats(viewsResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en viewsResult:', viewsResult.error);
        // Establecer valores por defecto si falla (mantener totalViews si ya existe)
        setViewStats((prev) => ({
          totalViews: prev?.totalViews || 0,
          uniqueViews: 0,
          lastView: null,
          recentViews: [],
        }));
      }

      if (cotizacionesResult.success && cotizacionesResult.data) {
        setCotizacionStats(cotizacionesResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en cotizacionesResult:', cotizacionesResult.error);
        setCotizacionStats([]);
      }

      if (paquetesResult.success && paquetesResult.data) {
        setPaqueteStats(paquetesResult.data);
      } else {
        console.error('[PromiseDetailToolbar] Error en paquetesResult:', paquetesResult.error);
        setPaqueteStats([]);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[PromiseDetailToolbar] Error loading stats:', error);
      // Establecer valores por defecto en caso de error (mantener totalViews si ya existe)
      setViewStats((prev) => ({
        totalViews: prev?.totalViews || 0,
        uniqueViews: prev?.uniqueViews || 0,
        lastView: prev?.lastView || null,
        recentViews: [],
      }));
      // No resetear cotizacionStats y paqueteStats si ya existen para mantener UI estable
    } finally {
      loadingStatsRef.current = false;
      setLoadingStats(false);
    }
  }, [promiseId]); // Solo depende de promiseId para evitar loops infinitos

  // Cargar estadísticas completas cuando se abre el popover
  useEffect(() => {
    if (statsPopoverOpen && promiseId && !loadingStatsRef.current) {
      loadStats();
    }
  }, [statsPopoverOpen, promiseId, loadStats]);

  if (!promiseId || !contactData) {
    return null;
  }

  const handleWhatsApp = async () => {
    if (!contactData.phone) return;
    
    const cleanPhone = contactData.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${contactData.contactName}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    if (promiseId) {
      logWhatsAppSent(studioSlug, promiseId, contactData.contactName, contactData.phone).catch((error) => {
        console.error('Error registrando WhatsApp:', error);
      });
    }

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {/* Estadísticas de visitas */}
        {promiseId && (
          <Popover open={statsPopoverOpen} onOpenChange={setStatsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                onClick={() => setStatsPopoverOpen(true)}
              >
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-400">Visitas</span>
                {viewStats && viewStats.totalViews > 0 && (
                  <ZenBadge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px]">
                    {viewStats.totalViews}
                  </ZenBadge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-zinc-950 border-zinc-700/50 p-3 shadow-xl" align="start">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                    Estadísticas
                  </h3>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={loadStats}
                    disabled={loadingStats}
                    className="h-5 px-1.5 text-[10px]"
                    title="Actualizar estadísticas"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingStats ? 'animate-spin' : ''}`} />
                  </ZenButton>
                </div>

                {/* Skeleton o contenido */}
                {loadingStats ? (
                  <div className="space-y-3">
                    {/* Skeleton para estadísticas principales */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-12 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-5 w-8 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-12 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-5 w-8 bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                    </div>
                    {/* Skeleton para lista */}
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse" />
                          <div className="h-4 w-6 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Estadísticas de visitas */}
                    {viewStats ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Total</div>
                            <div className="text-base font-semibold text-white">{viewStats.totalViews}</div>
                          </div>
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Únicas</div>
                            <div className="text-base font-semibold text-white">{viewStats.uniqueViews}</div>
                          </div>
                        </div>
                        {viewStats.lastView && (
                          <div className="bg-zinc-800/30 rounded-md p-2">
                            <div className="text-[10px] text-zinc-500 mb-1">Última visita</div>
                            <div className="text-xs text-zinc-300">
                              {formatDate(viewStats.lastView, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 text-center py-2">Sin visitas aún</div>
                    )}

                    {/* Lista de paquetes con clicks */}
                    {paqueteStats.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2.5">
                        <h4 className="text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Paquetes</h4>
                        <div className="space-y-1">
                          {paqueteStats.map((stat) => (
                            <div key={stat.paqueteId} className="flex items-center justify-between text-xs group">
                              <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.paqueteName}</span>
                              <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                                {stat.clicks}
                              </ZenBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de cotizaciones con clicks */}
                    {cotizacionStats.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2.5">
                        <h4 className="text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Cotizaciones</h4>
                        <div className="space-y-1">
                          {cotizacionStats.map((stat) => (
                            <div key={stat.cotizacionId} className="flex items-center justify-between text-xs group">
                              <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.cotizacionName}</span>
                              <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                                {stat.clicks}
                              </ZenBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {/* Grupo: Compartir */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Compartir</span>
          {/* Botón Copiar URL */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={async () => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;
              await onCopyLink();
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
              
              // Registrar log
              if (promiseId && contactData) {
                logProfileShared(studioSlug, promiseId, contactData.contactName, previewUrl).catch((error) => {
                  console.error('Error registrando copia de URL:', error);
                });
              }
            }}
            className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${linkCopied ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
          >
            {linkCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </ZenButton>

          {/* Botón Vista previa */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}?preview=true`;
              window.open(previewUrl, '_blank');
              onPreview();
              
              // Registrar log
              if (promiseId && contactData) {
                logProfileShared(studioSlug, promiseId, contactData.contactName, previewUrl).catch((error) => {
                  console.error('Error registrando vista previa:', error);
                });
              }
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Vista previa</span>
          </ZenButton>
        </div>

        {/* Divisor entre Compartir y Contactar */}
        {contactData.phone && (
          <div className="h-4 w-px bg-zinc-700" />
        )}

        {/* Grupo: Contactar */}
        {contactData.phone && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Contactar</span>
            {/* Botón WhatsApp */}
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleWhatsApp}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
              <span>WhatsApp</span>
            </ZenButton>
          </div>
        )}

        {/* Divisor antes de Agendar */}
        <div className="h-4 w-px bg-zinc-700" />

        {/* Grupo: Agendar */}
        <div className="flex items-center gap-1.5">
          {!agendamiento ? (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-400"
              title="Agendar cita"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Agendar cita</span>
            </ZenButton>
          ) : (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-3 py-1.5 h-7 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-300 font-medium">
                      {formatDate(agendamiento.date, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {agendamiento.time && agendamiento.time.trim() !== '' && (
                      <>
                        <span className="text-zinc-500">•</span>
                        <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                        <span className="text-blue-400 text-[10px] font-medium">{agendamiento.time}</span>
                      </>
                    )}
                  </div>
                </ZenButton>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-4 bg-zinc-900 border-zinc-800"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <div className="space-y-3">
                  {/* Fecha y Hora */}
                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha y Hora</p>
                      <p className="text-sm font-semibold text-zinc-200">
                        {formatDate(agendamiento.date)}
                      </p>
                      {agendamiento.time && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <p className="text-xs text-zinc-300 font-medium">{agendamiento.time}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tipo de reunión */}
                  {agendamiento.type_scheduling && (
                    <div className="flex items-center gap-2">
                      {agendamiento.type_scheduling === 'presencial' ? (
                        <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                      ) : (
                        <Video className="h-4 w-4 text-purple-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-400 mb-0.5">Tipo de reunión</p>
                        <p className="text-xs font-semibold text-zinc-200 capitalize">
                          {agendamiento.type_scheduling}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dirección o Link */}
                  {agendamiento.type_scheduling === 'presencial' && agendamiento.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-400 mb-0.5">Dirección</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {agendamiento.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {agendamiento.link_meeting_url && (
                    <div className="flex items-start gap-2.5">
                      <LinkIcon className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-400 mb-0.5">
                          {agendamiento.type_scheduling === 'presencial' ? 'Link de Google Maps' : 'Link de reunión virtual'}
                        </p>
                        <a
                          href={agendamiento.link_meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline break-all"
                        >
                          {agendamiento.link_meeting_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Concepto */}
                  {agendamiento.concept && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                      <p className="text-xs font-medium text-zinc-400 mb-1.5">Concepto</p>
                      <p className="text-xs text-zinc-200 leading-relaxed">{agendamiento.concept}</p>
                    </div>
                  )}

                  {/* Descripción */}
                  {agendamiento.description && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                      <p className="text-xs font-medium text-zinc-400 mb-1.5">Descripción</p>
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
                        {agendamiento.description}
                      </p>
                    </div>
                  )}

                  {/* Botón editar */}
                  {!eventoId && (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPopoverOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="w-full mt-2 text-xs"
                    >
                      Editar agendamiento
                    </ZenButton>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Botón de bitácora alineado a la derecha */}
      <PromiseNotesButton
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactData.contactId}
      />

      {/* Modal de agendamiento */}
      {isModalOpen && (
        <AgendaFormModal
          key={agendamiento?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          studioSlug={studioSlug}
          initialData={agendamiento}
          contexto="promise"
          promiseId={promiseId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

