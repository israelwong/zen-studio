'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { EventInfoCard } from '@/components/shared/promises';
import { CotizacionAutorizadaCard } from './components/CotizacionAutorizadaCard';
import { EventFormModal } from '@/components/shared/promises';
import { getCotizacionAutorizadaByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { usePromiseContext } from '../context/PromiseContext';

export default function PromiseAutorizadaPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData, isLoading: contextLoading } = usePromiseContext();

  const [showEditModal, setShowEditModal] = useState(false);
  const [cotizacionAutorizada, setCotizacionAutorizada] = useState<CotizacionListItem | null>(null);
  const [loadingCotizacion, setLoadingCotizacion] = useState(true);

  // Cargar solo la cotización autorizada (los datos de la promesa vienen del contexto)
  useEffect(() => {
    const loadCotizacion = async () => {
      if (!promiseId) return;

      try {
        const autorizadaResult = await getCotizacionAutorizadaByPromiseId(promiseId);

        if (autorizadaResult.success && autorizadaResult.data) {
          setCotizacionAutorizada(autorizadaResult.data);
        }

        setLoadingCotizacion(false);
      } catch (error) {
        console.error('Error loading cotizacion:', error);
        toast.error('Error al cargar la cotización');
        setLoadingCotizacion(false);
      }
    };

    loadCotizacion();
  }, [promiseId]);

  const handleEditSuccess = useCallback(() => {
    // Los datos se actualizarán automáticamente desde el contexto
    window.location.reload();
  }, []);

  // Usar datos del contexto directamente
  const contactId = contextPromiseData?.contact_id || null;

  if (contextLoading || !contextPromiseData || !contactId || loadingCotizacion) {
    return null;
  }

  if (!cotizacionAutorizada || !cotizacionAutorizada.evento_id) {
    return null;
  }

  const promiseData = {
    name: contextPromiseData.name,
    phone: contextPromiseData.phone,
    email: contextPromiseData.email,
    address: contextPromiseData.address,
    event_type_id: contextPromiseData.event_type_id,
    event_type_name: contextPromiseData.event_type_name,
    event_location: contextPromiseData.event_location,
    event_name: contextPromiseData.event_name,
    duration_hours: contextPromiseData.duration_hours,
    event_date: contextPromiseData.event_date,
    interested_dates: contextPromiseData.interested_dates,
    acquisition_channel_id: contextPromiseData.acquisition_channel_id,
    acquisition_channel_name: contextPromiseData.acquisition_channel_name,
    social_network_id: contextPromiseData.social_network_id,
    social_network_name: contextPromiseData.social_network_name,
    referrer_contact_id: contextPromiseData.referrer_contact_id,
    referrer_name: contextPromiseData.referrer_name,
    referrer_contact_name: contextPromiseData.referrer_contact_name,
    referrer_contact_email: contextPromiseData.referrer_contact_email,
  };

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 2 columnas: Info + Cotización Autorizada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <EventInfoCard
              studioSlug={studioSlug}
              contactId={contactId}
              contactData={{
                name: promiseData.name,
                phone: promiseData.phone,
                email: promiseData.email,
                address: promiseData.address || null,
              }}
              eventData={{
                event_type_id: promiseData.event_type_id,
                event_type_name: promiseData.event_type_name || null,
                event_location: promiseData.event_location || null,
                event_name: promiseData.event_name || null,
                duration_hours: promiseData.duration_hours ?? null,
                event_date: promiseData.event_date || null,
                interested_dates: promiseData.interested_dates,
              }}
              acquisitionData={{
                acquisition_channel_id: promiseData.acquisition_channel_id,
                acquisition_channel_name: promiseData.acquisition_channel_name || null,
                social_network_id: promiseData.social_network_id,
                social_network_name: promiseData.social_network_name || null,
                referrer_contact_id: promiseData.referrer_contact_id,
                referrer_name: promiseData.referrer_name,
                referrer_contact_name: promiseData.referrer_contact_name,
                referrer_contact_email: promiseData.referrer_contact_email,
              }}
              promiseId={promiseId}
              promiseData={promiseId ? {
                id: promiseId,
                name: promiseData.name,
                phone: promiseData.phone,
                email: promiseData.email || null,
                address: promiseData.address || null,
                event_type_id: promiseData.event_type_id,
                event_location: promiseData.event_location || null,
                event_name: promiseData.event_name || null,
                interested_dates: promiseData.interested_dates,
                acquisition_channel_id: promiseData.acquisition_channel_id || null,
                social_network_id: promiseData.social_network_id || null,
                referrer_contact_id: promiseData.referrer_contact_id || null,
                referrer_name: promiseData.referrer_name || null,
              } : null}
              onEdit={() => setShowEditModal(true)}
              context="promise"
            />
          </div>

          {/* Columna 2: Cotización Autorizada */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <CotizacionAutorizadaCard
              cotizacion={cotizacionAutorizada}
              eventoId={cotizacionAutorizada.evento_id}
              studioSlug={studioSlug}
            />
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {promiseId && (
        <EventFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          studioSlug={studioSlug}
          context="promise"
          initialData={{
            id: contactId || undefined,
            name: promiseData.name,
            phone: promiseData.phone,
            email: promiseData.email || undefined,
            address: promiseData.address || undefined,
            event_type_id: promiseData.event_type_id || undefined,
            event_location: promiseData.event_location || undefined,
            event_name: promiseData.event_name || undefined,
            duration_hours: promiseData.duration_hours ?? undefined,
            event_date: promiseData.event_date || undefined,
            interested_dates: promiseData.interested_dates || undefined,
            acquisition_channel_id: promiseData.acquisition_channel_id || undefined,
            social_network_id: promiseData.social_network_id || undefined,
            referrer_contact_id: promiseData.referrer_contact_id || undefined,
            referrer_name: promiseData.referrer_name || undefined,
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
