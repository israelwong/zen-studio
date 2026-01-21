import { Metadata } from 'next';
import { PaqueteEditor } from '../../components/PaqueteEditor';
import { obtenerPaqueteParaEditar } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { getCatalogShell } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { notFound } from 'next/navigation';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

export const metadata: Metadata = {
  title: 'Zenly Studio - Editar Paquete',
  description: 'Edita un paquete de servicios',
};

interface EditarPaquetePageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
    searchParams: Promise<Record<string, never>>;
}

export default async function EditarPaquetePage({ params }: EditarPaquetePageProps) {
    const { slug, id } = await params;

    // Cargar datos en paralelo
    const [paqueteResult, catalogoResult, preciosResult] = await Promise.all([
        obtenerPaqueteParaEditar(id),
        getCatalogShell(slug),
        obtenerConfiguracionPrecios(slug),
    ]);

    if (!paqueteResult.success || !paqueteResult.data) {
        notFound();
    }

    if (!catalogoResult.success || !catalogoResult.data) {
        return (
            <div className="space-y-6">
                <p className="text-red-400">Error al cargar catálogo: {catalogoResult.error}</p>
            </div>
        );
    }

    const paquete = paqueteResult.data as PaqueteFromDB;

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
            mode="edit"
            paquete={paquete}
            initialCatalogo={catalogoResult.data}
            initialPreciosConfig={preciosConfig}
        />
    );
}
