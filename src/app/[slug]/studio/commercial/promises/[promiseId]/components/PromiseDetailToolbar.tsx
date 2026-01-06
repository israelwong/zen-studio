'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Phone } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { PromiseNotesButton } from './PromiseNotesButton';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { logWhatsAppSent, logCallMade } from '@/lib/actions/studio/commercial/promises';

interface PromiseDetailToolbarProps {
  studioSlug: string;
  promiseId: string | null;
  contactData: {
    contactId: string;
    contactName: string;
    phone: string;
  } | null;
  onCopyLink: () => void;
  onPreview: () => void;
}

export function PromiseDetailToolbar({
  studioSlug,
  promiseId,
  contactData,
  onCopyLink,
  onPreview,
}: PromiseDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);

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

  const handleCall = async () => {
    if (!contactData.phone) return;

    if (promiseId) {
      logCallMade(studioSlug, promiseId, contactData.contactName, contactData.phone).catch((error) => {
        console.error('Error registrando llamada:', error);
      });
    }

    window.open(`tel:${contactData.phone}`, '_self');
  };

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {/* Grupo: Compartir */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Compartir</span>
          {/* Botón Copiar URL */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              onCopyLink();
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
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
            onClick={onPreview}
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

            {/* Botón Llamada */}
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleCall}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-400"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Llamar</span>
            </ZenButton>
          </div>
        )}
      </div>

      {/* Botón de bitácora alineado a la derecha */}
      <PromiseNotesButton
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactData.contactId}
      />
    </div>
  );
}

