import { redirect } from 'next/navigation';
import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { PromiseLayoutClient } from './components/PromiseLayoutClient';
import { PromiseLayoutSkeleton } from './components/PromiseLayoutSkeleton';
import { PromiseProvider } from './context/PromiseContext';

interface PromiseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromiseLayout({
  children,
  params,
}: PromiseLayoutProps) {
  const { slug: studioSlug, promiseId } = await params;

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

  // Redirigir según el estado si no estamos en la ruta correcta
  // Esto se maneja en el page.tsx base que redirige según el estado

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
