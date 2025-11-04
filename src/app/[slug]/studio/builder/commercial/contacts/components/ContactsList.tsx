'use client';

import React, { useState } from 'react';
import { Plus, Search, Trash2, ChevronLeft, ChevronRight, ContactRound, MoreVertical, Phone, Mail, Edit } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { ZenButton, ZenInput, ZenBadge, ZenConfirmModal, ZenSelect, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/shadcn/table';
import { ContactModal } from './ContactModal';
import { deleteContact } from '@/lib/actions/studio/builder/commercial/contacts';
import { toast } from 'sonner';
import type { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { formatDateTime } from '@/lib/actions/utils/formatting';

interface ContactsListProps {
    contacts: Contact[];
    page: number;
    totalPages: number;
    total: number;
    loading: boolean;
    search: string;
    statusFilter: 'all' | 'prospecto' | 'cliente';
    acquisitionChannelFilter: string | undefined;
    onPageChange: (page: number) => void;
    onSearchChange: (search: string) => void;
    onStatusFilterChange: (status: 'all' | 'prospecto' | 'cliente') => void;
    onAcquisitionChannelFilterChange: (channelId: string | undefined) => void;
    onContactCreated: (contact: Contact) => void;
    onContactUpdated: (contact: Contact) => void;
    onContactDeleted: (contactId: string) => void;
    studioSlug: string;
}

export function ContactsList({
    contacts,
    page,
    totalPages,
    total,
    loading,
    search,
    statusFilter,
    acquisitionChannelFilter,
    onPageChange,
    onSearchChange,
    onStatusFilterChange,
    onAcquisitionChannelFilterChange,
    onContactCreated,
    onContactUpdated,
    onContactDeleted,
    studioSlug
}: ContactsListProps) {
    const { triggerRefresh } = useStorageRefresh(studioSlug);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [viewingReferrerId, setViewingReferrerId] = useState<string | null>(null);
    const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [phoneMenuOpen, setPhoneMenuOpen] = useState<string | null>(null);

    const handleCreate = () => {
        setEditingContactId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (contactId: string) => {
        setEditingContactId(contactId);
        setIsModalOpen(true);
    };

    const handleViewReferrer = (referrerId: string) => {
        setViewingReferrerId(referrerId);
        setIsModalOpen(true);
    };

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const handleSendWhatsApp = (phone: string) => {
        // Limpiar el número de teléfono (remover espacios, guiones, etc.)
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const handleDelete = (contactId: string) => {
        setDeletingContactId(contactId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingContactId) return;

        try {
            const result = await deleteContact(studioSlug, deletingContactId);
            if (result.success) {
                toast.success('Contacto eliminado exitosamente');
                triggerRefresh(); // Disparar refresh de storage
                onContactDeleted(deletingContactId); // Pasar el ID del contacto eliminado
            } else {
                toast.error(result.error || 'Error al eliminar contacto');
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error('Error al eliminar contacto');
        } finally {
            setIsDeleteModalOpen(false);
            setDeletingContactId(null);
        }
    };

    const handleModalSuccess = (contact?: Contact) => {
        if (contact) {
            if (editingContactId) {
                onContactUpdated(contact);
            } else if (!viewingReferrerId) {
                onContactCreated(contact);
            }
            // Si es viewingReferrerId, solo cerrar el modal sin actualizar
        }
        setIsModalOpen(false);
        setEditingContactId(null);
        setViewingReferrerId(null);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
            prospecto: 'default',
            cliente: 'success'
        };
        const labels: Record<string, string> = {
            prospecto: 'Prospecto',
            cliente: 'Cliente'
        };
        return (
            <ZenBadge variant={variants[status] || 'default'}>
                {labels[status] || status}
            </ZenBadge>
        );
    };


    const getCanalDisplay = (contact: Contact) => {
        // Prioridad 1: Si es referido, mostrar @nombre del referido (clickeable)
        if (contact.referrer_contact) {
            return `@${contact.referrer_contact.name}`;
        }
        // Prioridad 2: Si tiene red social específica, mostrar nombre de la red social (Instagram, Facebook, etc.)
        if (contact.social_network) {
            return contact.social_network.name;
        }
        // Prioridad 3: Si tiene canal de adquisición, mostrar el nombre del canal
        if (contact.acquisition_channel) {
            return contact.acquisition_channel.name;
        }
        return '-';
    };

    const isCanalReferido = (contact: Contact) => {
        return !!contact.referrer_contact;
    };

    return (
        <div className="space-y-4">
            {/* Header con búsqueda y filtros */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 w-full">
                    <ZenInput
                        id="search"
                        placeholder="Buscar por nombre, teléfono o email..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        icon={Search}
                        iconClassName="h-4 w-4"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <ZenSelect
                        value={statusFilter}
                        onValueChange={(value) => onStatusFilterChange(value as 'all' | 'prospecto' | 'cliente')}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'prospecto', label: 'Prospectos' },
                            { value: 'cliente', label: 'Clientes' }
                        ]}
                        className="w-full sm:w-[140px]"
                        disableSearch
                    />

                    <ZenButton onClick={handleCreate} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo
                    </ZenButton>
                </div>
            </div>

            {/* Tabla de contactos */}
            {loading ? (
                <div className="text-center py-12 text-zinc-400">Cargando...</div>
            ) : contacts.length === 0 ? (
                <div className="text-center py-12">
                    <ContactRound className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-400">No se encontraron contactos</p>
                </div>
            ) : (
                <div className="rounded-lg border border-zinc-700 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                                <TableHead className="w-12"></TableHead>
                                <TableHead className="min-w-[180px]">Nombre</TableHead>
                                <TableHead className="min-w-[120px]">Teléfono</TableHead>
                                <TableHead className="min-w-[180px]">Email</TableHead>
                                <TableHead className="min-w-[100px]">Tipo</TableHead>
                                <TableHead className="min-w-[140px]">Canal</TableHead>
                                <TableHead className="min-w-[120px]">Creado</TableHead>
                                <TableHead className="min-w-[120px]">Actualizado</TableHead>
                                <TableHead className="w-20 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow
                                    key={contact.id}
                                    className="border-zinc-700 hover:bg-zinc-800/50"
                                >
                                    <TableCell className="w-12">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
                                            <AvatarFallback className="bg-blue-600/20 text-blue-400">
                                                <ContactRound className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell
                                        className="font-medium text-white cursor-pointer hover:text-blue-400 transition-colors"
                                        onClick={() => handleEdit(contact.id)}
                                    >
                                        {contact.name}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        <ZenDropdownMenu open={phoneMenuOpen === contact.id} onOpenChange={(open) => setPhoneMenuOpen(open ? contact.id : null)}>
                                            <ZenDropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="cursor-pointer hover:text-blue-400 transition-colors text-left"
                                                >
                                                    {contact.phone}
                                                </button>
                                            </ZenDropdownMenuTrigger>
                                            <ZenDropdownMenuContent align="start">
                                                <ZenDropdownMenuItem
                                                    onClick={() => {
                                                        handleCall(contact.phone);
                                                        setPhoneMenuOpen(null);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <Phone className="mr-2 h-4 w-4" />
                                                    Llamar Ahora
                                                </ZenDropdownMenuItem>
                                                <ZenDropdownMenuItem
                                                    onClick={() => {
                                                        handleSendWhatsApp(contact.phone);
                                                        setPhoneMenuOpen(null);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                                                    Enviar WhatsApp
                                                </ZenDropdownMenuItem>
                                            </ZenDropdownMenuContent>
                                        </ZenDropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {contact.email || '-'}
                                    </TableCell>
                                    <TableCell
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => handleEdit(contact.id)}
                                    >
                                        {getStatusBadge(contact.status)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-zinc-400 text-sm ${isCanalReferido(contact)
                                            ? 'cursor-pointer hover:text-blue-400 transition-colors'
                                            : ''
                                            }`}
                                        onClick={() => {
                                            if (isCanalReferido(contact) && contact.referrer_contact) {
                                                handleViewReferrer(contact.referrer_contact.id);
                                            }
                                        }}
                                    >
                                        {getCanalDisplay(contact)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 text-sm">
                                        {formatDateTime(contact.created_at)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 text-sm">
                                        {formatDateTime(contact.updated_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ZenDropdownMenu>
                                            <ZenDropdownMenuTrigger asChild>
                                                <ZenButton
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </ZenButton>
                                            </ZenDropdownMenuTrigger>
                                            <ZenDropdownMenuContent align="end">
                                                <ZenDropdownMenuItem
                                                    onClick={() => handleEdit(contact.id)}
                                                    className="cursor-pointer"
                                                >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </ZenDropdownMenuItem>
                                                <ZenDropdownMenuSeparator />
                                                <ZenDropdownMenuItem
                                                    onClick={() => handleCall(contact.phone)}
                                                    className="cursor-pointer"
                                                >
                                                    <Phone className="mr-2 h-4 w-4" />
                                                    Llamar
                                                </ZenDropdownMenuItem>
                                                <ZenDropdownMenuItem
                                                    onClick={() => handleSendWhatsApp(contact.phone)}
                                                    className="cursor-pointer"
                                                >
                                                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                                                    Enviar WhatsApp
                                                </ZenDropdownMenuItem>
                                                {contact.email && (
                                                    <ZenDropdownMenuItem
                                                        onClick={() => {
                                                            // TODO: Implementar envío de correo
                                                            toast.info('Función de envío de correo próximamente');
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        <Mail className="mr-2 h-4 w-4" />
                                                        Enviar correo
                                                    </ZenDropdownMenuItem>
                                                )}
                                                <ZenDropdownMenuSeparator />
                                                <ZenDropdownMenuItem
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="cursor-pointer text-red-400 focus:text-red-300"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </ZenDropdownMenuItem>
                                            </ZenDropdownMenuContent>
                                        </ZenDropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                    <div className="text-sm text-zinc-400">
                        Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} de {total}
                    </div>
                    <div className="flex items-center gap-2">
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </ZenButton>
                        <span className="text-sm text-zinc-400">
                            Página {page} de {totalPages}
                        </span>
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page === totalPages || loading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </ZenButton>
                    </div>
                </div>
            )}

            {/* Modales */}
            <ContactModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingContactId(null);
                    setViewingReferrerId(null);
                }}
                contactId={editingContactId || viewingReferrerId}
                studioSlug={studioSlug}
                onSuccess={handleModalSuccess}
            />

            <ZenConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingContactId(null);
                }}
                onConfirm={confirmDelete}
                title="Eliminar Contacto"
                description="¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
            />
        </div>
    );
}

