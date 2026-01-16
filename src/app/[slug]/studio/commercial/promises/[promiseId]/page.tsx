import { determinePromiseState } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { PromiseRedirectClient } from './components/PromiseRedirectClient';

interface PromisePageProps {
  params: Promise<{
    slug: string;
    promiseId: string;
  }>;
}

export default async function PromisePage({ params }: PromisePageProps) {
  const { slug: studioSlug, promiseId } = await params;

  const stateResult = await determinePromiseState(promiseId);

  if (!stateResult.success || !stateResult.data) {
    // Si hay error, el cliente manejará la redirección
    return <PromiseRedirectClient studioSlug={studioSlug} promiseId={promiseId} state={null} />;
  }

  const state = stateResult.data.state;

  // Pasar el estado al cliente para que haga la redirección
  // Esto permite mostrar el skeleton mientras se procesa
  return <PromiseRedirectClient studioSlug={studioSlug} promiseId={promiseId} state={state} />;
}
