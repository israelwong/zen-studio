import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { PromiseLayoutClient } from './components/PromiseLayoutClient';
import { PromiseLayoutSkeleton } from './components/PromiseLayoutSkeleton';

export const dynamic = 'force-dynamic';

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

// Componente interno para cargar datos (envuelto en Suspense)
async function PromiseLayoutContent({
  studioSlug,
  promiseId,
  children,
}: {
  studioSlug: string;
  promiseId: string;
  children: React.ReactNode;
}) {
  // Determinar estado y cargar datos en una sola query optimizada
  const [stateResult, stagesResult] = await Promise.all([
    determinePromiseState(promiseId),
    getPipelineStages(studioSlug),
  ]);

  if (!stateResult.success || !stateResult.data) {
    redirect(`/${studioSlug}/studio/commercial/promises`);
  }

  const stateData = stateResult.data;
  const pipelineStages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  return (
    <PromiseLayoutClient
      studioSlug={studioSlug}
      promiseId={promiseId}
      stateData={stateData}
      pipelineStages={pipelineStages}
    >
      {children}
    </PromiseLayoutClient>
  );
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug: studioSlug, promiseId } = await params;

  return (
    <Suspense fallback={<PromiseLayoutSkeleton />}>
      <PromiseLayoutContent
        studioSlug={studioSlug}
        promiseId={promiseId}
      >
        {children}
      </PromiseLayoutContent>
    </Suspense>
  );
}
