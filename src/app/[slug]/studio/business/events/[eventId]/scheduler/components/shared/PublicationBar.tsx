'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { obtenerConteoTareasDraft } from '@/lib/actions/studio/business/events/scheduler-actions';
import { PublicationSummarySheet } from './PublicationSummarySheet';

interface PublicationBarProps {
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
}

export function PublicationBar({ studioSlug, eventId, onPublished }: PublicationBarProps) {
  const [draftCount, setDraftCount] = useState(0);
  const [checking, setChecking] = useState(true);
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkDraftCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const result = await obtenerConteoTareasDraft(studioSlug, eventId);
      if (result.success && result.count !== undefined && isMountedRef.current) {
        setDraftCount(result.count);
        console.log(`[PublicationBar] Tareas DRAFT encontradas: ${result.count}`);
      } else if (result.error) {
        console.error('[PublicationBar] Error obteniendo conteo:', result.error);
      }
    } catch (error) {
      console.error('[PublicationBar] Error obteniendo conteo de tareas DRAFT:', error);
    } finally {
      if (isMountedRef.current) {
        setChecking(false);
      }
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    isMountedRef.current = true;
    checkDraftCount();
    
    // Escuchar eventos personalizados para actualizar el conteo
    const handleTaskUpdate = () => {
      if (isMountedRef.current) {
        checkDraftCount();
      }
    };
    
    window.addEventListener('scheduler-task-updated', handleTaskUpdate);
    window.addEventListener('scheduler-task-created', handleTaskUpdate);
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('scheduler-task-updated', handleTaskUpdate);
      window.removeEventListener('scheduler-task-created', handleTaskUpdate);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkDraftCount]);

  const handleOpenSummary = () => {
    setShowSummarySheet(true);
  };

  const handlePublished = () => {
    setShowSummarySheet(false);
    setDraftCount(0);
    onPublished?.();
    checkDraftCount();
  };

  // Mostrar solo si ya terminó de verificar Y hay tareas DRAFT
  // Durante la carga inicial (checking === true), no mostrar nada
  if (checking) {
    return null;
  }
  
  // Si no hay tareas DRAFT después de verificar, no mostrar
  if (draftCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[400px]">
        <div className="flex items-center gap-2 flex-1">
          <ZenBadge variant="warning" size="sm">
            {draftCount} {draftCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </ZenBadge>
          <span className="text-sm text-zinc-300">
            Tienes cambios sin publicar en el cronograma
          </span>
        </div>

        <ZenButton
          variant="primary"
          size="sm"
          onClick={handleOpenSummary}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Ver Resumen y Publicar
        </ZenButton>
      </div>

      <PublicationSummarySheet
        isOpen={showSummarySheet}
        onClose={() => setShowSummarySheet(false)}
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={handlePublished}
      />
    </div>
  );
}

