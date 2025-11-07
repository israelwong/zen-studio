'use client';

import React from 'react';
import { Share2, MessageCircle, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface PromiseQuickActionsProps {
  studioSlug: string;
  contactId: string;
  contactName: string;
  phone: string;
  email?: string | null;
}

export function PromiseQuickActions({
  studioSlug,
  contactId,
  contactName,
  phone,
  email,
}: PromiseQuickActionsProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hola ${contactName}, te contacto desde ZEN`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/${studioSlug}/cliente/profile/${contactId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${contactName}`,
          text: `Revisa el perfil de ${contactName}`,
          url: profileUrl,
        });
      } catch (error) {
        // Usuario canceló el share
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Link copiado al portapapeles');
    }
  };

  const handleEmail = () => {
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleWhatsApp}
        className="p-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition-colors"
        title="WhatsApp"
        aria-label="Abrir WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
      <button
        onClick={handleCall}
        className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors"
        title="Llamar"
        aria-label="Llamar"
      >
        <Phone className="h-4 w-4" />
      </button>
      {email && (
        <button
          onClick={handleEmail}
          className="p-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 transition-colors"
          title="Email"
          aria-label="Enviar email"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={handleShareProfile}
        className="p-2 rounded-lg bg-zinc-600/10 hover:bg-zinc-600/20 text-zinc-400 hover:text-zinc-300 transition-colors"
        title="Compartir perfil"
        aria-label="Compartir perfil"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}

