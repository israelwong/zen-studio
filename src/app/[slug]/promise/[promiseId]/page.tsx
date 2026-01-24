import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getPublicPromiseMetadata } from '@/lib/actions/public/promesas.actions';
import { PromiseRedirectHandler } from './PromiseRedirectHandler';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

/**
 * Router/Dispatcher: Usa componente cliente para hacer redirect y evitar que el layout se renderice
 */
export default async function PromisePage({ params }: PromisePageProps) {
  const { slug, promiseId } = await params;

  // ⚠️ FIX: Retornar componente cliente que hace redirect
  // Esto evita que el layout se renderice antes del redirect
  return <PromiseRedirectHandler slug={slug} promiseId={promiseId} />;
}

/**
 * Generar metadata para SEO y favicon dinámico
 * Optimizado: usa función ligera getPublicPromiseMetadata en lugar de getPublicPromiseData
 */
export async function generateMetadata({
  params,
}: PromisePageProps): Promise<Metadata> {
  const { slug, promiseId } = await params;

  try {
    // Cachear datos para metadata (función ultra-ligera)
    const getCachedMetadata = unstable_cache(
      async () => {
        return getPublicPromiseMetadata(slug, promiseId);
      },
      ['public-promise-metadata', slug, promiseId],
      {
        tags: [`public-promise-metadata-${slug}-${promiseId}`],
        revalidate: 3600, // Cachear por 1 hora
      }
    );

    const result = await getCachedMetadata();

    if (!result.success || !result.data) {
      return {
        title: 'Promesa no encontrada',
        description: 'La información solicitada no está disponible',
      };
    }

    const { event_name, event_type_name, studio_name, logo_url } = result.data;
    const eventType = event_type_name || 'Evento';
    const eventName = event_name || '';

    const title = eventName
      ? `${eventType} ${eventName} | ${studio_name}`
      : `${eventType} | ${studio_name}`;
    const description = `Información de tu ${event_type_name || 'evento'} con ${studio_name}`;

    // Configurar favicon dinámico usando el logo del studio
    const icons = logo_url ? {
      icon: [
        { url: logo_url, type: 'image/png' },
        { url: logo_url, sizes: '32x32', type: 'image/png' },
        { url: logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: logo_url,
    } : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Promesa no encontrada',
      description: 'La información solicitada no está disponible',
    };
  }
}

