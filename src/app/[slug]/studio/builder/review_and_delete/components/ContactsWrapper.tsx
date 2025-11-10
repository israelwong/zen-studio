'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ContactsList, ContactsSkeleton } from './';
import { getContacts } from '@/lib/actions/studio/builder/commercial/contacts';
import type { Contact } from '@/lib/actions/schemas/contacts-schemas';

interface ContactsWrapperProps {
  studioSlug: string;
}

export function ContactsWrapper({ studioSlug }: ContactsWrapperProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'prospecto' | 'cliente'>('all');
  const [acquisitionChannelFilter, setAcquisitionChannelFilter] = useState<string | undefined>(undefined);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getContacts(studioSlug, {
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        acquisition_channel_id: acquisitionChannelFilter
      });

      if (result.success && result.data) {
        setContacts(result.data.contacts);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || 'Error al cargar contactos');
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
      toast.error('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, page, search, statusFilter, acquisitionChannelFilter]);

  // Función para forzar recarga sin cambiar dependencias
  const forceReload = useCallback(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  const handleStatusFilterChange = (value: 'all' | 'prospecto' | 'cliente') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleAcquisitionChannelFilterChange = (value: string | undefined) => {
    setAcquisitionChannelFilter(value);
    setPage(1);
  };

  const handleContactCreated = useCallback((newContact: Contact) => {
    // Actualización optimista: agregar el contacto al inicio de la lista
    setContacts(prevContacts => [newContact, ...prevContacts]);
    setTotal(prevTotal => prevTotal + 1);
    // Si estamos en una página diferente a la primera, volver a la primera para ver el nuevo contacto
    if (page !== 1) {
      setPage(1);
    } else {
      // Si estamos en la primera página, recargar para mantener la paginación correcta
      loadContacts();
    }
  }, [page, loadContacts]);

  const handleContactUpdated = useCallback((updatedContact: Contact) => {
    // Actualización optimista: actualizar el contacto en la lista
    setContacts(prevContacts =>
      prevContacts.map(contact =>
        contact.id === updatedContact.id ? updatedContact : contact
      )
    );
    // Recargar en background para asegurar consistencia
    loadContacts();
  }, [loadContacts]);

  const handleContactDeleted = useCallback((deletedContactId: string) => {
    // Actualización optimista: remover el contacto de la lista
    setContacts(prevContacts => prevContacts.filter(c => c.id !== deletedContactId));
    setTotal(prevTotal => Math.max(0, prevTotal - 1));
    
    // Si estamos en la última página y queda solo 1 contacto, volver a la página anterior
    if (page > 1 && contacts.length === 1) {
      setPage(page - 1);
    } else {
      // Recargar en background para asegurar consistencia
      loadContacts();
    }
  }, [page, contacts.length, loadContacts]);

  if (loading && contacts.length === 0) {
    return <ContactsSkeleton />;
  }

  return (
    <ContactsList
      contacts={contacts}
      page={page}
      totalPages={totalPages}
      total={total}
      loading={loading}
      search={search}
      statusFilter={statusFilter}
      acquisitionChannelFilter={acquisitionChannelFilter}
      onPageChange={handlePageChange}
      onSearchChange={handleSearchChange}
      onStatusFilterChange={handleStatusFilterChange}
      onAcquisitionChannelFilterChange={handleAcquisitionChannelFilterChange}
      onContactCreated={handleContactCreated}
      onContactUpdated={handleContactUpdated}
      onContactDeleted={handleContactDeleted}
      studioSlug={studioSlug}
    />
  );
}

