'use client';

import React, { useState, useEffect } from 'react';
import { ZenInput, ZenDialog, ZenTextarea, ZenSelect } from '@/components/ui/zen';
import type { ZenSelectOption } from '@/components/ui/zen';
import { toast } from 'sonner';
import { createContact, updateContact, getContactById, getAcquisitionChannels, getContacts } from '@/lib/actions/studio/builder/commercial/contacts';
import type { CreateContactData } from '@/lib/actions/schemas/contacts-schemas';
import { AvatarManager } from '@/components/shared/avatar';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactId?: string | null;
    studioSlug: string;
    onSuccess: () => void;
}

export function ContactModal({
    isOpen,
    onClose,
    contactId,
    studioSlug,
    onSuccess
}: ContactModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateContactData>({
        name: '',
        phone: '',
        email: '',
        address: '',
        avatar_url: '',
        status: 'active',
        acquisition_channel_id: undefined,
        referrer_contact_id: undefined,
        referrer_name: '',
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [acquisitionChannels, setAcquisitionChannels] = useState<Array<{ id: string; name: string }>>([]);
    const [referrerContacts, setReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);

    useEffect(() => {
        if (isOpen) {
            loadAcquisitionChannels();
            loadReferrerContacts();
            if (contactId) {
                loadContact();
            } else {
                resetForm();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, contactId]);

    const loadAcquisitionChannels = async () => {
        try {
            const result = await getAcquisitionChannels();
            if (result.success && result.data) {
                setAcquisitionChannels(result.data.map(c => ({ id: c.id, name: c.name })));
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    };

    const loadReferrerContacts = async () => {
        try {
            const result = await getContacts(studioSlug, { page: 1, limit: 100, status: 'all' });
            if (result.success && result.data) {
                // Excluir el contacto actual si está editando
                const filtered = contactId
                    ? result.data.contacts.filter(c => c.id !== contactId)
                    : result.data.contacts;
                setReferrerContacts(filtered.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone
                })));
            }
        } catch (error) {
            console.error('Error loading referrer contacts:', error);
        }
    };

    const loadContact = async () => {
        if (!contactId) return;
        try {
            setLoading(true);
            const result = await getContactById(studioSlug, contactId);
            if (result.success && result.data) {
                setFormData({
                    name: result.data.name,
                    phone: result.data.phone,
                    email: result.data.email,
                    address: result.data.address || '',
                    avatar_url: result.data.avatar_url || '',
                    status: result.data.status as 'active' | 'inactive' | 'converted',
                    acquisition_channel_id: result.data.acquisition_channel_id || undefined,
                    referrer_contact_id: result.data.referrer_contact_id || undefined,
                    referrer_name: result.data.referrer_name || '',
                    notes: result.data.notes || ''
                });
            } else {
                toast.error(result.error || 'Error al cargar contacto');
            }
        } catch (error) {
            console.error('Error loading contact:', error);
            toast.error('Error al cargar contacto');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            avatar_url: '',
            status: 'active',
            acquisition_channel_id: undefined,
            referrer_contact_id: undefined,
            referrer_name: '',
            notes: ''
        });
        setErrors({});
    };

    const handleInputChange = <K extends keyof CreateContactData>(
        field: K,
        value: CreateContactData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async () => {
        setErrors({});

        try {
            setLoading(true);
            const result = contactId
                ? await updateContact(studioSlug, { ...formData, id: contactId })
                : await createContact(studioSlug, formData);

            if (result.success) {
                toast.success(contactId ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente');
                onSuccess();
                onClose();
                resetForm();
            } else {
                toast.error(result.error || 'Error al guardar contacto');
                // Parse errors if needed
                if (result.error?.includes('teléfono')) {
                    setErrors({ phone: result.error });
                }
            }
        } catch (error) {
            console.error('Error saving contact:', error);
            toast.error('Error al guardar contacto');
        } finally {
            setLoading(false);
        }
    };

    const statusOptions: ZenSelectOption[] = [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
        { value: 'converted', label: 'Convertido' }
    ];

    const acquisitionChannelOptions: ZenSelectOption[] = [
        { value: 'none', label: 'Ninguno' },
        ...acquisitionChannels.map(c => ({ value: c.id, label: c.name }))
    ];

    const referrerContactOptions: ZenSelectOption[] = [
        { value: 'none', label: 'Ninguno' },
        ...referrerContacts.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))
    ];

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title={contactId ? 'Editar Contacto' : 'Nuevo Contacto'}
            onSave={handleSubmit}
            onCancel={onClose}
            saveLabel={contactId ? 'Actualizar' : 'Crear'}
            cancelLabel="Cancelar"
            isLoading={loading}
            maxWidth="2xl"
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                {/* Información básica */}
                <div className="space-y-4">
                    <ZenInput
                        id="name"
                        label="Nombre *"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Nombre completo"
                        disabled={loading}
                        error={errors.name}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenInput
                            id="phone"
                            label="Teléfono *"
                            required
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                            placeholder="10 dígitos"
                            disabled={loading}
                            error={errors.phone}
                        />

                        <ZenInput
                            id="email"
                            label="Email *"
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="email@ejemplo.com"
                            disabled={loading}
                            error={errors.email}
                        />
                    </div>

                    <ZenInput
                        id="address"
                        label="Dirección"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Dirección completa"
                        disabled={loading}
                    />

                    {/* Avatar Manager */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Foto de Contacto</label>
                        <div className="flex justify-center">
                            <AvatarManager
                                url={formData.avatar_url || null}
                                onUpdate={(url) => handleInputChange('avatar_url', url)}
                                studioSlug={studioSlug}
                                category="clientes"
                                subcategory="avatars"
                                size="md"
                                variant="compact"
                                loading={loading}
                                disabled={loading}
                                cropTitle="Ajustar foto de contacto"
                                cropDescription="Arrastra y redimensiona el área circular para ajustar la foto."
                                cropInstructions={[
                                    "• Arrastra para mover el área de recorte",
                                    "• Usa las esquinas para redimensionar",
                                    "• El área circular será la foto del contacto"
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenSelect
                            label="Estado"
                            value={formData.status}
                            onValueChange={(value) => {
                                const statusValue = value as 'active' | 'inactive' | 'converted';
                                if (statusValue === 'active' || statusValue === 'inactive' || statusValue === 'converted') {
                                    handleInputChange('status', statusValue);
                                }
                            }}
                            options={statusOptions}
                            disabled={loading}
                        />

                        <ZenSelect
                            label="Canal de Adquisición"
                            value={formData.acquisition_channel_id || 'none'}
                            onValueChange={(value) => handleInputChange('acquisition_channel_id', value === 'none' ? undefined : value)}
                            options={acquisitionChannelOptions}
                            placeholder="Seleccionar canal"
                            disabled={loading}
                        />
                    </div>

                    {/* Referido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenSelect
                            label="Referido por (Contacto)"
                            value={formData.referrer_contact_id || 'none'}
                            onValueChange={(value) => {
                                if (value === 'none') {
                                    handleInputChange('referrer_contact_id', undefined);
                                } else {
                                    handleInputChange('referrer_contact_id', value);
                                    handleInputChange('referrer_name', '');
                                }
                            }}
                            options={referrerContactOptions}
                            placeholder="Buscar contacto..."
                            disabled={loading}
                        />

                        <ZenInput
                            id="referrer_name"
                            label="Referido por (Nombre histórico)"
                            value={formData.referrer_name}
                            onChange={(e) => {
                                handleInputChange('referrer_name', e.target.value);
                                if (e.target.value) {
                                    handleInputChange('referrer_contact_id', undefined);
                                }
                            }}
                            placeholder="Nombre del referente"
                            disabled={loading || !!formData.referrer_contact_id}
                        />
                    </div>

                    <ZenTextarea
                        label="Notas"
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Notas adicionales..."
                        disabled={loading}
                        minRows={3}
                    />
                </div>
            </form>
        </ZenDialog>
    );
}

