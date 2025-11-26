'use server';

import { Prisma } from '@prisma/client';
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';

/**
 * ⚡ GUARDA PRECIOS DE COTIZACIÓN AL AUTORIZAR
 * 
 * FLOW:
 * 1. ResumenCotizacion calcula TODO on-the-fly para mostrar en UI
 * 2. User autoriza → autorizarCotizacion() llamada
 * 3. Esta función OBTIENE el mismo catálogo que ResumenCotizacion para obtener COSTOS reales
 * 4. Calcula precios con esos costos
 * 5. Guarda estructura + precios
 * 
 * CAMPOS:
 * - Operacionales: name, cost, unit_price, subtotal (mutable si se re-edita)
 * - Snapshots: *_snapshot (inmutables, para auditoría/histórico)
 */
export async function guardarEstructuraCotizacionAutorizada(
  tx: Prisma.TransactionClient,
  cotizacionId: string,
  configPrecios: ConfiguracionPrecios,
  studioSlug: string
): Promise<void> {
  try {
    // 1️⃣ Obtener catálogo igual que ResumenCotizacion (para tener costos correctos)
    const catalogoResult = await obtenerCatalogo(studioSlug, false);
    if (!catalogoResult.success || !catalogoResult.data) {
      throw new Error('No se pudo obtener el catálogo');
    }

    // Crear mapa de item_id -> datos del catálogo para acceso rápido
    interface DatosCatalogo {
      nombre: string;
      costo: number;
      gasto: number;
      tipoUtilidad: string;
      seccion: string;
      categoria: string;
    }
    const catalogoMap = new Map<string, DatosCatalogo>();
    catalogoResult.data.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        categoria.servicios.forEach(servicio => {
          catalogoMap.set(servicio.id, {
            nombre: servicio.nombre,
            costo: servicio.costo,
            gasto: servicio.gasto,
            tipoUtilidad: servicio.tipo_utilidad,
            seccion: seccion.nombre,
            categoria: categoria.nombre,
          });
        });
      });
    });

    // 2️⃣ Obtener items de la cotización
    const items = await tx.studio_cotizacion_items.findMany({
      where: { cotizacion_id: cotizacionId },
    });

    if (items.length === 0) return;

    // 3️⃣ Para cada item de la cotización, guardar datos del catálogo
    for (const item of items) {
      if (!item.item_id) continue;

      // Obtener datos del catálogo usando el mapa
      const datosCatalogo = catalogoMap.get(item.item_id);
      if (!datosCatalogo) {
        console.warn(`[PRICING] Item ${item.item_id} no encontrado en catálogo`);
        continue;
      }

      // 🔍 DEBUG: Loguear valores antes de calcular
      console.log(`[PRICING DEBUG] Item: ${datosCatalogo.nombre}`, {
        item_id: item.item_id,
        cost_from_catalog: datosCatalogo.costo,
        expense_from_catalog: datosCatalogo.gasto,
        utility_type: datosCatalogo.tipoUtilidad,
        quantity: item.quantity,
        seccion: datosCatalogo.seccion,
        categoria: datosCatalogo.categoria,
      });

      // Calcular precios con valores del catálogo (igual que ResumenCotizacion)
      const precios = calcularPrecio(
        datosCatalogo.costo || 0,
        datosCatalogo.gasto || 0,
        datosCatalogo.tipoUtilidad === 'service' ? 'servicio' : 'producto',
        configPrecios
      );

      console.log(`[PRICING DEBUG] Precios calculados para ${datosCatalogo.nombre}:`, {
        precio_final: precios.precio_final,
        utilidad_base: precios.utilidad_base,
        subtotal_sera: precios.precio_final * item.quantity,
      });

      await tx.studio_cotizacion_items.update({
        where: { id: item.id },
        data: {
          // OPERACIONALES (lo que se muestra actualmente - mutable)
          name: datosCatalogo.nombre,
          category_name: datosCatalogo.categoria,
          seccion_name: datosCatalogo.seccion,
          cost: datosCatalogo.costo || 0,
          expense: datosCatalogo.gasto || 0,
          unit_price: precios.precio_final,
          subtotal: precios.precio_final * item.quantity,
          profit: precios.utilidad_base,
          public_price: precios.precio_final,
          profit_type: datosCatalogo.tipoUtilidad === 'service' ? 'servicio' : 'producto',

          // SNAPSHOTS (congelado al momento de autorización - inmutable para auditoría)
          name_snapshot: datosCatalogo.nombre,
          category_name_snapshot: datosCatalogo.categoria,
          seccion_name_snapshot: datosCatalogo.seccion,
          cost_snapshot: datosCatalogo.costo || 0,
          expense_snapshot: datosCatalogo.gasto || 0,
          unit_price_snapshot: precios.precio_final,
          profit_snapshot: precios.utilidad_base,
          public_price_snapshot: precios.precio_final,
          profit_type_snapshot: datosCatalogo.tipoUtilidad === 'service' ? 'servicio' : 'producto',
        },
      });
    }
  } catch (error) {
    console.error('[PRICING] Error guardando estructura:', error);
    throw error;
  }
}

