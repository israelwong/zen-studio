'use client';

import { use } from 'react';
import { PendientesPageClient } from './PendientesPageClient';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

interface PendientesPageDeferredProps {
  dataPromise: Promise<{
    success: boolean;
    data?: {
      promise: {
        id: string;
        contact_name: string;
        contact_phone: string;
        contact_email: string | null;
        contact_address: string | null;
        event_type_id: string | null;
        event_type_name: string | null;
        event_name: string | null;
        event_date: Date | null;
        event_location: string | null;
      };
      studio: {
        studio_name: string;
        slogan: string | null;
        logo_url: string | null;
        id: string;
        representative_name: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        promise_share_default_show_packages: boolean;
        promise_share_default_show_categories_subtotals: boolean;
        promise_share_default_show_items_prices: boolean;
        promise_share_default_min_days_to_hire: number;
        promise_share_default_show_standard_conditions: boolean;
        promise_share_default_show_offer_conditions: boolean;
        promise_share_default_portafolios: boolean;
        promise_share_default_auto_generate_contract: boolean;
      };
      cotizaciones: PublicCotizacion[];
      paquetes: PublicPaquete[];
      condiciones_comerciales?: Array<{
        id: string;
        name: string;
        description: string | null;
        advance_percentage: number | null;
        advance_type?: string | null;
        advance_amount?: number | null;
        discount_percentage: number | null;
        type?: string;
        metodos_pago: Array<{
          id: string;
          metodo_pago_id: string;
          metodo_pago_name: string;
        }>;
      }>;
      terminos_condiciones?: Array<{
        id: string;
        title: string;
        content: string;
        is_required: boolean;
      }>;
      share_settings: PromiseShareSettings;
      portafolios?: Array<{
        id: string;
        title: string;
        slug: string;
        description: string | null;
        cover_image_url: string | null;
        event_type?: {
          id: string;
          name: string;
        } | null;
      }>;
    };
    error?: string;
  }>;
  basicPromise: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
  };
  studioSlug: string;
  promiseId: string;
}

/**
 * ⚠️ STREAMING: Componente deferred (usa use() de React 19)
 * Resuelve la promesa de datos pesados y renderiza el cliente completo
 */
export function PendientesPageDeferred({
  dataPromise,
  basicPromise,
  studioSlug,
  promiseId,
}: PendientesPageDeferredProps) {
  // ⚠️ React 19: use() resuelve la promesa y suspende si no está lista
  const result = use(dataPromise);

  if (!result.success || !result.data) {
    // Si falla, usar datos básicos como fallback
    return (
      <PendientesPageClient
        promise={basicPromise.promise}
        studio={basicPromise.studio}
        cotizaciones={[]}
        paquetes={[]}
        condiciones_comerciales={undefined}
        terminos_condiciones={undefined}
        share_settings={{
          show_packages: basicPromise.studio.promise_share_default_show_packages,
          show_categories_subtotals: basicPromise.studio.promise_share_default_show_categories_subtotals,
          show_items_prices: basicPromise.studio.promise_share_default_show_items_prices,
          min_days_to_hire: basicPromise.studio.promise_share_default_min_days_to_hire,
          show_standard_conditions: basicPromise.studio.promise_share_default_show_standard_conditions,
          show_offer_conditions: basicPromise.studio.promise_share_default_show_offer_conditions,
          portafolios: basicPromise.studio.promise_share_default_portafolios,
          auto_generate_contract: basicPromise.studio.promise_share_default_auto_generate_contract,
        }}
        portafolios={undefined}
        studioSlug={studioSlug}
        promiseId={promiseId}
      />
    );
  }

  const {
    promise,
    studio,
    cotizaciones,
    paquetes,
    condiciones_comerciales,
    terminos_condiciones,
    share_settings,
    portafolios,
  } = result.data;

  return (
    <PendientesPageClient
      promise={promise}
      studio={studio}
      cotizaciones={cotizaciones}
      paquetes={paquetes}
      condiciones_comerciales={condiciones_comerciales}
      terminos_condiciones={terminos_condiciones}
      share_settings={share_settings}
      portafolios={portafolios}
      studioSlug={studioSlug}
      promiseId={promiseId}
    />
  );
}
