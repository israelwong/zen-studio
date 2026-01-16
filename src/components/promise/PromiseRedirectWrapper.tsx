'use client';

import dynamic from 'next/dynamic';

// Importar con dynamic para evitar SSR (usa Supabase realtime)
const PromiseRedirectOnAuthorized = dynamic(
  () => import('@/components/promise/PromiseRedirectOnAuthorized').then(mod => ({ default: mod.PromiseRedirectOnAuthorized })),
  { ssr: false }
);

interface PromiseRedirectWrapperProps {
  studioSlug: string;
  promiseId: string;
}

export function PromiseRedirectWrapper({ studioSlug, promiseId }: PromiseRedirectWrapperProps) {
  return <PromiseRedirectOnAuthorized studioSlug={studioSlug} promiseId={promiseId} />;
}
