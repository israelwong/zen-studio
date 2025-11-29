'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function PaquetesRedirectPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    // Redirigir a la nueva ubicación en catalogo
    redirect(`/${studioSlug}/studio/commercial/catalogo?tab=paquetes`);
}
