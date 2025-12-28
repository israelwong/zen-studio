'use client';

import React, { useState } from 'react';
import { IntegrationCard } from './IntegrationCard';
import { ZenButton } from '@/components/ui/zen';
import { iniciarConexionGoogleContacts } from '@/lib/actions/auth/oauth-contacts.actions';
import { GoogleContactsConnectionModal } from '@/components/shared/integrations/GoogleContactsConnectionModal';
import { toast } from 'sonner';

interface GoogleContactsIntegrationCardProps {
  isConnected: boolean;
  studioSlug: string;
  onConnect: () => void;
  onDisconnected?: () => void;
}

export function GoogleContactsIntegrationCard({
  isConnected,
  studioSlug,
  onConnect,
  onDisconnected,
}: GoogleContactsIntegrationCardProps) {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnectClick = () => {
    setShowConnectionModal(true);
  };

  const handleConfirmConnect = async () => {
    setConnecting(true);
    try {
      const result = await iniciarConexionGoogleContacts(studioSlug);

      if (!result.success) {
        toast.error(result.error || 'Error al iniciar conexión con Google Contacts');
        setConnecting(false);
        setShowConnectionModal(false);
        return;
      }

      // Redirigir a la URL de OAuth
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error conectando Google Contacts:', error);
      toast.error('Error al conectar con Google Contacts');
      setConnecting(false);
      setShowConnectionModal(false);
    }
  };

  return (
    <>
      <IntegrationCard
        name="Google Contacts"
        description="Sincroniza tus contactos y staff con Google Contacts automáticamente"
        iconColor="text-green-400"
        isConnected={isConnected}
        isComingSoon={false}
        onConnect={handleConnectClick}
      >
        {!isConnected ? (
          <ZenButton
            variant="primary"
            size="sm"
            onClick={handleConnectClick}
            disabled={connecting}
            className="w-full"
          >
            Conectar
          </ZenButton>
        ) : (
          <ZenButton
            variant="outline"
            size="sm"
            className="w-full"
            disabled
          >
            Conectado
          </ZenButton>
        )}
      </IntegrationCard>
      <GoogleContactsConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConfirmConnect}
        connecting={connecting}
      />
    </>
  );
}

