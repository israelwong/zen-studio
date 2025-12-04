import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicPromesaPreview } from '@/lib/actions/public/promesas.actions';
import { PromesaPreviewSection } from '@/components/profile/sections/PromesaPreviewSection';

interface PromesaPreviewPageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromesaPreviewPage({ params }: PromesaPreviewPageProps) {
  const { slug, promiseId } = await params;

  // Obtener datos de la promesa con validación de seguridad
  const result = await getPublicPromesaPreview(slug, promiseId);

  if (!result.success || !result.data) {
    notFound();
  }

  const promesaData = result.data;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="w-full max-w-md mx-auto">
        <PromesaPreviewSection
          promesa={{
            id: promesaData.promesa_id,
            contactName: promesaData.contact_name,
            contactPhone: promesaData.contact_phone,
            contactEmail: promesaData.contact_email,
            eventTypeName: promesaData.event_type_name,
            interestedDates: promesaData.interested_dates,
            acquisitionChannelName: promesaData.acquisition_channel_name,
            socialNetworkName: promesaData.social_network_name,
            referrerName: promesaData.referrer_name,
          }}
          studioSlug={slug}
        />
      </div>
    </div>
  );
}

