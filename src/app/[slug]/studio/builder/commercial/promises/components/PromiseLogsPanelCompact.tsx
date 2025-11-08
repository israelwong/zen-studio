'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { getPromiseLogs } from '@/lib/actions/studio/builder/commercial/promises';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import type { PromiseLog } from '@/lib/actions/studio/builder/commercial/promises/promise-logs.actions';
import { PromiseLogsModal } from './PromiseLogsModal';

interface PromiseLogsPanelCompactProps {
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
  isSaved: boolean;
}

export function PromiseLogsPanelCompact({
  studioSlug,
  promiseId,
  contactId,
  isSaved,
}: PromiseLogsPanelCompactProps) {
  const [logs, setLogs] = useState<PromiseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadLogs = async () => {
    if (!promiseId) {
      return;
    }

    try {
      setLoading(true);
      const result = await getPromiseLogs(promiseId);
      if (result.success && result.data) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSaved && promiseId) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promiseId, isSaved]);

  if (!isSaved || !promiseId) {
    return null;
  }

  const lastTwoLogs = logs.slice(0, 2);
  const hasMoreLogs = logs.length > 2;

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Notas
            </ZenCardTitle>
            {logs.length > 0 && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300"
              >
                Ver todas
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : lastTwoLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <MessageSquare className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 text-center">
                No hay notas aún
              </p>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs"
              >
                Agregar nota
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-3">
              {lastTwoLogs.map((log) => (
                <div
                  key={log.id}
                  className="space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsModalOpen(true)}
                >
                  <div className="text-xs text-zinc-500">
                    <span>{formatDateTime(log.created_at)}</span>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-2.5 text-xs text-zinc-200 line-clamp-2">
                    {log.content}
                  </div>
                </div>
              ))}
              {hasMoreLogs && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-300"
                >
                  Ver {logs.length - 2} nota(s) más
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </ZenButton>
              )}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <PromiseLogsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactId}
        onLogAdded={() => {
          loadLogs();
        }}
      />
    </>
  );
}

