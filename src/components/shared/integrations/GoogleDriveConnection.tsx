'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import {
  obtenerEstadoConexion,
  iniciarConexionGoogle,
  desconectarGoogle,
} from '@/lib/actions/studio/integrations';
import { toast } from 'sonner';

interface GoogleDriveConnectionProps {
  studioSlug: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  returnUrl?: string;
  variant?: 'default' | 'compact' | 'inline';
  showDisconnect?: boolean;
}

export function GoogleDriveConnection({
  studioSlug,
  onConnected,
  onDisconnected,
  returnUrl,
  variant = 'default',
  showDisconnect = true,
}: GoogleDriveConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [scopes, setScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    loadConnectionStatus();
  }, [studioSlug]);

  const loadConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await obtenerEstadoConexion(studioSlug);
      setIsConnected(status.isConnected || false);
      setEmail(status.email);
      setScopes(status.scopes || []);
      
      if (status.isConnected && onConnected) {
        onConnected();
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await iniciarConexionGoogle(studioSlug, returnUrl);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || 'Error al conectar con Google');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Error al conectar con Google');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      const result = await desconectarGoogle(studioSlug);
      if (result.success) {
        toast.success('Google Drive desconectado');
        await loadConnectionStatus();
        if (onDisconnected) {
          onDisconnected();
        }
      } else {
        toast.error(result.error || 'Error al desconectar');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar Google Drive');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const hasDriveScope = scopes.some((scope) => scope.includes('drive'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Variant: compact (para modales pequeños)
  if (variant === 'compact') {
    if (isConnected && hasDriveScope) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300">
              Conectado: <span className="font-medium">{email}</span>
            </span>
          </div>
          {showDisconnect && (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </>
              )}
            </ZenButton>
          )}
        </div>
      );
    }

    return (
      <div className="bg-blue-950/20 rounded-lg p-4 border border-blue-800/50">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-1.5 bg-blue-600/20 rounded">
            <Cloud className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-zinc-200 mb-1">
              Conecta Google Drive
            </h4>
            <p className="text-xs text-zinc-400">
              Vincula carpetas directamente desde tu Google Drive.
            </p>
          </div>
        </div>
        <ZenButton
          variant="default"
          size="sm"
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Conectar con Google Drive
            </>
          )}
        </ZenButton>
        <p className="text-xs text-zinc-500 mt-2 text-center">
          Te redirigiremos a Google y volverás aquí automáticamente
        </p>
      </div>
    );
  }

  // Variant: inline (para usar dentro de formularios)
  if (variant === 'inline') {
    if (isConnected && hasDriveScope) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-zinc-300">
            Google Drive conectado: <span className="font-medium">{email}</span>
          </span>
          {showDisconnect && (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="h-6 px-2 text-xs"
            >
              Desconectar
            </ZenButton>
          )}
        </div>
      );
    }

    return (
      <ZenButton
        variant="outline"
        size="sm"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4 mr-2" />
            Conectar Google Drive
          </>
        )}
      </ZenButton>
    );
  }

  // Variant: default (para páginas completas)
  if (isConnected && hasDriveScope) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-zinc-300">
            Conectado como: <span className="font-medium">{email}</span>
          </span>
          <ZenBadge variant="success" className="text-xs">
            Conectado
          </ZenBadge>
        </div>
        {showDisconnect && (
          <ZenButton
            variant="outline"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full sm:w-auto"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Desconectando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Desconectar Google Drive
              </>
            )}
          </ZenButton>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <XCircle className="h-4 w-4 text-zinc-500" />
        <span>No conectado</span>
      </div>
      <ZenButton
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full sm:w-auto"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4 mr-2" />
            Conectar Google Drive
          </>
        )}
      </ZenButton>
    </div>
  );
}

