'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { ZenInput, ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';
import { getPromiseLogs, createPromiseLog } from '@/lib/actions/studio/builder/commercial/promises';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import type { PromiseLog } from '@/lib/actions/studio/builder/commercial/promises/promise-logs.actions';

interface PromiseLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
  onLogAdded?: () => void;
}

export function PromiseLogsModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  contactId,
  onLogAdded,
}: PromiseLogsModalProps) {
  const [logs, setLogs] = useState<PromiseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadLogs = async () => {
    if (!promiseId) {
      setIsInitialLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await getPromiseLogs(promiseId);
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        toast.error(result.error || 'Error al cargar bitácora');
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Error al cargar bitácora');
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && promiseId) {
      setIsInitialLoading(true);
      loadLogs();
    }
  }, [isOpen, promiseId]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [logs, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !promiseId) return;

    const messageToSend = message.trim();
    setMessage('');
    setSending(true);

    try {
      const result = await createPromiseLog(studioSlug, {
        promise_id: promiseId,
        content: messageToSend,
        log_type: 'note',
      });

      if (result.success && result.data) {
        setLogs((prev) => [result.data!, ...prev]);
        toast.success('Nota agregada');
        onLogAdded?.();
      } else {
        toast.error(result.error || 'Error al agregar nota');
        setMessage(messageToSend);
      }
    } catch (error) {
      console.error('Error creating log:', error);
      toast.error('Error al agregar nota');
      setMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bitácora de Notas"
      description="Gestiona todas las notas de esta promesa"
      maxWidth="2xl"
    >
      <div className="flex flex-col" style={{ height: '600px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {isInitialLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-zinc-500 text-center">
                No hay notas aún. Escribe algo para comenzar.
              </p>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <div key={log.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{log.user?.full_name || 'Sistema'}</span>
                    <span>•</span>
                    <span>{formatDateTime(log.created_at)}</span>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-200">
                    {log.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="pt-4 border-t border-zinc-800 mt-auto">
          <div className="flex gap-2">
            <ZenInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe una nota..."
              disabled={sending || !promiseId}
              className="flex-1"
            />
            <ZenButton
              type="submit"
              disabled={!message.trim() || sending || !promiseId}
              loading={sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </ZenButton>
          </div>
        </form>
      </div>
    </ZenDialog>
  );
}

