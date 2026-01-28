import { PromiseRouteSync } from '@/components/promise/PromiseRouteSync';

interface CierrePageBasicProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * ⚠️ STREAMING: Componente básico (instantáneo)
 * Renderiza solo la sincronización de ruta sin esperar datos pesados
 */
export function CierrePageBasic({
  studioSlug,
  promiseId,
}: CierrePageBasicProps) {
  return (
    <>
      <PromiseRouteSync studioSlug={studioSlug} promiseId={promiseId} />
    </>
  );
}
