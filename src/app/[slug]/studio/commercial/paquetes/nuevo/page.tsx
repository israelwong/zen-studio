import { Metadata } from 'next';
import { PaqueteEditor } from '../components/PaqueteEditor';
import { getCatalogShell } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';

export const metadata: Metadata = {
  title: 'Zenly Studio - Nuevo Paquete',
  description: 'Crea un nuevo paquete de servicios',
};

interface NuevoPaquetePageProps {
    params: Promise<{
        slug: string;
    }>;
    searchParams: Promise<{
        eventTypeId?: string;
    }>;
}

export default async function NuevoPaquetePage({ params, searchParams }: NuevoPaquetePageProps) {
    const { slug } = await params;
    const { eventTypeId } = await searchParams;

    // Cargar datos en paralelo
    const [catalogoResult, preciosResult] = await Promise.all([
        getCatalogShell(slug),
        obtenerConfiguracionPrecios(slug),
    ]);

    if (!catalogoResult.success || !catalogoResult.data) {
        return (
            <div className="space-y-6">
                <p className="text-red-400">Error al cargar catálogo: {catalogoResult.error}</p>
            </div>
        );
    }

    const parseValue = (val: string | undefined, defaultValue: number): number => {
        return val ? parseFloat(val) : defaultValue;
    };

    const preciosConfig = preciosResult ? {
        utilidad_servicio: parseValue(preciosResult.utilidad_servicio, 0.30),
        utilidad_producto: parseValue(preciosResult.utilidad_producto, 0.40),
        comision_venta: parseValue(preciosResult.comision_venta, 0.10),
        sobreprecio: parseValue(preciosResult.sobreprecio, 0.05),
    } : null;

    return (
        <PaqueteEditor
            studioSlug={slug}
            mode="create"
            initialEventTypeId={eventTypeId}
            initialCatalogo={catalogoResult.data}
            initialPreciosConfig={preciosConfig}
        />
    );
}
