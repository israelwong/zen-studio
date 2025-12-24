'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { ZenInput, ZenTextarea } from '@/components/ui/zen';
import { AvatarManager } from '@/components/shared/avatar/AvatarManager';
import type { ClientSession } from '@/types/client';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClientSession;
  slug: string;
  initialName: string;
  initialPhone: string;
  initialEmail: string | null;
  initialAddress: string | null;
  initialAvatarUrl: string | null;
  onUpdate: (name: string, phone: string, email: string | null, address: string | null, avatarUrl: string | null) => Promise<void>;
}

export function ClientProfileModal({
  isOpen,
  onClose,
  cliente,
  slug,
  initialName,
  initialPhone,
  initialEmail,
  initialAddress,
  initialAvatarUrl,
  onUpdate,
}: ClientProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; address?: string }>({});

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone || '');
    setEmail(initialEmail || '');
    setAddress(initialAddress || '');
    setAvatarUrl(initialAvatarUrl);
    setErrors({});
  }, [initialName, initialPhone, initialEmail, initialAddress, initialAvatarUrl, isOpen]);

  const handlePhoneChange = (value: string) => {
    // Solo permitir números
    const numbersOnly = value.replace(/\D/g, '');
    // Limitar a 10 dígitos
    const limited = numbersOnly.slice(0, 10);
    setPhone(limited);
  };

  const handleSave = async () => {
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: 'El nombre es requerido' });
      return;
    }

    if (name.trim().length > 100) {
      setErrors({ name: 'El nombre no puede exceder 100 caracteres' });
      return;
    }

    if (!phone.trim()) {
      setErrors({ phone: 'El teléfono es requerido' });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setErrors({ phone: 'El teléfono debe tener exactamente 10 dígitos' });
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: 'Email inválido' });
      return;
    }

    if (address.trim().length > 500) {
      setErrors({ address: 'La dirección no puede exceder 500 caracteres' });
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Actualizando perfil...');

    try {
      await onUpdate(
        name.trim(),
        phone.trim(),
        email.trim() || null,
        address.trim() || null,
        avatarUrl
      );
      toast.dismiss(loadingToast);
      toast.success('Perfil actualizado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      toast.dismiss(loadingToast);
      toast.error('Error al actualizar el perfil. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpdate = async (url: string) => {
    // El AvatarManager ya subió la imagen, solo actualizamos el estado local
    setAvatarUrl(url || null);
  };

  const handleAvatarLocalUpdate = (url: string | null) => {
    setAvatarUrl(url);
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Editar perfil"
      description="Actualiza tu información personal"
      onSave={handleSave}
      onCancel={onClose}
      saveLabel="Guardar"
      cancelLabel="Cancelar"
      isLoading={isSaving}
      maxWidth="md"
      closeOnClickOutside={false}
    >
      <div className="space-y-6 py-4">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <AvatarManager
            url={avatarUrl}
            onUpdate={handleAvatarUpdate}
            onLocalUpdate={handleAvatarLocalUpdate}
            studioSlug={slug}
            category="clientes"
            subcategory="avatars"
            size="md"
            loading={isSaving}
          />
        </div>

        {/* Nombre */}
        <div>
          <ZenInput
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={isSaving}
            required
            placeholder="Tu nombre completo"
          />
        </div>

        {/* Teléfono y Email en una fila */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ZenInput
              label="Teléfono"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={errors.phone}
              disabled={isSaving}
              required
              placeholder="1234567890"
              type="tel"
              maxLength={10}
            />
          </div>
          <div>
            <ZenInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={isSaving}
              placeholder="tu@email.com"
            />
          </div>
        </div>

        {/* Dirección */}
        <div>
          <ZenTextarea
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={errors.address}
            disabled={isSaving}
            placeholder="Tu dirección completa"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Aviso informativo */}
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            Esta información será usada en tus contratos legales
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

