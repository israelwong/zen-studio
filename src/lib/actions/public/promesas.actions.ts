"use server";

import { cache } from 'react';
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { withRetry } from "@/lib/database/retry-helper";
import { obtenerCatalogo } from "@/lib/actions/studio/config/catalogo.actions";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/config/configuracion-precios.actions";
import { calcularPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";
import { DEFAULT_AVISO_PRIVACIDAD_TITLE, DEFAULT_AVISO_PRIVACIDAD_VERSION, DEFAULT_AVISO_PRIVACIDAD_CONTENT } from "@/lib/constants/aviso-privacidad-default";
import type { PublicSeccionData, PublicCategoriaData, PublicServicioData, PublicCotizacion } from "@/types/public-promise";
import type { SeccionData } from "@/lib/actions/schemas/catalogo-schemas";
import { construirEstructuraJerarquicaCotizacion } from "@/lib/actions/studio/commercial/promises/cotizacion-structure.utils";
import { calcularCantidadEfectiva } from "@/lib/utils/dynamic-billing-calc";
import { calculatePackagePrice } from "@/lib/utils/package-price-engine";
import type { PipelineStage } from "@/lib/actions/schemas/promises-schemas";

/**
 * Obtener pipeline stages del studio (para uso en vistas públicas)
 * Con caché para evitar consultas repetidas
 */
async function _getPublicPipelineStagesInternal(
  studioId: string
): Promise<PipelineStage[]> {
  const stages = await prisma.studio_promise_pipeline_stages.findMany({
    where: {
      studio_id: studioId,
      is_active: true,
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      studio_id: true,
      name: true,
      slug: true,
      color: true,
      order: true,
      is_system: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return stages.map((stage) => ({
    id: stage.id,
    studio_id: stage.studio_id,
    name: stage.name,
    slug: stage.slug,
    color: stage.color,
    order: stage.order,
    is_system: stage.is_system,
    is_active: stage.is_active,
    created_at: stage.created_at,
    updated_at: stage.updated_at,
  }));
}

/**
 * Obtener pipeline stages del studio para vistas públicas (con caché)
 */
export async function getPublicPipelineStages(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: PipelineStage[];
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const getCachedStages = unstable_cache(
      () => _getPublicPipelineStagesInternal(studio.id),
      ['public-pipeline-stages', studioSlug],
      {
        tags: [`pipeline-stages-${studioSlug}`],
        revalidate: 3600, // Cachear por 1 hora
      }
    );

    const stages = await getCachedStages();

    return {
      success: true,
      data: stages,
    };
  } catch (error) {
    console.error('[getPublicPipelineStages] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener stages',
    };
  }
}

/**
 * Obtener condiciones comerciales disponibles para promesa pública
 * Con caché estratégico para evitar timeouts
 */
async function _obtenerCondicionesComercialesPublicasInternal(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // Optimizar consulta: usar select en lugar de include para reducir datos transferidos
    const condiciones = await prisma.studio_condiciones_comerciales.findMany({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        description: true,
        advance_percentage: true,
        advance_type: true,
        advance_amount: true,
        discount_percentage: true,
        type: true,
        order: true,
        condiciones_comerciales_metodo_pago: {
          where: {
            status: 'active',
          },
          select: {
            id: true,
            metodo_pago_id: true,
            metodos_pago: {
              select: {
                id: true,
                payment_method_name: true,
              },
            },
          },
          orderBy: {
            orden: 'asc',
          },
        },
      },
      orderBy: [
        { type: 'asc' }, // Primero 'standard', luego 'offer'
        { order: 'asc' }, // Luego por orden dentro de cada tipo
      ],
    });

    // Mapear todas las condiciones activas (mostrar incluso si no tienen métodos de pago)
    // Ordenar: primero standard, luego offer
    const condicionesOrdenadas = [...condiciones].sort((a, b) => {
      // Si ambos son del mismo tipo, ordenar por order
      if (a.type === b.type) {
        return (a.order || 0) - (b.order || 0);
      }
      // Standard primero (type === 'standard' viene antes que 'offer')
      if (a.type === 'standard') return -1;
      if (b.type === 'standard') return 1;
      return 0;
    });

    const condicionesMapeadas = condicionesOrdenadas.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      advance_percentage: c.advance_percentage,
      advance_type: c.advance_type,
      advance_amount: c.advance_amount,
      discount_percentage: c.discount_percentage,
      type: c.type,
      metodos_pago: c.condiciones_comerciales_metodo_pago.map((mp) => ({
        id: mp.id,
        metodo_pago_id: mp.metodo_pago_id,
        metodo_pago_name: mp.metodos_pago.payment_method_name,
      })),
    }));

    return {
      success: true,
      data: condicionesMapeadas,
    };
  } catch (error) {
    console.error("Error al obtener condiciones comerciales públicas:", error);

    // Manejar errores de timeout específicamente
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('connect')) {
        return {
          success: false,
          error: "Timeout al conectar con la base de datos. Por favor, intenta de nuevo.",
        };
      }
    }

    return {
      success: false,
      error: "Error al obtener condiciones comerciales",
    };
  }
}

/**
 * Obtener condiciones comerciales con caché (revalidate: 3600s)
 */
export async function obtenerCondicionesComercialesPublicas(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  error?: string;
}> {
  const getCachedCondiciones = unstable_cache(
    async () => _obtenerCondicionesComercialesPublicasInternal(studioSlug),
    ['public-condiciones', studioSlug],
    {
      tags: [`public-condiciones-${studioSlug}`],
      revalidate: 3600, // Cachear por 1 hora
    }
  );

  return getCachedCondiciones();
}

/**
 * Filtrar condiciones comerciales según preferencias de tipo
 */
export async function filtrarCondicionesPorPreferencias(
  studioSlug: string,
  condiciones: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>,
  showStandard: boolean,
  showOffer: boolean
): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  discount_percentage: number | null;
  type?: string;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}>> {
  if (condiciones.length === 0) return [];

  // Si las condiciones ya tienen el tipo, filtrar directamente
  // Si no tienen tipo, obtenerlo desde la base de datos
  const condicionesSinTipo = condiciones.filter(c => !c.type);

  if (condicionesSinTipo.length > 0) {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (studio) {
      const condicionesConTipo = await prisma.studio_condiciones_comerciales.findMany({
        where: {
          studio_id: studio.id,
          status: 'active',
          id: { in: condicionesSinTipo.map(c => c.id) },
        },
        select: {
          id: true,
          type: true,
        },
      });

      const tipoMap = new Map(condicionesConTipo.map(c => [c.id, c.type]));

      // Agregar tipo a las condiciones que no lo tienen
      condiciones.forEach(condicion => {
        if (!condicion.type) {
          condicion.type = tipoMap.get(condicion.id) || 'standard';
        }
      });
    }
  }

  return condiciones.filter((condicion) => {
    const tipo = condicion.type || 'standard';
    if (tipo === 'standard') {
      return showStandard;
    } else if (tipo === 'offer') {
      return showOffer;
    }
    return false;
  });
}

/**
 * Obtener términos y condiciones activos para promesa pública (internal)
 */
async function _obtenerTerminosCondicionesPublicosInternal(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    const terminos = await prisma.studio_terminos_condiciones.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        is_required: true,
      },
    });

    return {
      success: true,
      data: terminos,
    };
  } catch (error) {
    console.error("Error al obtener términos y condiciones públicos:", error);
    return {
      success: false,
      error: "Error al obtener términos y condiciones",
    };
  }
}

/**
 * Obtener términos y condiciones con caché (revalidate: 3600s)
 */
export async function obtenerTerminosCondicionesPublicos(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  error?: string;
}> {
  const getCachedTerminos = unstable_cache(
    async () => _obtenerTerminosCondicionesPublicosInternal(studioSlug),
    ['public-terminos', studioSlug],
    {
      tags: [`public-terminos-${studioSlug}`],
      revalidate: 3600, // Cachear por 1 hora
    }
  );

  return getCachedTerminos();
}

/**
 * Obtener aviso de privacidad activo para promesa pública
 */
export async function obtenerAvisoPrivacidadPublico(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    content: string;
    version: string;
    updated_at: Date;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    let aviso = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        version: true,
        updated_at: true,
      },
    });

    // Si no existe, crear uno por defecto (lazy creation)
    if (!aviso) {
      const nuevoAviso = await prisma.studio_avisos_privacidad.create({
        data: {
          studio_id: studio.id,
          title: DEFAULT_AVISO_PRIVACIDAD_TITLE,
          content: DEFAULT_AVISO_PRIVACIDAD_CONTENT,
          version: DEFAULT_AVISO_PRIVACIDAD_VERSION,
          is_active: true,
        },
        select: {
          id: true,
          title: true,
          content: true,
          version: true,
          updated_at: true,
        },
      });
      aviso = nuevoAviso;
    }

    return {
      success: true,
      data: aviso as {
        id: string;
        title: string;
        content: string;
        version: string;
        updated_at: Date;
      },
    };
  } catch (error) {
    console.error("Error al obtener aviso de privacidad público:", error);
    return {
      success: false,
      error: "Error al obtener aviso de privacidad",
    };
  }
}

// Usar el tipo exportado de public-promise.ts en lugar de duplicar la interfaz

// Tipos para paquetes públicos
interface PublicPaquete {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  recomendado: boolean;
  servicios: PublicSeccionData[];
  tiempo_minimo_contratacion: number | null;
}

/**
 * ⚠️ OPTIMIZACIÓN: Obtener solo items específicos por IDs (en lugar de catálogo completo)
 * Reduce tiempo de carga de 1.5s a <100ms
 */
async function obtenerItemsPorIds(
  studioId: string,
  itemIds: string[]
): Promise<SeccionData[]> {
  if (itemIds.length === 0) return [];

  try {
    // Obtener items con sus relaciones necesarias
    const items = await prisma.studio_items.findMany({
      where: {
        id: { in: itemIds },
        studio_id: studioId,
      },
      select: {
        id: true,
        name: true,
        cost: true,
        expense: true,
        utility_type: true,
        type: true,
        billing_type: true,
        order: true,
        status: true,
        service_category_id: true,
        service_categories: {
          select: {
            id: true,
            name: true,
            order: true,
            section_categories: {
              select: {
                section_id: true,
                service_sections: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
        item_expenses: {
          select: {
            id: true,
            name: true,
            cost: true,
          },
        },
      },
    });

    // Agrupar por sección y categoría
    const seccionesMap = new Map<string, {
      id: string;
      nombre: string;
      descripcion: string | null;
      orden: number;
      categorias: Map<string, {
        id: string;
        nombre: string;
        orden: number;
        servicios: Array<{
          id: string;
          nombre: string;
          costo: number | null;
          gasto: number | null;
          tipo_utilidad: string | null;
          type: string | null;
          billing_type: string | null;
          orden: number;
          status: string;
          gastos: Array<{ id: string; nombre: string; costo: number }>;
        }>;
      }>;
    }>();

    items.forEach((item) => {
      const seccion = item.service_categories?.section_categories?.service_sections;
      if (!seccion) return;

      if (!seccionesMap.has(seccion.id)) {
        seccionesMap.set(seccion.id, {
          id: seccion.id,
          nombre: seccion.name,
          descripcion: seccion.description,
          orden: seccion.order,
          categorias: new Map(),
        });
      }

      const seccionData = seccionesMap.get(seccion.id)!;
      const categoria = item.service_categories;
      if (!categoria) return;

      if (!seccionData.categorias.has(categoria.id)) {
        seccionData.categorias.set(categoria.id, {
          id: categoria.id,
          nombre: categoria.name,
          orden: categoria.order,
          servicios: [],
        });
      }

      const categoriaData = seccionData.categorias.get(categoria.id)!;
      categoriaData.servicios.push({
        id: item.id,
        nombre: item.name,
        costo: item.cost ?? 0,
        gasto: item.expense ?? 0,
        tipo_utilidad: item.utility_type ?? null,
        type: item.type ?? null,
        billing_type: item.billing_type ?? null,
        orden: item.order,
        status: item.status,
        gastos: item.item_expenses.map((g: { id: string; name: string; cost: number | null }) => ({
          id: g.id,
          nombre: g.name,
          costo: g.cost ?? 0,
        })),
      });
    });

    // Convertir Maps a arrays y ordenar
    return Array.from(seccionesMap.values())
      .map((seccion) => ({
        id: seccion.id,
        nombre: seccion.nombre,
        descripcion: seccion.descripcion,
        orden: seccion.orden,
        createdAt: new Date(),
        updatedAt: new Date(),
        categorias: Array.from(seccion.categorias.values())
          .map((categoria) => ({
            id: categoria.id,
            nombre: categoria.nombre,
            orden: categoria.orden,
            createdAt: new Date(),
            updatedAt: new Date(),
            seccionId: seccion.id,
            servicios: categoria.servicios
              .map((servicio) => ({
                id: servicio.id,
                studioId: studioId,
                servicioCategoriaId: categoria.id,
                nombre: servicio.nombre,
                costo: servicio.costo ?? 0,
                gasto: servicio.gasto ?? 0,
                tipo_utilidad: servicio.tipo_utilidad ?? '',
                type: servicio.type ?? '',
                billing_type: (servicio.billing_type as 'HOUR' | 'SERVICE' | 'UNIT' | undefined) ?? undefined,
                orden: servicio.orden,
                status: servicio.status,
                createdAt: new Date(),
                updatedAt: new Date(),
                gastos: servicio.gastos.map((g) => ({
                  id: g.id,
                  nombre: g.nombre,
                  costo: g.costo ?? 0, // ⚠️ Asegurar que costo sea number, no null
                })),
              }))
              .sort((a, b) => a.orden - b.orden),
          }))
          .sort((a, b) => a.orden - b.orden),
      }))
      .sort((a, b) => a.orden - b.orden);
  } catch (error) {
    console.error('[obtenerItemsPorIds] Error:', error);
    return [];
  }
}

/**
 * ⚠️ OPTIMIZACIÓN: Filtrar catálogo SIN multimedia
 * Solo datos básicos (id, name, price, quantity) - sin payload pesado
 */
function filtrarCatalogoPorItems(
  catalogo: SeccionData[],
  itemIds: Set<string>,
  itemsData: Map<string, {
    price?: number;
    quantity?: number;
    description?: string | null;
    name_snapshot?: string | null;
    description_snapshot?: string | null;
    category_name_snapshot?: string | null;
    seccion_name_snapshot?: string | null;
  }>
): PublicSeccionData[] {
  return catalogo
    .map((seccion) => ({
      id: seccion.id,
      nombre: seccion.nombre,
      orden: seccion.orden,
      categorias: seccion.categorias
        .map((categoria) => ({
          id: categoria.id,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.servicios
            .filter((servicio) => itemIds.has(servicio.id))
            .map((servicio) => {
              const itemData = itemsData.get(servicio.id);
              return {
                id: servicio.id,
                // Usar snapshots si están disponibles, sino fallback al catálogo
                name: itemData?.name_snapshot || servicio.nombre,
                name_snapshot: itemData?.name_snapshot,
                description: itemData?.description_snapshot || itemData?.description || null,
                description_snapshot: itemData?.description_snapshot,
                // Para cotizaciones: incluir price y quantity
                // Para paquetes: incluir quantity si está disponible
                ...(itemData?.price !== undefined && itemData?.quantity !== undefined
                  ? {
                    price: itemData.price,
                    quantity: itemData.quantity,
                  }
                  : itemData?.quantity !== undefined
                    ? {
                      quantity: itemData.quantity,
                    }
                    : {}),
                // Incluir billing_type para mostrar "/h" cuando sea por hora
                billing_type: servicio.billing_type as 'HOUR' | 'SERVICE' | 'UNIT' | undefined,
                // ⚠️ NO incluir multimedia - se carga bajo demanda solo para cotizaciones
              };
            }),
        }))
        .filter((categoria) => categoria.servicios.length > 0),
    }))
    .filter((seccion) => seccion.categorias.length > 0);
}

/**
 * Obtener datos para ruta /pendientes
 * Solo carga cotizaciones con status: 'pendiente' + paquetes + condiciones + términos + portafolios
 */
export async function getPublicPromisePendientes(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
    cotizaciones: PublicCotizacion[];
    paquetes: PublicPaquete[];
    condiciones_comerciales?: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type?: string | null;
      advance_amount?: number | null;
      discount_percentage: number | null;
      type?: string;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
    }>;
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
    share_settings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    };
    portafolios?: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }>;
  };
  error?: string;
}> {
  const startTime = Date.now();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Obtener datos básicos
    const basicDataStart = Date.now();
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);

    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;

    // 2. Obtener share settings
    const shareSettings = {
      show_packages: promiseBasic.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promiseBasic.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promiseBasic.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promiseBasic.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promiseBasic.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promiseBasic.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promiseBasic.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    // 3. Obtener SOLO cotizaciones pendientes
    // ⚠️ ÍNDICE: Usa [promise_id] en studio_cotizaciones (existe ✅)
    // ⚠️ OPTIMIZACIÓN: Query fragmentada para evitar timeout
    const fetchPromiseStart = Date.now();
    const promise = await withRetry(
      () => prisma.studio_promises.findFirst({
        where: {
          id: promiseId,
          studio_id: studio.id,
        },
        select: {
          id: true,
          event_type_id: true,
          duration_hours: true,
          quotes: {
            where: {
              visible_to_client: true,
              status: 'pendiente', // Solo pendientes
              // ⚠️ ÍNDICE: Usa [studio_id, status] en studio_cotizaciones (existe ✅)
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              discount: true,
              status: true,
              selected_by_prospect: true,
              order: true,
              cotizacion_items: {
                select: {
                  id: true,
                  item_id: true,
                  name_snapshot: true,
                  description_snapshot: true,
                  category_name_snapshot: true,
                  seccion_name_snapshot: true,
                  name: true,
                  description: true,
                  category_name: true,
                  seccion_name: true,
                  unit_price: true,
                  quantity: true,
                  subtotal: true,
                  status: true,
                  order: true,
                  is_courtesy: true,
                  billing_type: true,
                },
                orderBy: { order: 'asc' },
              },
              condiciones_comerciales_metodo_pago: {
                select: {
                  metodos_pago: {
                    select: {
                      payment_method_name: true,
                    },
                  },
                },
              },
              condiciones_comerciales: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
              paquete: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
    );

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    // 4. ⚠️ TAREA 1: Extraer item_ids de cotizaciones ANTES de cargar paquetes
    // Esto permite optimizar la carga del catálogo solo con items realmente usados
    const itemIdsFromQuotes = new Set<string>();
    promise.quotes.forEach((cot) => {
      cot.cotizacion_items.forEach((item) => {
        if (item.item_id) itemIdsFromQuotes.add(item.item_id);
      });
    });

    // 5. ⚠️ OPTIMIZACIÓN: Paralelizar todas las queries independientes
    const paquetesPortafoliosStart = Date.now();
    const [paquetesResult, portafoliosResult, configForm] = await Promise.all([
      // Paquetes (solo si show_packages habilitado)
      (shareSettings.show_packages && promise.event_type_id)
        ? withRetry(
          () => prisma.studio_paquetes.findMany({
            where: {
              studio_id: studio.id,
              ...(promise.event_type_id ? { event_type_id: promise.event_type_id } : {}),
              status: 'active',
            },
            select: {
              id: true,
              name: true,
              description: true,
              precio: true,
              base_hours: true,
              cover_url: true,
              is_featured: true,
              paquete_items: {
                select: {
                  id: true,
                  item_id: true,
                  quantity: true,
                  precio_personalizado: true,
                  status: true,
                  visible_to_client: true,
                  items: {
                    select: {
                      id: true,
                      name: true,
                      cost: true,
                      expense: true,
                      utility_type: true,
                    },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { precio: 'asc' },
          }),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )
        : Promise.resolve([]),
      // Portafolios (solo si habilitado)
      (shareSettings.portafolios && promise.event_type_id)
        ? prisma.studio_portfolios.findMany({
          where: {
            studio_id: studio.id,
            event_type_id: promise.event_type_id,
            is_published: true,
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            cover_image_url: true,
            event_type: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { is_featured: 'desc' },
            { order: 'asc' },
          ],
          take: 10,
        })
        : Promise.resolve([]),
      // Configuración de precios
      obtenerConfiguracionPrecios(studioSlug),
    ]);
    const paquetes = paquetesResult;
    const portafoliosData = portafoliosResult;

    // ⚠️ TAREA 1: Extraer item_ids de paquetes (solo visibles y activos)
    // CRÍTICO: Solo items que realmente se mostrarán al cliente
    const itemIdsFromPaquetes = new Set<string>();
    paquetes.forEach((paq) => {
      paq.paquete_items.forEach((item) => {
        // Solo incluir items visibles y activos (filtro quirúrgico)
        if (item.item_id && item.status === 'active' && item.visible_to_client !== false) {
          itemIdsFromPaquetes.add(item.item_id);
        }
      });
    });

    // ⚠️ TAREA 2: Combinar todos los item_ids únicos (sin duplicados)
    // CRÍTICO: Solo IDs que realmente se usan en cotizaciones y paquetes activos
    const allItemIds = Array.from(new Set([...itemIdsFromQuotes, ...itemIdsFromPaquetes]));
    const itemIdsFromQuotesArray = Array.from(itemIdsFromQuotes);

    // ⚠️ TAREA 3: Paralelizar items, multimedia, condiciones y términos
    const paralelizacionStart = Date.now();
    const [catalogo, itemsMediaData, condicionesSettled, terminosSettled] = await Promise.all([
      // ⚠️ TAREA 2: Items filtrados SOLO por IDs únicos de cotizaciones y paquetes
      // CRÍTICO: obtenerItemsPorIds usa where: { id: { in: allItemIds } } - solo estos items
      allItemIds.length > 0
        ? obtenerItemsPorIds(studio.id, allItemIds)
        : Promise.resolve([]),
      // Multimedia solo de items de cotizaciones (NO de paquetes)
      itemIdsFromQuotesArray.length > 0
        ? prisma.studio_item_media.findMany({
          where: {
            item_id: { in: itemIdsFromQuotesArray },
            studio_id: studio.id,
          },
          select: {
            id: true,
            item_id: true,
            file_url: true,
            file_type: true,
            display_order: true,
            // ⚠️ NO incluir: description, metadata, file_size, etc.
          },
          orderBy: { display_order: 'asc' },
        })
        : Promise.resolve([]),
      // Condiciones comerciales
      obtenerCondicionesComercialesPublicas(studioSlug).catch(() => ({ success: false, error: 'Error al obtener condiciones' })),
      // Términos y condiciones
      obtenerTerminosCondicionesPublicos(studioSlug).catch(() => ({ success: false, error: 'Error al obtener términos' })),
    ]);

    // ⚠️ TAREA 3: Logging quirúrgico para verificar optimización
    const paralelizacionTime = Date.now() - paralelizacionStart;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${uniqueId}] getPublicPromisePendientes:paralelizacion: ${paralelizacionTime}ms`);
      console.log(`[${uniqueId}] getPublicPromisePendientes:catalogo-optimizado: ${allItemIds.length} items (cotizaciones: ${itemIdsFromQuotes.size}, paquetes: ${itemIdsFromPaquetes.size})`);
    }

    const configPrecios = configForm ? {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30') / 100,
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20') / 100,
      comision_venta: parseFloat(configForm.comision_venta || '0.10') / 100,
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05') / 100,
    } : null;

    // Mapear multimedia
    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();
    itemsMediaData.forEach((media) => {
      if (!itemsMediaMap.has(media.item_id)) {
        itemsMediaMap.set(media.item_id, []);
      }
      itemsMediaMap.get(media.item_id)!.push({
        id: media.id,
        file_url: media.file_url,
        file_type: media.file_type as 'IMAGE' | 'VIDEO',
        thumbnail_url: undefined,
      });
    });

    // Procesar condiciones y términos (ya tienen el formato correcto del catch)
    const condicionesResult = condicionesSettled;
    const terminosResult = terminosSettled;

    // 7. Mapear cotizaciones pendientes
    const mapearStart = Date.now();
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy: boolean;
    };

    const mappedCotizaciones: PublicCotizacion[] = promise.quotes.map((cot: any) => {
      const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

      (cot.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
        if (item.item_id) {
          const itemMedia = itemsMediaMap.get(item.item_id);
          if (itemMedia) {
            cotizacionMedia.push(...itemMedia);
          }
        }
      });

      const itemsFiltrados = (cot.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

      const estructura = construirEstructuraJerarquicaCotizacion(
        itemsFiltrados.map((item: CotizacionItem) => ({
          item_id: item.item_id!,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          order: item.order,
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          name: item.name,
          description: item.description,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          id: item.id,
          billing_type: item.billing_type,
        })),
        {
          incluirPrecios: true,
          incluirDescripciones: true,
          ordenarPor: 'insercion',
        }
      );

      const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
        id: seccion.nombre,
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map(categoria => ({
          id: categoria.nombre,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.items.map(item => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre,
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null,
              price: item.unit_price,
              quantity: cantidadEfectiva, // Usar cantidad efectiva para mostrar correctamente
              is_courtesy: originalItem?.is_courtesy || false,
              billing_type: billingType,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
        })),
      }));

      const condicionesComerciales = (cot as any)['condiciones_comerciales'];

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        status: cot.status,
        order: cot.order ?? 0,
        servicios: servicios,
        condiciones_comerciales: condicionesComerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: condicionesComerciales.description || null,
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
        items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
      };
    });

    // 8. Mapear paquetes usando el engine de precios (SSoT)
    const mapearPaquetesStart = Date.now();
    // Obtener duration_hours de la promise
    const promiseDurationHours = promise.duration_hours ?? null;
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => {
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { description?: string | null; quantity?: number; price?: number }>();

      if (!paq.paquete_items || paq.paquete_items.length === 0) {
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: [],
          tiempo_minimo_contratacion: null,
        };
      }

      // Preparar items para el engine
      const paqueteItemsForEngine = paq.paquete_items
        .filter((item) => item.item_id && item.status === 'active' && item.visible_to_client !== false)
        .map((item) => {
          itemIds.add(item.item_id!);
          
          // Calcular precio del item para itemsData (para mostrar en UI)
          let precioItem: number | undefined = undefined;
          if (item.precio_personalizado !== null && item.precio_personalizado !== undefined) {
            precioItem = item.precio_personalizado;
          } else if (item.items && configPrecios) {
            const tipoUtilidad = item.items.utility_type?.toLowerCase() || 'service';
            const tipoUtilidadFinal = tipoUtilidad.includes('service') || tipoUtilidad.includes('servicio')
              ? 'servicio'
              : 'producto';

            const precios = calcularPrecio(
              item.items.cost || 0,
              item.items.expense || 0,
              tipoUtilidadFinal,
              configPrecios
            );

            precioItem = precios.precio_final;
          }

          // Obtener billing_type del catálogo para itemsData
          const itemCatalogo = catalogo
            .flatMap(s => s.categorias.flatMap(c => c.servicios))
            .find(s => s.id === item.item_id);
          const billingType = (itemCatalogo?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
          const horasParaCalculo = promiseDurationHours ?? (paq.base_hours ?? null);
          const cantidadEfectiva = calcularCantidadEfectiva(
            billingType,
            item.quantity,
            horasParaCalculo
          );

          itemsData.set(item.item_id!, {
            description: null,
            quantity: cantidadEfectiva,
            price: precioItem,
          });

          return {
            item_id: item.item_id!,
            quantity: item.quantity,
            precio_personalizado: item.precio_personalizado,
            items: item.items,
          };
        });

      const serviciosFiltrados = filtrarCatalogoPorItems(catalogo, itemIds, itemsData);

      // Usar el engine de precios (SSoT)
      if (!configPrecios) {
        // Fallback si no hay configuración de precios
        console.log('[getPublicPromisePendientes] ⚠️ Sin configPrecios, usando precio base:', paq.precio);
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: serviciosFiltrados,
          tiempo_minimo_contratacion: null,
        };
      }

      const priceResult = calculatePackagePrice({
        paquete: {
          id: paq.id,
          precio: paq.precio || 0,
          base_hours: paq.base_hours,
        },
        eventDurationHours: promiseDurationHours,
        paqueteItems: paqueteItemsForEngine,
        catalogo: catalogo,
        configPrecios: configPrecios,
      });

      // 🔍 LOG: Verificación del engine
      console.log('[getPublicPromisePendientes] Engine result:', {
        paqueteId: paq.id,
        paqueteName: paq.name,
        base_hours: paq.base_hours,
        promiseDurationHours: promiseDurationHours,
        finalPrice: priceResult.finalPrice,
        basePrice: priceResult.basePrice,
        recalculatedPrice: priceResult.recalculatedPrice,
        hoursMatch: priceResult.hoursMatch,
        priceSource: priceResult.priceSource,
      });

      return {
        id: paq.id,
        name: paq.name,
        description: paq.description,
        price: priceResult.finalPrice, // Precio ya resuelto por el engine
        cover_url: paq.cover_url,
        recomendado: paq.is_featured || false,
        servicios: serviciosFiltrados,
        tiempo_minimo_contratacion: null,
      };
    });

    // 9. Mapear portafolios (ya obtenidos en paso 5)
    const portafolios = portafoliosData.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      cover_image_url: p.cover_image_url,
      event_type: p.event_type ? {
        id: p.event_type.id,
        name: p.event_type.name,
      } : null,
    }));

    // Filtrar condiciones según settings
    let condicionesFiltradas = (condicionesResult.success && 'data' in condicionesResult && condicionesResult.data) ? condicionesResult.data : [];
    if (condicionesFiltradas.length > 0) {
      condicionesFiltradas = condicionesFiltradas.filter((condicion: { type?: string }) => {
        const tipo = condicion.type || 'standard';
        if (tipo === 'standard') {
          return shareSettings.show_standard_conditions;
        } else if (tipo === 'offer') {
          return shareSettings.show_offer_conditions;
        }
        return false;
      });
    }

    const totalTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${uniqueId}] getPublicPromisePendientes:total: ${totalTime}ms`);
    }
    
    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          contact_name: promiseBasic.contact_name,
          contact_phone: promiseBasic.contact_phone,
          contact_email: promiseBasic.contact_email,
          contact_address: promiseBasic.contact_address,
          event_type_id: promiseBasic.event_type_id,
          event_type_name: promiseBasic.event_type_name,
          event_name: promiseBasic.event_name,
          event_date: promiseBasic.event_date,
          event_location: promiseBasic.event_location,
        },
        studio,
        cotizaciones: mappedCotizaciones,
        paquetes: mappedPaquetes,
        condiciones_comerciales: condicionesFiltradas.length > 0 ? condicionesFiltradas : undefined,
        terminos_condiciones: (terminosResult.success && 'data' in terminosResult && terminosResult.data) ? terminosResult.data : undefined,
        share_settings: shareSettings,
        portafolios: portafolios.length > 0 ? portafolios : undefined,
      },
    };
  } catch (error) {
    console.error("[getPublicPromisePendientes] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos de promesa pendiente",
    };
  }
}

/**
 * ⚠️ TAREA 1: Fragmentación - Obtener solo cotización activa (pendiente)
 * Solo carga la promesa, la cotización seleccionada y sus ítems (~7 items)
 * Resultado esperado: <400ms
 */
export async function getPublicPromiseActiveQuote(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
      duration_hours: number | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
    cotizaciones: PublicCotizacion[];
    condiciones_comerciales?: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type?: string | null;
      advance_amount?: number | null;
      discount_percentage: number | null;
      type?: string;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
    }>;
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
    share_settings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    };
  };
  error?: string;
}> {
  const startTime = Date.now();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Obtener datos básicos
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);

    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;

    // Validar que studio.id sea válido
    if (!studio?.id || typeof studio.id !== 'string') {
      console.error('[getPublicPromiseActiveQuote] Invalid studio:', {
        studioSlug,
        promiseId,
        studioExists: !!studio,
        studioId: studio?.id,
        studioKeys: studio ? Object.keys(studio) : null,
        basicDataSuccess: basicData.success,
      });
      return {
        success: false,
        error: 'Studio ID inválido',
      };
    }

    // 2. Obtener share settings
    const shareSettings = {
      show_packages: promiseBasic.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promiseBasic.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promiseBasic.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promiseBasic.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promiseBasic.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promiseBasic.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promiseBasic.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    // 3. Obtener SOLO cotizaciones pendientes
    const fetchPromiseStart = Date.now();
    const promise = await withRetry(
      () => prisma.studio_promises.findFirst({
        where: {
          id: promiseId,
          studio_id: studio.id,
        },
        select: {
          id: true,
          event_type_id: true,
          duration_hours: true,
          quotes: {
            where: {
              visible_to_client: true,
              status: 'pendiente',
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              discount: true,
              status: true,
              selected_by_prospect: true,
              order: true,
              cotizacion_items: {
                select: {
                  id: true,
                  item_id: true,
                  name_snapshot: true,
                  description_snapshot: true,
                  category_name_snapshot: true,
                  seccion_name_snapshot: true,
                  name: true,
                  description: true,
                  category_name: true,
                  seccion_name: true,
                  unit_price: true,
                  quantity: true,
                  subtotal: true,
                  status: true,
                  order: true,
                  is_courtesy: true,
                  billing_type: true,
                },
                orderBy: { order: 'asc' },
              },
              condiciones_comerciales_metodo_pago: {
                select: {
                  metodos_pago: {
                    select: {
                      payment_method_name: true,
                    },
                  },
                },
              },
              condiciones_comerciales: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
              paquete: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
    );

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    // 4. Extraer item_ids de cotizaciones
    const itemIdsFromQuotes = new Set<string>();
    promise.quotes.forEach((cot) => {
      cot.cotizacion_items.forEach((item) => {
        if (item.item_id) itemIdsFromQuotes.add(item.item_id);
      });
    });

    const itemIdsFromQuotesArray = Array.from(itemIdsFromQuotes);

    // ⚠️ TAREA 1: Paralelizar solo datos esenciales para vista previa
    const paralelizacionStart = Date.now();
    const [catalogo, condicionesSettled, terminosSettled] = await Promise.all([
      // Items filtrados (solo los de la cotización) - sin multimedia para carga rápida
      itemIdsFromQuotesArray.length > 0
        ? obtenerItemsPorIds(studio.id, itemIdsFromQuotesArray)
        : Promise.resolve([]),
      // Condiciones comerciales
      obtenerCondicionesComercialesPublicas(studioSlug).catch(() => ({ success: false, error: 'Error al obtener condiciones' })),
      // Términos y condiciones
      obtenerTerminosCondicionesPublicos(studioSlug).catch(() => ({ success: false, error: 'Error al obtener términos' })),
    ]);
    // ⚠️ TAREA 1: Multimedia se carga on-demand cuando el usuario expande detalles


    // ⚠️ TAREA 1: No cargar multimedia en vista previa (se carga on-demand)
    // El código de mapeo de multimedia fue eliminado intencionalmente

    // Procesar condiciones y términos
    const condicionesResult = condicionesSettled;
    const terminosResult = terminosSettled;

    // 6. ⚠️ TAREA 1: Mapear cotizaciones pendientes (solo datos esenciales)
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy: boolean;
    };

    // ⚠️ HIGIENE DE DATOS: Crear mapa de orden de sección y categoría desde catálogo
    const seccionOrdenMap = new Map<string, number>();
    const categoriaOrdenMap = new Map<string, number>();
    catalogo.forEach(seccion => {
      seccionOrdenMap.set(seccion.nombre.toLowerCase().trim(), seccion.orden);
      seccion.categorias.forEach(categoria => {
        categoriaOrdenMap.set(
          `${seccion.nombre.toLowerCase().trim()}::${categoria.nombre.toLowerCase().trim()}`,
          categoria.orden
        );
      });
    });

    // Obtener duration_hours de la promise para cálculo dinámico
    const promiseDurationHours = promise.duration_hours ?? null;

    const mappedCotizaciones: PublicCotizacion[] = promise.quotes.map((cot: any) => {
      // ⚠️ TAREA 1: No cargar multimedia en vista previa (se carga on-demand)
      const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

      const itemsFiltrados = (cot.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

      // ⚠️ HIGIENE DE DATOS: Ordenar items por sección, categoría e item antes de construir estructura
      const itemsOrdenados = itemsFiltrados
        .map((item: CotizacionItem) => {
          const seccionNombre = (item.seccion_name_snapshot || item.seccion_name || '').toLowerCase().trim();
          const categoriaNombre = (item.category_name_snapshot || item.category_name || '').toLowerCase().trim();
          const seccionOrden = seccionOrdenMap.get(seccionNombre) ?? 999;
          const categoriaOrden = categoriaOrdenMap.get(`${seccionNombre}::${categoriaNombre}`) ?? 999;
          return {
            item,
            seccionOrden,
            categoriaOrden,
            itemOrder: item.order ?? 999,
          };
        })
        .sort((a, b) => {
          // Ordenar por: sección → categoría → item
          if (a.seccionOrden !== b.seccionOrden) return a.seccionOrden - b.seccionOrden;
          if (a.categoriaOrden !== b.categoriaOrden) return a.categoriaOrden - b.categoriaOrden;
          return a.itemOrder - b.itemOrder;
        })
        .map(({ item }) => item);

      const estructura = construirEstructuraJerarquicaCotizacion(
        itemsOrdenados.map((item: CotizacionItem) => ({
          item_id: item.item_id!,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          order: item.order,
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          name: item.name,
          description: item.description,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          id: item.id,
          billing_type: item.billing_type,
          // ⚠️ HIGIENE DE DATOS: Pasar orden de sección y categoría desde catálogo
          seccion_orden: seccionOrdenMap.get((item.seccion_name_snapshot || item.seccion_name || '').toLowerCase().trim()) ?? 999,
          categoria_orden: categoriaOrdenMap.get(`${(item.seccion_name_snapshot || item.seccion_name || '').toLowerCase().trim()}::${(item.category_name_snapshot || item.category_name || '').toLowerCase().trim()}`) ?? 999,
        })),
        {
          incluirPrecios: true,
          incluirDescripciones: false, // ⚠️ TAREA 1: No incluir descripciones en vista previa
          ordenarPor: 'catalogo', // ⚠️ HIGIENE DE DATOS: Usar orden del catálogo
        }
      );

      const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
        id: seccion.nombre,
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map(categoria => ({
          id: categoria.nombre,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.items.map(item => {
            // ⚠️ TAREA 1: No incluir media en vista previa
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre,
              description: null, // ⚠️ TAREA 1: Descripciones se cargan on-demand
              description_snapshot: null,
              price: item.unit_price,
              quantity: cantidadEfectiva, // Usar cantidad efectiva para mostrar correctamente
              is_courtesy: originalItem?.is_courtesy || false,
              billing_type: billingType,
            };
          }),
        })),
      }));

      const condicionesComerciales = (cot as any)['condiciones_comerciales'];

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        status: cot.status,
        order: cot.order ?? 0,
        servicios: servicios,
        condiciones_comerciales: condicionesComerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: condicionesComerciales.description || null,
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
        items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
      };
    });

    // Filtrar condiciones según settings
    let condicionesFiltradas = (condicionesResult.success && 'data' in condicionesResult && condicionesResult.data) ? condicionesResult.data : [];
    if (condicionesFiltradas.length > 0) {
      condicionesFiltradas = condicionesFiltradas.filter((condicion: { type?: string }) => {
        const tipo = condicion.type || 'standard';
        if (tipo === 'standard') {
          return shareSettings.show_standard_conditions;
        } else if (tipo === 'offer') {
          return shareSettings.show_offer_conditions;
        }
        return false;
      });
    }

    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          contact_name: promiseBasic.contact_name,
          contact_phone: promiseBasic.contact_phone,
          contact_email: promiseBasic.contact_email,
          contact_address: promiseBasic.contact_address,
          event_type_id: promiseBasic.event_type_id,
          event_type_name: promiseBasic.event_type_name,
          event_name: promiseBasic.event_name,
          event_date: promiseBasic.event_date,
          event_location: promiseBasic.event_location,
          duration_hours: promiseBasic.duration_hours,
        },
        studio,
        cotizaciones: mappedCotizaciones,
        condiciones_comerciales: condicionesFiltradas.length > 0 ? condicionesFiltradas : undefined,
        terminos_condiciones: (terminosResult.success && 'data' in terminosResult && terminosResult.data) ? terminosResult.data : undefined,
        share_settings: shareSettings,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseActiveQuote] Error:", error);
    return {
      success: false,
      error: "Error al obtener cotización activa",
    };
  }
}

/**
 * ⚠️ TAREA 1: Fragmentación - Obtener solo paquetes disponibles
 * Carga los paquetes sugeridos y sus ítems relacionados (~35 items)
 * ⚠️ TAREA 4: Query optimizada - solo campos esenciales
 */
export async function getPublicPromiseAvailablePackages(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      event_type_id: string | null;
    };
    studio: {
      id: string;
      promise_share_default_show_packages: boolean;
    };
    paquetes: PublicPaquete[];
    portafolios?: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }>;
    share_settings: {
      show_packages: boolean;
      portafolios: boolean;
    };
  };
  error?: string;
}> {
  const startTime = Date.now();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Obtener datos básicos mínimos
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);

    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;
    const durationHours = promiseBasic.duration_hours ?? null;

    // 2. Obtener share settings (show_packages y portafolios)
    const shareSettings = {
      show_packages: promiseBasic.share_show_packages ?? studio.promise_share_default_show_packages,
      portafolios: studio.promise_share_default_portafolios,
    };

    if (!shareSettings.show_packages || !promiseBasic.event_type_id) {
      return {
        success: true,
        data: {
          promise: {
            id: promiseBasic.id,
            event_type_id: promiseBasic.event_type_id,
          },
          studio: {
            id: studio.id,
            promise_share_default_show_packages: studio.promise_share_default_show_packages,
          },
          paquetes: [],
          portafolios: undefined,
          share_settings: shareSettings,
        },
      };
    }

    // 3. Obtener paquetes (paralelizado con config de precios)
    const paquetesStart = Date.now();
    const [paquetesResult, configForm] = await Promise.all([
      withRetry(
        () => prisma.studio_paquetes.findMany({
          where: {
            studio_id: studio.id,
            event_type_id: promiseBasic.event_type_id,
            status: 'active',
          },
          select: {
            id: true,
            name: true,
            description: true,
            precio: true,
            base_hours: true,
            cover_url: true,
            is_featured: true,
            paquete_items: {
              select: {
                id: true,
                item_id: true,
                quantity: true,
                precio_personalizado: true,
                status: true,
                visible_to_client: true,
                // ⚠️ TAREA 4: Solo campos esenciales de items
                items: {
                  select: {
                    id: true,
                    name: true,
                    cost: true,
                    expense: true,
                    utility_type: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { precio: 'asc' },
        }),
        { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
      ),
      obtenerConfiguracionPrecios(studioSlug),
    ]);

    const paquetes = paquetesResult;
    const configPrecios = configForm ? {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30') / 100,
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20') / 100,
      comision_venta: parseFloat(configForm.comision_venta || '0.10') / 100,
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05') / 100,
    } : null;

    // 4. Extraer item_ids de paquetes (solo visibles y activos)
    const itemIdsFromPaquetes = new Set<string>();
    paquetes.forEach((paq) => {
      paq.paquete_items.forEach((item) => {
        if (item.item_id && item.status === 'active' && item.visible_to_client !== false) {
          itemIdsFromPaquetes.add(item.item_id);
        }
      });
    });

    const allItemIds = Array.from(itemIdsFromPaquetes);

    // 5. ⚠️ TAREA 4: Obtener items optimizados (solo campos esenciales)
    const catalogoStart = Date.now();
    const catalogo = allItemIds.length > 0
      ? await obtenerItemsPorIds(studio.id, allItemIds)
      : [];


    // 6. Mapear paquetes usando el engine de precios (SSoT)
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => {
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { description?: string | null; quantity?: number; price?: number }>();

      if (!paq.paquete_items || paq.paquete_items.length === 0) {
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: [],
          tiempo_minimo_contratacion: null,
        };
      }

      // Preparar items para el engine
      const paqueteItemsForEngine = paq.paquete_items
        .filter((item) => item.item_id && item.status === 'active' && item.visible_to_client !== false)
        .map((item) => {
          itemIds.add(item.item_id!);
          
          // Calcular precio del item para itemsData (para mostrar en UI)
          let precioItem: number | undefined = undefined;
          if (item.precio_personalizado !== null && item.precio_personalizado !== undefined) {
            precioItem = item.precio_personalizado;
          } else if (item.items && configPrecios) {
            const tipoUtilidad = item.items.utility_type?.toLowerCase() || 'service';
            const tipoUtilidadFinal = tipoUtilidad.includes('service') || tipoUtilidad.includes('servicio')
              ? 'servicio'
              : 'producto';

            const precios = calcularPrecio(
              item.items.cost || 0,
              item.items.expense || 0,
              tipoUtilidadFinal,
              configPrecios
            );

            precioItem = precios.precio_final;
          }

          // Obtener billing_type del catálogo para itemsData
          const itemCatalogo = catalogo
            .flatMap(s => s.categorias.flatMap(c => c.servicios))
            .find(s => s.id === item.item_id);
          const billingType = (itemCatalogo?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
          const horasParaCalculo = durationHours ?? (paq.base_hours ?? null);
          const cantidadEfectiva = calcularCantidadEfectiva(
            billingType,
            item.quantity,
            horasParaCalculo
          );

          itemsData.set(item.item_id!, {
            description: null,
            quantity: cantidadEfectiva,
            price: precioItem,
          });

          return {
            item_id: item.item_id!,
            quantity: item.quantity,
            precio_personalizado: item.precio_personalizado,
            items: item.items,
          };
        });

      const serviciosFiltrados = filtrarCatalogoPorItems(catalogo, itemIds, itemsData);

      // Usar el engine de precios (SSoT)
      if (!configPrecios) {
        // Fallback si no hay configuración de precios
        console.log('[getPublicPromiseAvailablePackages] ⚠️ Sin configPrecios, usando precio base:', paq.precio);
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: serviciosFiltrados,
          tiempo_minimo_contratacion: null,
        };
      }

      const priceResult = calculatePackagePrice({
        paquete: {
          id: paq.id,
          precio: paq.precio || 0,
          base_hours: paq.base_hours,
        },
        eventDurationHours: durationHours,
        paqueteItems: paqueteItemsForEngine,
        catalogo: catalogo,
        configPrecios: configPrecios,
      });

      // 🔍 LOG: Verificación del engine
      console.log('[getPublicPromiseAvailablePackages] Engine result:', {
        paqueteId: paq.id,
        paqueteName: paq.name,
        base_hours: paq.base_hours,
        eventDurationHours: durationHours,
        finalPrice: priceResult.finalPrice,
        basePrice: priceResult.basePrice,
        recalculatedPrice: priceResult.recalculatedPrice,
        hoursMatch: priceResult.hoursMatch,
        priceSource: priceResult.priceSource,
      });

      return {
        id: paq.id,
        name: paq.name,
        description: paq.description,
        price: priceResult.finalPrice, // Precio ya resuelto por el engine
        cover_url: paq.cover_url,
        recomendado: paq.is_featured || false,
        servicios: serviciosFiltrados,
        tiempo_minimo_contratacion: null,
      };
    });

    // 7. Obtener portafolios según tipo de evento (si está habilitado)
    let portafolios: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }> = [];

    if (shareSettings.portafolios && promiseBasic.event_type_id) {
      const portafoliosData = await prisma.studio_portfolios.findMany({
        where: {
          studio_id: studio.id,
          event_type_id: promiseBasic.event_type_id,
          is_published: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          cover_image_url: true,
          event_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { is_featured: 'desc' },
          { order: 'asc' },
        ],
        take: 10, // Limitar a 10 portafolios
      });

      portafolios = portafoliosData.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        cover_image_url: p.cover_image_url,
        event_type: p.event_type ? {
          id: p.event_type.id,
          name: p.event_type.name,
        } : null,
      }));
    }

    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          event_type_id: promiseBasic.event_type_id,
        },
        studio: {
          id: studio.id,
          promise_share_default_show_packages: studio.promise_share_default_show_packages,
        },
        paquetes: mappedPaquetes,
        portafolios: portafolios.length > 0 ? portafolios : undefined,
        share_settings: shareSettings,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseAvailablePackages] Error:", error);
    return {
      success: false,
      error: "Error al obtener paquetes disponibles",
    };
  }
}

/**
 * ⚠️ STREAMING: Obtener solo precio total para Basic (instantáneo)
 * Usado en NegociacionPageBasic para mostrar precio sin esperar datos pesados
 */
export async function getPublicPromiseNegociacionBasic(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    totalPrice: number;
  };
  error?: string;
}> {
  try {
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);
    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { studio } = basicData.data;

    // Obtener solo precio de la cotización en negociación
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        quotes: {
          where: {
            visible_to_client: true,
            status: 'negociacion',
            selected_by_prospect: { not: true },
          },
          select: {
            price: true,
            discount: true,
          },
          take: 1,
        },
      },
    });

    if (!promise || promise.quotes.length === 0) {
      return {
        success: false,
        error: "Cotización en negociación no encontrada",
      };
    }

    const cotizacion = promise.quotes[0];
    const totalPrice = Number(cotizacion.price) - (Number(cotizacion.discount) || 0);

    return {
      success: true,
      data: { totalPrice },
    };
  } catch (error) {
    console.error("[getPublicPromiseNegociacionBasic] Error:", error);
    return {
      success: false,
      error: "Error al obtener precio de cotización",
    };
  }
}

/**
 * Obtener datos para ruta /negociacion (deferred - datos pesados)
 * Solo carga la cotización con status: 'negociacion' y selected_by_prospect !== true
 * ⚠️ OPTIMIZADO: NO carga catálogo completo, solo items de la cotización
 */
export async function getPublicPromiseNegociacion(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
    cotizaciones: PublicCotizacion[];
    condiciones_comerciales?: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type?: string | null;
      advance_amount?: number | null;
      discount_percentage: number | null;
      type?: string;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
    }>;
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
    share_settings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    };
  };
  error?: string;
}> {
  const startTime = Date.now();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Obtener datos básicos
    const basicDataStart = Date.now();
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);
    console.log(`[${uniqueId}] getPublicPromiseNegociacion:basicData: ${Date.now() - basicDataStart}ms`);

    if (!basicData.success || !basicData.data) {
      console.log(`[${uniqueId}] getPublicPromiseNegociacion:total: ${Date.now() - startTime}ms (early return)`);
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;

    // 2. Obtener share settings
    const shareSettings = {
      show_packages: promiseBasic.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promiseBasic.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promiseBasic.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promiseBasic.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promiseBasic.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promiseBasic.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promiseBasic.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    // 3. Obtener SOLO la cotización en negociación (selected_by_prospect !== true)
    // ⚠️ ÍNDICE: Usa [promise_id] y [promise_id, selected_by_prospect] en studio_cotizaciones (existen ✅)
    const fetchPromiseStart = Date.now();
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        duration_hours: true,
        quotes: {
          where: {
            visible_to_client: true,
            status: 'negociacion',
            selected_by_prospect: { not: true }, // NO debe estar seleccionada por prospecto
            // ⚠️ ÍNDICE: Usa [studio_id, status] y [promise_id, selected_by_prospect] (existen ✅)
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            selected_by_prospect: true,
            order: true,
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                name_snapshot: true,
                description_snapshot: true,
                category_name_snapshot: true,
                seccion_name_snapshot: true,
                name: true,
                description: true,
                category_name: true,
                seccion_name: true,
                unit_price: true,
                quantity: true,
                subtotal: true,
                status: true,
                order: true,
                is_courtesy: true,
                billing_type: true,
              },
              orderBy: { order: 'asc' },
            },
            condiciones_comerciales_metodo_pago: {
              where: {
                status: 'active',
              },
              select: {
                metodos_pago: {
                  select: {
                    payment_method_name: true,
                  },
                },
              },
              orderBy: {
                orden: 'asc',
              },
            },
            condiciones_comerciales: {
              select: {
                id: true,
                name: true,
                description: true,
                advance_percentage: true,
                advance_type: true,
                advance_amount: true,
                discount_percentage: true,
              },
            },
            paquete: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { order: 'asc' },
          take: 1, // Solo una cotización en negociación
        },
      },
    });

    if (!promise || promise.quotes.length === 0) {
      return {
        success: false,
        error: "Cotización en negociación no encontrada",
      };
    }

    const cotizacion = promise.quotes[0];

    // Obtener duration_hours de la promise para cálculo dinámico
    const promiseDurationHours = promise.duration_hours ?? null;

    // 4. ⚠️ OPTIMIZADO: NO cargar catálogo completo
    // Usar solo snapshots de cotizacion_items para construir estructura jerárquica
    // Esto reduce significativamente el tiempo de carga y transferencia de datos

    // 5. Obtener multimedia solo de items de esta cotización
    const multimediaStart = Date.now();
    const allItemIds = new Set<string>();
    cotizacion.cotizacion_items.forEach((item) => {
      if (item.item_id) allItemIds.add(item.item_id);
    });

    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();

    if (allItemIds.size > 0) {
      const fetchMediaStart = Date.now();
      const itemsMediaData = await prisma.studio_item_media.findMany({
        where: {
          item_id: { in: Array.from(allItemIds) },
          studio_id: studio.id,
        },
        select: {
          id: true,
          item_id: true,
          file_url: true,
          file_type: true,
          display_order: true,
        },
        orderBy: { display_order: 'asc' },
      });
      console.log(`[${uniqueId}] DB:FetchItemMedia: ${Date.now() - fetchMediaStart}ms`);

      itemsMediaData.forEach((media) => {
        if (!itemsMediaMap.has(media.item_id)) {
          itemsMediaMap.set(media.item_id, []);
        }
        itemsMediaMap.get(media.item_id)!.push({
          id: media.id,
          file_url: media.file_url,
          file_type: media.file_type as 'IMAGE' | 'VIDEO',
          thumbnail_url: undefined,
        });
      });
    }

    // 6. Mapear cotización en negociación
    const mapearStart = Date.now();
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy: boolean;
    };

    const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

    (cotizacion.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
      if (item.item_id) {
        const itemMedia = itemsMediaMap.get(item.item_id);
        if (itemMedia) {
          cotizacionMedia.push(...itemMedia);
        }
      }
    });

    const itemsFiltrados = (cotizacion.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

    // ⚠️ OPTIMIZADO: Construir estructura jerárquica usando solo snapshots
    // No necesitamos el catálogo completo, los snapshots tienen toda la información necesaria
    const estructura = construirEstructuraJerarquicaCotizacion(
      itemsFiltrados.map((item: CotizacionItem) => ({
        item_id: item.item_id!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        order: item.order,
        // Priorizar snapshots (inmutables) sobre datos del catálogo
        name_snapshot: item.name_snapshot || item.name,
        description_snapshot: item.description_snapshot || item.description,
        category_name_snapshot: item.category_name_snapshot || item.category_name,
        seccion_name_snapshot: item.seccion_name_snapshot || item.seccion_name,
        // Fallback a datos del catálogo si no hay snapshots
        name: item.name_snapshot || item.name,
        description: item.description_snapshot || item.description,
        category_name: item.category_name_snapshot || item.category_name,
        seccion_name: item.seccion_name_snapshot || item.seccion_name,
        id: item.id,
      })),
      {
        incluirPrecios: true,
        incluirDescripciones: true,
        ordenarPor: 'insercion',
      }
    );

    const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
      id: seccion.nombre,
      nombre: seccion.nombre,
      orden: seccion.orden,
      categorias: seccion.categorias.map(categoria => ({
        id: categoria.nombre,
        nombre: categoria.nombre,
        orden: categoria.orden,
          servicios: categoria.items.map(item => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre,
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null,
              price: item.unit_price,
              quantity: cantidadEfectiva, // Usar cantidad efectiva para mostrar correctamente
              is_courtesy: originalItem?.is_courtesy || false,
              billing_type: billingType,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
      })),
    }));

    const condicionesComerciales = (cotizacion as any)['condiciones_comerciales'];

    const mappedCotizacion: PublicCotizacion = {
      id: cotizacion.id,
      name: cotizacion.name,
      description: cotizacion.description,
      price: cotizacion.price,
      discount: cotizacion.discount,
      status: cotizacion.status,
      order: cotizacion.order ?? 0,
      servicios: servicios,
      condiciones_comerciales: condicionesComerciales
        ? {
          metodo_pago: cotizacion.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
          condiciones: condicionesComerciales.description || null,
          // Para cotizaciones en negociación, incluir datos completos
          id: condicionesComerciales.id,
          name: condicionesComerciales.name,
          description: condicionesComerciales.description,
          advance_percentage: condicionesComerciales.advance_percentage ? Number(condicionesComerciales.advance_percentage) : null,
          advance_type: condicionesComerciales.advance_type,
          advance_amount: condicionesComerciales.advance_amount ? Number(condicionesComerciales.advance_amount) : null,
          discount_percentage: condicionesComerciales.discount_percentage ? Number(condicionesComerciales.discount_percentage) : null,
        }
        : null,
      paquete_origen: cotizacion.paquete
        ? {
          id: cotizacion.paquete.id,
          name: cotizacion.paquete.name,
        }
        : null,
      selected_by_prospect: cotizacion.selected_by_prospect || false,
      negociacion_precio_original: cotizacion.negociacion_precio_original ? Number(cotizacion.negociacion_precio_original) : null,
      negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado ? Number(cotizacion.negociacion_precio_personalizado) : null,
      items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
    };

    // 7. Obtener condiciones comerciales disponibles y términos (con Promise.allSettled)
    const condicionesStart = Date.now();
    const [condicionesSettled, terminosSettled] = await Promise.allSettled([
      obtenerCondicionesComercialesPublicas(studioSlug),
      obtenerTerminosCondicionesPublicos(studioSlug),
    ]);
    console.log(`[${uniqueId}] getPublicPromiseNegociacion:condiciones: ${Date.now() - condicionesStart}ms`);

    const condicionesResult = condicionesSettled.status === 'fulfilled'
      ? condicionesSettled.value
      : { success: false, error: 'Error al obtener condiciones comerciales' };
    const terminosResult = terminosSettled.status === 'fulfilled'
      ? terminosSettled.value
      : { success: false, error: 'Error al obtener términos y condiciones' };

    let condicionesFiltradas = condicionesResult.success && condicionesResult.data ? condicionesResult.data : [];
    if (condicionesFiltradas.length > 0) {
      condicionesFiltradas = condicionesFiltradas.filter((condicion) => {
        const tipo = condicion.type || 'standard';
        if (tipo === 'standard') {
          return shareSettings.show_standard_conditions;
        } else if (tipo === 'offer') {
          return shareSettings.show_offer_conditions;
        }
        return false;
      });
    }

    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          contact_name: promiseBasic.contact_name,
          contact_phone: promiseBasic.contact_phone,
          contact_email: promiseBasic.contact_email,
          contact_address: promiseBasic.contact_address,
          event_type_id: promiseBasic.event_type_id,
          event_type_name: promiseBasic.event_type_name,
          event_name: promiseBasic.event_name,
          event_date: promiseBasic.event_date,
          event_location: promiseBasic.event_location,
        },
        studio,
        cotizaciones: [mappedCotizacion],
        condiciones_comerciales: condicionesFiltradas.length > 0 ? condicionesFiltradas : undefined,
        terminos_condiciones: (terminosResult.success && 'data' in terminosResult && terminosResult.data) ? terminosResult.data : undefined,
        share_settings: shareSettings,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseNegociacion] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos de promesa en negociación",
    };
  }
}

/**
 * ⚠️ STREAMING: Obtener solo precio total para Basic (instantáneo)
 * Usado en CierrePageBasic para mostrar precio sin esperar datos pesados
 */
export async function getPublicPromiseCierreBasic(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    totalPrice: number;
  };
  error?: string;
}> {
  try {
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);
    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { studio } = basicData.data;

    // Obtener solo precio de la cotización en cierre
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        quotes: {
          where: {
            visible_to_client: true,
            status: { in: ['en_cierre', 'cierre'] },
          },
          select: {
            price: true,
            discount: true,
          },
          take: 1,
        },
      },
    });

    if (!promise || promise.quotes.length === 0) {
      return {
        success: false,
        error: "Cotización en cierre no encontrada",
      };
    }

    const cotizacion = promise.quotes[0];
    const totalPrice = Number(cotizacion.price) - (Number(cotizacion.discount) || 0);

    return {
      success: true,
      data: { totalPrice },
    };
  } catch (error) {
    console.error("[getPublicPromiseCierreBasic] Error:", error);
    return {
      success: false,
      error: "Error al obtener precio de cotización",
    };
  }
}

/**
 * Obtener datos para ruta /cierre (deferred - datos pesados)
 * Solo carga la cotización con status: 'en_cierre' + contrato + condiciones del cierre
 * ⚠️ OPTIMIZADO: NO carga catálogo completo, solo items de la cotización
 */
export async function getPublicPromiseCierre(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    };
    cotizaciones: PublicCotizacion[];
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
  };
  error?: string;
}> {
  try {
    // 1. Obtener datos básicos
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);

    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;

    // 2. Obtener SOLO la cotización en cierre con cotizacion_cierre
    // ⚠️ ÍNDICE: Usa [promise_id] en studio_cotizaciones (existe ✅)
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        duration_hours: true,
        quotes: {
          where: {
            visible_to_client: true,
            status: { in: ['en_cierre', 'cierre'] },
            // ⚠️ ÍNDICE: Usa [studio_id, status] en studio_cotizaciones (existe ✅)
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            selected_by_prospect: true,
            order: true,
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                name_snapshot: true,
                description_snapshot: true,
                category_name_snapshot: true,
                seccion_name_snapshot: true,
                name: true,
                description: true,
                category_name: true,
                seccion_name: true,
                unit_price: true,
                quantity: true,
                subtotal: true,
                status: true,
                order: true,
                is_courtesy: true,
                billing_type: true,
              },
              orderBy: { order: 'asc' },
            },
            cotizacion_cierre: {
              select: {
                contract_template_id: true,
                contract_content: true,
                contract_version: true,
                contrato_definido: true,
                contract_signed_at: true,
                condiciones_comerciales_id: true,
                condiciones_comerciales_definidas: true,
                condiciones_comerciales: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    advance_percentage: true,
                    advance_type: true,
                    advance_amount: true,
                    discount_percentage: true,
                  },
                },
              },
            },
            paquete: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { order: 'asc' },
          take: 1, // Solo una cotización en cierre
        },
      },
    });

    if (!promise || promise.quotes.length === 0) {
      return {
        success: false,
        error: "Cotización en cierre no encontrada",
      };
    }

    const cotizacion = promise.quotes[0];

    // Obtener duration_hours de la promise para cálculo dinámico
    const promiseDurationHours = promise.duration_hours ?? null;

    // 3. ⚠️ OPTIMIZADO: NO cargar catálogo completo
    // Usar solo snapshots de cotizacion_items para construir estructura jerárquica
    // Esto reduce significativamente el tiempo de carga y transferencia de datos

    // 4. Obtener multimedia y catálogo solo de items de esta cotización
    const allItemIds = new Set<string>();
    cotizacion.cotizacion_items.forEach((item) => {
      if (item.item_id) allItemIds.add(item.item_id);
    });

    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();
    const catalogo = allItemIds.size > 0
      ? await obtenerItemsPorIds(studio.id, Array.from(allItemIds))
      : [];

    if (allItemIds.size > 0) {
      const itemsMediaData = await prisma.studio_item_media.findMany({
        where: {
          item_id: { in: Array.from(allItemIds) },
          studio_id: studio.id,
        },
        select: {
          id: true,
          item_id: true,
          file_url: true,
          file_type: true,
          display_order: true,
        },
        orderBy: { display_order: 'asc' },
      });

      itemsMediaData.forEach((media) => {
        if (!itemsMediaMap.has(media.item_id)) {
          itemsMediaMap.set(media.item_id, []);
        }
        itemsMediaMap.get(media.item_id)!.push({
          id: media.id,
          file_url: media.file_url,
          file_type: media.file_type as 'IMAGE' | 'VIDEO',
          thumbnail_url: undefined,
        });
      });
    }

    // 4. Mapear cotización en cierre
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy: boolean;
    };

    const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

    (cotizacion.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
      if (item.item_id) {
        const itemMedia = itemsMediaMap.get(item.item_id);
        if (itemMedia) {
          cotizacionMedia.push(...itemMedia);
        }
      }
    });

    const itemsFiltrados = (cotizacion.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

    // ⚠️ OPTIMIZADO: Construir estructura jerárquica usando solo snapshots
    // No necesitamos el catálogo completo, los snapshots tienen toda la información necesaria
    const estructura = construirEstructuraJerarquicaCotizacion(
      itemsFiltrados.map((item: CotizacionItem) => ({
        item_id: item.item_id!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        order: item.order,
        // Priorizar snapshots (inmutables) sobre datos del catálogo
        name_snapshot: item.name_snapshot || item.name,
        description_snapshot: item.description_snapshot || item.description,
        category_name_snapshot: item.category_name_snapshot || item.category_name,
        seccion_name_snapshot: item.seccion_name_snapshot || item.seccion_name,
        // Fallback a datos del catálogo si no hay snapshots
        name: item.name_snapshot || item.name,
        description: item.description_snapshot || item.description,
        category_name: item.category_name_snapshot || item.category_name,
        seccion_name: item.seccion_name_snapshot || item.seccion_name,
        id: item.id,
      })),
      {
        incluirPrecios: true,
        incluirDescripciones: true,
        ordenarPor: 'insercion',
      }
    );

    const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
      id: seccion.nombre,
      nombre: seccion.nombre,
      orden: seccion.orden,
      categorias: seccion.categorias.map(categoria => ({
        id: categoria.nombre,
        nombre: categoria.nombre,
        orden: categoria.orden,
          servicios: categoria.items.map(item => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre,
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null,
              price: item.unit_price,
              quantity: cantidadEfectiva, // Usar cantidad efectiva para mostrar correctamente
              is_courtesy: originalItem?.is_courtesy || false,
              billing_type: billingType,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
      })),
    }));

    const cierre = cotizacion.cotizacion_cierre as any;

    const mappedCotizacion: PublicCotizacion = {
      id: cotizacion.id,
      name: cotizacion.name,
      description: cotizacion.description,
      price: cotizacion.price,
      discount: cotizacion.discount,
      status: cotizacion.status || 'en_cierre',
      order: cotizacion.order ?? 0,
      servicios: servicios,
      condiciones_comerciales: null, // No se usan condiciones disponibles en cierre
      paquete_origen: cotizacion.paquete
        ? {
          id: cotizacion.paquete.id,
          name: cotizacion.paquete.name,
        }
        : null,
      selected_by_prospect: cotizacion.selected_by_prospect || false,
      negociacion_precio_original: cotizacion.negociacion_precio_original ? Number(cotizacion.negociacion_precio_original) : null,
      negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado ? Number(cotizacion.negociacion_precio_personalizado) : null,
      items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
      // Información del contrato
      contract: (() => {
        const hasContract = (cierre?.contrato_definido && cierre?.contract_template_id) ||
          (cierre?.condiciones_comerciales && cierre?.condiciones_comerciales_definidas) ||
          (cierre?.contract_template_id || cierre?.contract_content);

        if (!hasContract) return undefined;

        return {
          template_id: cierre?.contract_template_id || null,
          content: cierre?.contract_content || null,
          version: cierre?.contract_version ?? 1,
          signed_at: cierre?.contract_signed_at || null,
          condiciones_comerciales: (cierre?.condiciones_comerciales ? {
            id: cierre.condiciones_comerciales.id,
            name: cierre.condiciones_comerciales.name,
            description: cierre.condiciones_comerciales.description,
            advance_percentage: cierre.condiciones_comerciales.advance_percentage ? Number(cierre.condiciones_comerciales.advance_percentage) : null,
            advance_type: cierre.condiciones_comerciales.advance_type,
            advance_amount: cierre.condiciones_comerciales.advance_amount ? Number(cierre.condiciones_comerciales.advance_amount) : null,
            discount_percentage: cierre.condiciones_comerciales.discount_percentage ? Number(cierre.condiciones_comerciales.discount_percentage) : null,
          } : null),
        };
      })(),
    };

    // 6. Obtener términos y condiciones (necesarios para firma)
    const terminosSettled = await Promise.allSettled([
      obtenerTerminosCondicionesPublicos(studioSlug),
    ]);

    const terminosResult = terminosSettled[0].status === 'fulfilled'
      ? terminosSettled[0].value
      : { success: false, error: 'Error al obtener términos y condiciones' };

    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          contact_name: promiseBasic.contact_name,
          contact_phone: promiseBasic.contact_phone,
          contact_email: promiseBasic.contact_email,
          contact_address: promiseBasic.contact_address,
          event_type_id: promiseBasic.event_type_id,
          event_type_name: promiseBasic.event_type_name,
          event_name: promiseBasic.event_name,
          event_date: promiseBasic.event_date,
          event_location: promiseBasic.event_location,
        },
        studio: {
          studio_name: studio.studio_name,
          slogan: studio.slogan,
          logo_url: studio.logo_url,
          id: studio.id,
          representative_name: studio.representative_name,
          phone: studio.phone,
          email: studio.email,
          address: studio.address,
        },
        cotizaciones: [mappedCotizacion],
        terminos_condiciones: (terminosResult.success && 'data' in terminosResult && terminosResult.data) ? terminosResult.data : undefined,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseCierre] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos de promesa en cierre",
    };
  }
}

/**
 * Obtener datos completos de promesa para página pública
 * ⚠️ DEPRECATED: Usar funciones fragmentadas (getPublicPromisePendientes, getPublicPromiseNegociacion, getPublicPromiseCierre)
 * Mantener para compatibilidad temporal
 */
export async function getPublicPromiseData(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
    cotizaciones: PublicCotizacion[];
    paquetes: PublicPaquete[];
    condiciones_comerciales?: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type?: string | null;
      advance_amount?: number | null;
      discount_percentage: number | null;
      type?: string;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
    }>;
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
    share_settings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    };
    portafolios?: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }>;
  };
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        slogan: true,
        logo_url: true,
        representative_name: true,
        phone: true,
        email: true,
        address: true,
        promise_share_default_show_packages: true,
        promise_share_default_show_categories_subtotals: true,
        promise_share_default_show_items_prices: true,
        promise_share_default_min_days_to_hire: true,
        promise_share_default_show_standard_conditions: true,
        promise_share_default_show_offer_conditions: true,
        promise_share_default_portafolios: true,
        promise_share_default_auto_generate_contract: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa con sus cotizaciones y preferencias de compartir
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        name: true,
        event_type_id: true,
        event_date: true,
        event_location: true,
        duration_hours: true,
        share_show_packages: true,
        share_show_categories_subtotals: true,
        share_show_items_prices: true,
        share_min_days_to_hire: true,
        share_show_standard_conditions: true,
        share_show_offer_conditions: true,
        share_auto_generate_contract: true,
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        quotes: {
          where: {
            visible_to_client: true,
            status: {
              in: ['pendiente', 'negociacion', 'en_cierre', 'contract_generated', 'contract_signed'],
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            selected_by_prospect: true,
            visible_to_client: true,
            order: true,
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                // Snapshots (prioridad - inmutables)
                name_snapshot: true,
                description_snapshot: true,
                category_name_snapshot: true,
                seccion_name_snapshot: true,
                // Campos operacionales (fallback - mutables)
                name: true,
                description: true,
                category_name: true,
                seccion_name: true,
                unit_price: true,
                quantity: true,
                subtotal: true,
                status: true,
                order: true,
                is_courtesy: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            condiciones_comerciales_metodo_pago: {
              select: {
                metodos_pago: {
                  select: {
                    payment_method_name: true,
                  },
                },
              },
            },
            condiciones_comerciales: {
              select: {
                id: true,
                name: true,
                description: true,
                advance_percentage: true,
                advance_type: true,
                advance_amount: true,
                discount_percentage: true,
              },
            },
            paquete: {
              select: {
                id: true,
                name: true,
              },
            },
            cotizacion_cierre: {
              select: {
                contract_template_id: true,
                contract_content: true,
                contract_version: true,
                contrato_definido: true,
                contract_signed_at: true,
                condiciones_comerciales_id: true,
                condiciones_comerciales_definidas: true,
                condiciones_comerciales: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    advance_percentage: true,
                    advance_type: true,
                    advance_amount: true,
                    discount_percentage: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada o no tienes acceso a esta información",
      };
    }

    // Validar que la promesa tenga al menos cotizaciones o paquetes disponibles
    // Esto se verifica después de obtener las cotizaciones y paquetes

    // Obtener duration_hours de la promise para cálculo dinámico de paquetes
    const promiseDurationHours = promise.duration_hours ?? null;

    // Obtener preferencias de compartir (combinar defaults del studio con overrides de la promesa)
    const shareSettings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    } = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promise.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    // 3. ⚠️ OPTIMIZACIÓN: Extraer item_ids ANTES de cargar catálogo completo
    const itemIdsFromQuotesForCatalogo = new Set<string>();
    promise.quotes.forEach((cot) => {
      cot.cotizacion_items.forEach((item) => {
        if (item.item_id) itemIdsFromQuotesForCatalogo.add(item.item_id);
      });
    });

    // 4. Obtener configuración de precios para calcular precios del catálogo
    const configForm = await obtenerConfiguracionPrecios(studioSlug);
    const configPrecios = configForm ? {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30') / 100,
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20') / 100,
      comision_venta: parseFloat(configForm.comision_venta || '0.10') / 100,
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05') / 100,
    } : null;

    // 5. Obtener paquetes disponibles para el tipo de evento (solo si show_packages está habilitado)
    const paquetes = (shareSettings.show_packages && promise.event_type_id)
      ? await prisma.studio_paquetes.findMany({
        where: {
          studio_id: studio.id,
          event_type_id: promise.event_type_id,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          description: true,
          precio: true,
          base_hours: true,
          cover_url: true,
          is_featured: true,
          paquete_items: {
            select: {
              id: true,
              item_id: true,
              quantity: true,
              precio_personalizado: true,
              status: true,
              visible_to_client: true,
              items: {
                select: {
                  id: true,
                  name: true,
                  cost: true,
                  expense: true,
                  utility_type: true,
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          precio: 'asc',
        },
      })
      : [];

    // Extraer item_ids de paquetes (solo para catálogo, NO para multimedia)
    const itemIdsFromPaquetesForCatalogo = new Set<string>();
    paquetes.forEach((paq) => {
      paq.paquete_items.forEach((item) => {
        if (item.item_id) itemIdsFromPaquetesForCatalogo.add(item.item_id);
      });
    });

    // Combinar todos los item_ids para catálogo
    const allItemIdsForCatalogo = Array.from(new Set([...itemIdsFromQuotesForCatalogo, ...itemIdsFromPaquetesForCatalogo]));

    // ⚠️ OPTIMIZACIÓN: Obtener solo items necesarios (en lugar de catálogo completo) - SIN multimedia
    const catalogo = await obtenerItemsPorIds(studio.id, allItemIdsForCatalogo);

    // 6. ⚠️ OPTIMIZACIÓN: Obtener multimedia SOLO de items en cotizaciones (NO de paquetes)
    const itemIdsFromQuotes = Array.from(itemIdsFromQuotesForCatalogo);

    // Obtener multimedia de items (solo si hay item_ids de cotizaciones)
    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();

    if (itemIdsFromQuotes.length > 0) {
      const fetchMediaStart = Date.now();
      const itemsMediaData = await prisma.studio_item_media.findMany({
        where: {
          item_id: { in: Array.from(itemIdsFromQuotes) },
          studio_id: studio.id,
        },
        select: {
          id: true,
          item_id: true,
          file_url: true,
          file_type: true,
          display_order: true,
        },
        orderBy: {
          display_order: 'asc',
        },
      });
      console.log(`DB:FetchItemMedia: ${Date.now() - fetchMediaStart}ms`);

      // Crear mapa de multimedia por item_id
      itemsMediaData.forEach((media) => {
        if (!itemsMediaMap.has(media.item_id)) {
          itemsMediaMap.set(media.item_id, []);
        }
        itemsMediaMap.get(media.item_id)!.push({
          id: media.id,
          file_url: media.file_url,
          file_type: media.file_type as 'IMAGE' | 'VIDEO',
          thumbnail_url: undefined, // No existe en el schema
        });
      });
    }

    // 6. Mapear cotizaciones con estructura jerárquica usando función centralizada
    // Ordenar explícitamente por order antes de mapear
    const quotesOrdenadas = promise.quotes.slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    // Tipo para cotizacion_item basado en la query
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy?: boolean;
    };

    const mappedCotizaciones: PublicCotizacion[] = (quotesOrdenadas as any[]).map((cot: any) => {
      const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

      // Agregar multimedia de todos los items
      (cot.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
        if (item.item_id) {
          const itemMedia = itemsMediaMap.get(item.item_id);
          if (itemMedia) {
            cotizacionMedia.push(...itemMedia);
          }
        }
      });

      // Filtrar items con item_id válido
      const itemsFiltrados = (cot.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

      // Usar función centralizada para construir estructura jerárquica
      const estructura = construirEstructuraJerarquicaCotizacion(
        itemsFiltrados.map((item: CotizacionItem) => ({
          item_id: item.item_id!,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          order: item.order,
          // Snapshots primero, luego campos operacionales
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          name: item.name,
          description: item.description,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          id: item.id,
        })),
        {
          incluirPrecios: true,
          incluirDescripciones: true,
          ordenarPor: 'insercion',
        }
      );

      // Convertir formato de EstructuraJerarquica a PublicSeccionData[]
      const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
        id: seccion.nombre,
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map(categoria => ({
          id: categoria.nombre,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.items.map(item => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre, // Ya viene del snapshot
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null, // Ya viene del snapshot
              price: item.unit_price,
              quantity: cantidadEfectiva,
              is_courtesy: (item as any).is_courtesy || originalItem?.is_courtesy || false,
              billing_type: billingType,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
        })),
      }));

      const condicionesComerciales = (cot as any)['condiciones_comerciales'];

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        status: cot.status,
        order: cot.order ?? 0,
        servicios: servicios,
        condiciones_comerciales: condicionesComerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: condicionesComerciales.description || null,
            // Para cotizaciones en negociación, incluir datos completos de la condición comercial
            ...(cot.status === 'negociacion' ? {
              id: condicionesComerciales.id,
              name: condicionesComerciales.name,
              description: condicionesComerciales.description,
              advance_percentage: condicionesComerciales.advance_percentage ? Number(condicionesComerciales.advance_percentage) : null,
              advance_type: condicionesComerciales.advance_type,
              advance_amount: condicionesComerciales.advance_amount ? Number(condicionesComerciales.advance_amount) : null,
              discount_percentage: condicionesComerciales.discount_percentage ? Number(condicionesComerciales.discount_percentage) : null,
            } : {}),
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
        negociacion_precio_original: (cot as any).negociacion_precio_original
          ? Number((cot as any).negociacion_precio_original)
          : null,
        negociacion_precio_personalizado: (cot as any).negociacion_precio_personalizado
          ? Number((cot as any).negociacion_precio_personalizado)
          : null,
        items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
        // Información del contrato si está disponible
        // El contrato se almacena en studio_cotizaciones_cierre (tabla temporal)
        // Se muestra si hay contrato_definido y contract_template_id (igual que en el estudio)
        // O si hay condiciones comerciales definidas (para mostrar el desglose financiero)
        // También incluir condiciones comerciales de la cotización directamente si el contrato fue generado manualmente
        contract: (() => {
          const cierre = cot.cotizacion_cierre as any;
          const hasContract = (cierre?.contrato_definido && cierre?.contract_template_id) ||
            (cierre?.condiciones_comerciales && cierre?.condiciones_comerciales_definidas) ||
            (cierre?.contract_template_id || cierre?.contract_content);

          if (!hasContract) return undefined;

          return {
            template_id: cierre?.contract_template_id || null,
            content: cierre?.contract_content || null,
            version: cierre?.contract_version ?? 1,
            signed_at: cierre?.contract_signed_at || null,
            // Priorizar condiciones comerciales de cotizacion_cierre, sino usar las de la cotización directamente
            condiciones_comerciales: (cierre?.condiciones_comerciales ? {
              id: cierre.condiciones_comerciales.id,
              name: cierre.condiciones_comerciales.name,
              description: cierre.condiciones_comerciales.description,
              advance_percentage: cierre.condiciones_comerciales.advance_percentage ? Number(cierre.condiciones_comerciales.advance_percentage) : null,
              advance_type: cierre.condiciones_comerciales.advance_type,
              advance_amount: cierre.condiciones_comerciales.advance_amount ? Number(cierre.condiciones_comerciales.advance_amount) : null,
              discount_percentage: cierre.condiciones_comerciales.discount_percentage ? Number(cierre.condiciones_comerciales.discount_percentage) : null,
            } : null),
          };
        })(),
      };
    });

    // 7. Mapear paquetes usando el engine de precios (SSoT)
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => {
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { description?: string | null; quantity?: number; price?: number }>();

      if (!paq.paquete_items || paq.paquete_items.length === 0) {
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: [],
          tiempo_minimo_contratacion: null,
        };
      }

      // Preparar items para el engine
      const paqueteItemsForEngine = paq.paquete_items
        .filter((item) => item.item_id && item.status === 'active' && item.visible_to_client !== false)
        .map((item) => {
          itemIds.add(item.item_id!);
          
          // Calcular precio del item para itemsData (para mostrar en UI)
          let precioItem: number | undefined = undefined;
          if (item.precio_personalizado !== null && item.precio_personalizado !== undefined) {
            precioItem = item.precio_personalizado;
          } else if (item.items && configPrecios) {
            const tipoUtilidad = item.items.utility_type?.toLowerCase() || 'service';
            const tipoUtilidadFinal = tipoUtilidad.includes('service') || tipoUtilidad.includes('servicio')
              ? 'servicio'
              : 'producto';

            const precios = calcularPrecio(
              item.items.cost || 0,
              item.items.expense || 0,
              tipoUtilidadFinal,
              configPrecios
            );

            precioItem = precios.precio_final;
          }

          // Obtener billing_type del catálogo para itemsData
          const itemCatalogo = catalogo
            .flatMap(s => s.categorias.flatMap(c => c.servicios))
            .find(s => s.id === item.item_id);
          const billingType = (itemCatalogo?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
          const horasParaCalculo = promiseDurationHours ?? (paq.base_hours ?? null);
          const cantidadEfectiva = calcularCantidadEfectiva(
            billingType,
            item.quantity,
            horasParaCalculo
          );

          itemsData.set(item.item_id!, {
            description: null,
            quantity: cantidadEfectiva,
            price: precioItem,
          });

          return {
            item_id: item.item_id!,
            quantity: item.quantity,
            precio_personalizado: item.precio_personalizado,
            items: item.items,
          };
        });

      const serviciosFiltrados = filtrarCatalogoPorItems(catalogo, itemIds, itemsData);

      // Usar el engine de precios (SSoT)
      if (!configPrecios) {
        // Fallback si no hay configuración de precios
        console.log('[getPublicPromiseData] ⚠️ Sin configPrecios, usando precio base:', paq.precio);
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: serviciosFiltrados,
          tiempo_minimo_contratacion: null,
        };
      }

      const priceResult = calculatePackagePrice({
        paquete: {
          id: paq.id,
          precio: paq.precio || 0,
          base_hours: paq.base_hours,
        },
        eventDurationHours: promiseDurationHours,
        paqueteItems: paqueteItemsForEngine,
        catalogo: catalogo,
        configPrecios: configPrecios,
      });

      // 🔍 LOG: Verificación del engine
      console.log('[getPublicPromiseData] Engine result:', {
        paqueteId: paq.id,
        paqueteName: paq.name,
        base_hours: paq.base_hours,
        promiseDurationHours: promiseDurationHours,
        finalPrice: priceResult.finalPrice,
        basePrice: priceResult.basePrice,
        recalculatedPrice: priceResult.recalculatedPrice,
        hoursMatch: priceResult.hoursMatch,
        priceSource: priceResult.priceSource,
      });

      return {
        id: paq.id,
        name: paq.name,
        description: paq.description,
        price: priceResult.finalPrice, // Precio ya resuelto por el engine
        cover_url: paq.cover_url,
        recomendado: paq.is_featured || false,
        servicios: serviciosFiltrados,
        tiempo_minimo_contratacion: null,
      };
    });

    // 8. Obtener portafolios según tipo de evento (si está habilitado)
    let portafolios: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }> = [];

    if (shareSettings.portafolios && promise.event_type_id) {
      const portafoliosData = await prisma.studio_portfolios.findMany({
        where: {
          studio_id: studio.id,
          event_type_id: promise.event_type_id,
          is_published: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          cover_image_url: true,
          event_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { is_featured: 'desc' },
          { order: 'asc' },
        ],
        take: 10, // Limitar a 10 portafolios
      });

      portafolios = portafoliosData.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        cover_image_url: p.cover_image_url,
        event_type: p.event_type ? {
          id: p.event_type.id,
          name: p.event_type.name,
        } : null,
      }));
    }

    // 9. Validar que haya contenido disponible (cotizaciones o paquetes)
    if (mappedCotizaciones.length === 0 && mappedPaquetes.length === 0) {
      return {
        success: false,
        error: "No hay cotizaciones ni paquetes disponibles para mostrar",
      };
    }

    // 10. Obtener condiciones comerciales disponibles y términos y condiciones
    // Usar Promise.allSettled para que si una falla, la otra pueda continuar
    const [condicionesSettled, terminosSettled] = await Promise.allSettled([
      obtenerCondicionesComercialesPublicas(studioSlug),
      obtenerTerminosCondicionesPublicos(studioSlug),
    ]);

    // Extraer resultados con manejo de errores
    const condicionesResult = condicionesSettled.status === 'fulfilled'
      ? condicionesSettled.value
      : { success: false, error: 'Error al obtener condiciones comerciales' };
    const terminosResult = terminosSettled.status === 'fulfilled'
      ? terminosSettled.value
      : { success: false, error: 'Error al obtener términos y condiciones' };

    // Filtrar condiciones comerciales según preferencias
    let condicionesFiltradas = condicionesResult.success && condicionesResult.data ? condicionesResult.data : [];
    if (condicionesFiltradas.length > 0) {
      condicionesFiltradas = condicionesFiltradas.filter((condicion) => {
        const tipo = condicion.type || 'standard';
        if (tipo === 'standard') {
          return shareSettings.show_standard_conditions;
        } else if (tipo === 'offer') {
          return shareSettings.show_offer_conditions;
        }
        return false; // Si no tiene tipo, no mostrar
      });
    }

    // Crear objeto share_settings con tipo explícito usando valores directamente
    const shareSettingsObj: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    } = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promise.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    return {
      success: true,
      data: {
        promise: {
          id: promise.id,
          contact_name: promise.contact.name,
          contact_phone: promise.contact.phone,
          contact_email: promise.contact.email,
          contact_address: promise.contact.address,
          event_type_id: promise.event_type?.id || null,
          event_type_name: promise.event_type?.name || null,
          event_name: promise.name,
          event_date: promise.event_date,
          event_location: promise.event_location,
        },
        studio: {
          studio_name: studio.studio_name,
          slogan: studio.slogan,
          logo_url: studio.logo_url,
          id: studio.id,
          representative_name: studio.representative_name,
          phone: studio.phone,
          email: studio.email,
          address: studio.address,
          promise_share_default_show_packages: studio.promise_share_default_show_packages,
          promise_share_default_show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
          promise_share_default_show_items_prices: studio.promise_share_default_show_items_prices,
          promise_share_default_min_days_to_hire: studio.promise_share_default_min_days_to_hire,
          promise_share_default_show_standard_conditions: studio.promise_share_default_show_standard_conditions,
          promise_share_default_show_offer_conditions: studio.promise_share_default_show_offer_conditions,
          promise_share_default_portafolios: studio.promise_share_default_portafolios,
          promise_share_default_auto_generate_contract: studio.promise_share_default_auto_generate_contract ?? false,
        },
        cotizaciones: mappedCotizaciones,
        paquetes: mappedPaquetes,
        condiciones_comerciales: condicionesFiltradas.length > 0 ? condicionesFiltradas : undefined,
        terminos_condiciones: (terminosResult.success && 'data' in terminosResult && terminosResult.data) ? terminosResult.data : undefined,
        share_settings: shareSettingsObj,
        portafolios: portafolios.length > 0 ? portafolios : undefined,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseData] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos de promesa",
    };
  }
}

/**
 * Obtener datos de promesa para preview público (legacy - mantener compatibilidad)
 * Valida que la promesa pertenezca al studio del slug
 * Solo expone datos necesarios para la vista pública
 */
export async function getPublicPromesaPreview(
  studioSlug: string,
  promesaId: string
): Promise<{
  success: boolean;
  data?: {
    promesa_id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    interested_dates: string[] | null;
    acquisition_channel_name: string | null;
    social_network_name: string | null;
    referrer_name: string | null;
  };
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa y validar que pertenece al studio
    const promesa = await prisma.studio_promises.findFirst({
      where: {
        id: promesaId,
        studio_id: studio.id, // Validación crítica de seguridad
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            acquisition_channel: {
              select: {
                name: true,
              },
            },
            social_network: {
              select: {
                name: true,
              },
            },
            referrer_name: true,
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!promesa) {
      return {
        success: false,
        error: "Promesa no encontrada o no tienes acceso",
      };
    }

    // 3. Retornar solo datos necesarios para el preview público
    return {
      success: true,
      data: {
        promesa_id: promesa.id,
        contact_name: promesa.contact.name,
        contact_phone: promesa.contact.phone,
        contact_email: promesa.contact.email,
        event_type_name: promesa.event_type?.name || null,
        interested_dates: promesa.tentative_dates
          ? (promesa.tentative_dates as string[])
          : null,
        acquisition_channel_name: promesa.contact.acquisition_channel?.name || null,
        social_network_name: promesa.contact.social_network?.name || null,
        referrer_name: promesa.contact.referrer_name || null,
      },
    };
  } catch (error) {
    console.error("[getPublicPromesaPreview] Error:", error);
    return {
      success: false,
      error: "Error al obtener promesa",
    };
  }
}

/**
 * Actualizar datos de promesa desde página pública
 * Actualiza contacto y datos del evento
 */
export async function updatePublicPromiseData(
  studioSlug: string,
  promiseId: string,
  data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_name: string | null;
    event_location: string | null;
    // event_date es read-only, no se actualiza
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa y validar que pertenece al studio
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    if (!promise.contact?.id) {
      return {
        success: false,
        error: "La promesa no tiene contacto asociado",
      };
    }

    // 2.5. Validar duplicados de teléfono y correo
    const newPhone = data.contact_phone.trim();
    const newEmail = data.contact_email?.trim() || null;

    // Validar teléfono duplicado (si está cambiando)
    if (newPhone !== promise.contact.phone) {
      const existingContactByPhone = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          phone: newPhone,
          id: { not: promise.contact.id }, // Excluir el contacto actual
        },
        select: { id: true },
      });

      if (existingContactByPhone) {
        return {
          success: false,
          error: "Este teléfono ya está registrado para otro contacto en este estudio",
        };
      }
    }

    // Validar email duplicado (si está cambiando y se proporciona)
    if (newEmail && newEmail !== promise.contact.email) {
      const existingContactByEmail = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          email: newEmail,
          id: { not: promise.contact.id }, // Excluir el contacto actual
        },
        select: { id: true },
      });

      if (existingContactByEmail) {
        return {
          success: false,
          error: "Este correo electrónico ya está registrado para otro contacto en este estudio",
        };
      }
    }

    // 3. Validar datos requeridos
    if (!data.contact_name?.trim()) {
      return {
        success: false,
        error: "El nombre del contacto es requerido",
      };
    }

    if (!data.contact_phone?.trim()) {
      return {
        success: false,
        error: "El teléfono del contacto es requerido",
      };
    }

    if (!data.contact_email?.trim()) {
      return {
        success: false,
        error: "El correo del contacto es requerido",
      };
    }

    if (!data.contact_address?.trim()) {
      return {
        success: false,
        error: "La dirección del contacto es requerida",
      };
    }

    if (!data.event_name?.trim()) {
      return {
        success: false,
        error: "El nombre del evento es requerido",
      };
    }

    if (!data.event_location?.trim()) {
      return {
        success: false,
        error: "La locación del evento es requerida",
      };
    }

    // 4. Actualizar contacto y promesa en una transacción
    // En este punto, todos los campos están validados y no son null
    const contactEmail = data.contact_email?.trim() || '';
    const contactAddress = data.contact_address?.trim() || '';
    const eventName = data.event_name?.trim() || '';
    const eventLocation = data.event_location?.trim() || '';

    await prisma.$transaction(async (tx) => {
      // Actualizar contacto
      await tx.studio_contacts.update({
        where: { id: promise.contact.id },
        data: {
          name: data.contact_name.trim(),
          phone: data.contact_phone.trim(),
          email: contactEmail || null,
          address: contactAddress || null,
        },
      });

      // Actualizar promesa
      await tx.studio_promises.update({
        where: { id: promiseId },
        data: {
          name: eventName || null,
          event_location: eventLocation || null,
        },
      });
    });

    // 5. Revalidar paths
    revalidatePath(`/${studioSlug}/promise/${promiseId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[updatePublicPromiseData] Error:", error);
    return {
      success: false,
      error: "Error al actualizar datos",
    };
  }
}

/**
 * Obtener solo los datos del contrato de una cotización específica (para actualización local)
 */
export async function getPublicCotizacionContract(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    template_id: string | null;
    content: string | null;
    version: number;
    signed_at: Date | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        cotizacion_cierre: {
          select: {
            contract_template_id: true,
            contract_content: true,
            contract_version: true,
            contract_signed_at: true,
            condiciones_comerciales: {
              select: {
                id: true,
                name: true,
                description: true,
                advance_percentage: true,
                advance_type: true,
                advance_amount: true,
                discount_percentage: true,
              },
            },
          },
        },
      },
    });

    if (!cotizacion || !cotizacion.cotizacion_cierre) {
      return { success: false, error: "Cotización o contrato no encontrado" };
    }

    const cierre = cotizacion.cotizacion_cierre;

    return {
      success: true,
      data: {
        template_id: cierre.contract_template_id,
        content: cierre.contract_content,
        version: cierre.contract_version || 1,
        signed_at: cierre.contract_signed_at,
        condiciones_comerciales: cierre.condiciones_comerciales ? {
          id: cierre.condiciones_comerciales.id,
          name: cierre.condiciones_comerciales.name,
          description: cierre.condiciones_comerciales.description,
          advance_percentage: cierre.condiciones_comerciales.advance_percentage ? Number(cierre.condiciones_comerciales.advance_percentage) : null,
          advance_type: cierre.condiciones_comerciales.advance_type,
          advance_amount: cierre.condiciones_comerciales.advance_amount ? Number(cierre.condiciones_comerciales.advance_amount) : null,
          discount_percentage: cierre.condiciones_comerciales.discount_percentage ? Number(cierre.condiciones_comerciales.discount_percentage) : null,
        } : null,
      },
    };
  } catch (error) {
    console.error("[getPublicCotizacionContract] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos del contrato",
    };
  }
}

/**
 * Obtener datos mínimos para metadata (consulta ultra-ligera)
 * Solo trae: event_name, event_type_name, studio.studio_name, studio.logo_url
 * Usado en generateMetadata para evitar cargar datos pesados
 */
export async function getPublicPromiseMetadata(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    event_name: string | null;
    event_type_name: string | null;
    studio_name: string;
    logo_url: string | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        logo_url: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        name: true,
        event_type: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    return {
      success: true,
      data: {
        event_name: promise.name,
        event_type_name: promise.event_type?.name || null,
        studio_name: studio.studio_name,
        logo_url: studio.logo_url,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseMetadata] Error:", error);
    return {
      success: false,
      error: "Error al obtener metadata de promesa",
    };
  }
}

/**
 * ⚠️ INTERNA: Función sin caché para obtener Studio
 * Usada con cache de React para cachear por request
 */
const getStudioById = cache(async (studioSlug: string) => {
  return await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
});

/**
 * ⚠️ INTERNA: Función sin caché para obtener estados de cotizaciones
 * Usada por getPublicPromiseRouteState con caché
 */
async function _getPublicPromiseRouteStateInternal(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    status: string;
    selected_by_prospect: boolean | null;
  }>;
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe (usando cache de React)
    const studio = await getStudioById(studioSlug);

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Verificar si hay cotizaciones aprobadas (redirigir a /cliente)
    // ⚠️ NO-STORE: Forzar consulta fresca sin caché
    const cotizacionAprobada = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: promiseId,
        studio_id: studio.id,
        status: { in: ['aprobada', 'autorizada', 'approved'] },
      },
      select: { id: true },
    });

    if (cotizacionAprobada) {
      return {
        success: true,
        data: [{ id: cotizacionAprobada.id, status: 'aprobada', selected_by_prospect: null }],
      };
    }

    // 3. Obtener solo estados de cotizaciones visibles
    // ⚠️ NO-STORE: Forzar consulta fresca sin caché para evitar datos obsoletos
    const cotizaciones = await prisma.studio_cotizaciones.findMany({
      where: {
        promise_id: promiseId,
        studio_id: studio.id,
        visible_to_client: true,
        status: {
          in: ['pendiente', 'negociacion', 'en_cierre', 'cierre', 'contract_generated', 'contract_signed'],
        },
      },
      select: {
        id: true,
        status: true,
        selected_by_prospect: true,
        visible_to_client: true,
      },
    });


    // ✅ NORMALIZACIÓN OBLIGATORIA: Normalizar estados antes de devolver
    // Esto asegura que 'cierre' siempre se convierta a 'en_cierre' para consistencia
    const normalizedData = cotizaciones.map(cot => {
      // Normalizar status: 'cierre' -> 'en_cierre'
      const normalizedStatus = cot.status === 'cierre' ? 'en_cierre' : cot.status;
      return {
        id: cot.id,
        status: normalizedStatus,
        selected_by_prospect: cot.selected_by_prospect ?? false,
      };
    });


    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    console.error("[getPublicPromiseRouteState] Error:", error);
    return {
      success: false,
      error: "Error al obtener estados de cotizaciones",
    };
  }
}

/**
 * Obtener solo estados de cotizaciones para determinar routing (consulta ligera)
 * Usado en page.tsx para enrutamiento inicial sin cargar todos los datos
 * Similar a determinePromiseState pero para rutas públicas
 * 
 * ✅ CACHÉ: Usa unstable_cache con tags para compartir resultado entre dispatcher y sub-rutas
 * Tag: public-promise-route-state-${studioSlug}-${promiseId}
 * Invalidar con: revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`)
 */
export async function getPublicPromiseRouteState(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    status: string;
    selected_by_prospect: boolean | null;
  }>;
  error?: string;
}> {
  // ⚠️ CACHÉ CON INVALIDACIÓN MANUAL: Compartir resultado pero invalidar por tags
  // El caché se invalida automáticamente cuando cambian las cotizaciones vía tags
  const getCachedRouteState = unstable_cache(
    async () => {
      return _getPublicPromiseRouteStateInternal(studioSlug, promiseId);
    },
    ['public-promise-route-state', studioSlug, promiseId],
    {
      tags: [`public-promise-route-state-${studioSlug}-${promiseId}`],
      revalidate: false, // Invalidación manual por tags (revalidateTag)
    }
  );

  return getCachedRouteState();
}

/**
 * ⚠️ TAREA 3: Función ligera para refresco quirúrgico
 * Solo devuelve cotizaciones actualizadas y datos básicos de la promise
 * NO incluye: paquetes, portafolios, catálogo completo, condiciones comerciales
 */
export async function getPublicPromiseUpdate(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    cotizaciones: PublicCotizacion[];
  };
  error?: string;
}> {
  const startTime = Date.now();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Obtener datos básicos de promise y studio
    const basicDataStart = Date.now();
    const basicData = await getPublicPromiseBasicData(studioSlug, promiseId);

    if (!basicData.success || !basicData.data) {
      return {
        success: false,
        error: basicData.error || "Error al obtener datos básicos",
      };
    }

    const { promise: promiseBasic, studio } = basicData.data;

    // 2. Obtener SOLO cotizaciones pendientes (sin paquetes, portafolios, etc.)
    const fetchPromiseStart = Date.now();
    const promise = await withRetry(
      () =>
        prisma.studio_promises.findFirst({
          where: {
            id: promiseId,
            studio_id: studio.id,
          },
          select: {
            id: true,
            duration_hours: true,
            quotes: {
              where: {
                visible_to_client: true,
                status: 'pendiente',
              },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                discount: true,
                status: true,
                selected_by_prospect: true,
                order: true,
                cotizacion_items: {
                  select: {
                    id: true,
                    item_id: true,
                    name_snapshot: true,
                    description_snapshot: true,
                    category_name_snapshot: true,
                    seccion_name_snapshot: true,
                    name: true,
                    description: true,
                    category_name: true,
                    seccion_name: true,
                    unit_price: true,
                    quantity: true,
                    subtotal: true,
                    status: true,
                    order: true,
                    is_courtesy: true,
                  },
                  orderBy: { order: 'asc' },
                },
                condiciones_comerciales_metodo_pago: {
                  where: { status: 'active' },
                  select: {
                    metodos_pago: {
                      select: {
                        payment_method_name: true,
                      },
                    },
                  },
                  orderBy: { orden: 'asc' },
                },
                condiciones_comerciales: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
                paquete: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        }),
      { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
    );

    if (!promise) {
      return {
        success: false,
        error: 'Promesa no encontrada',
      };
    }

    // Obtener duration_hours de la promise para cálculo dinámico
    const promiseDurationHours = promise.duration_hours ?? null;

    // 3. Obtener multimedia y catálogo solo de los items de las cotizaciones
    const itemIds = new Set<string>();
    promise.quotes.forEach((cot) => {
      cot.cotizacion_items.forEach((item) => {
        if (item.item_id) {
          itemIds.add(item.item_id);
        }
      });
    });

    const fetchMediaStart = Date.now();
    const [itemsMedia, catalogo] = await Promise.all([
      itemIds.size > 0
        ? prisma.studio_item_media.findMany({
            where: {
              item_id: { in: Array.from(itemIds) },
            },
            select: {
              id: true,
              item_id: true,
              file_url: true,
              file_type: true,
              display_order: true,
            },
            orderBy: { display_order: 'asc' },
          })
        : [],
      itemIds.size > 0
        ? obtenerItemsPorIds(studio.id, Array.from(itemIds))
        : Promise.resolve([]),
    ]);

    // 4. Mapear multimedia por item
    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();
    itemsMedia.forEach((media) => {
      if (media.item_id) {
        const existing = itemsMediaMap.get(media.item_id) || [];
        existing.push({
          id: media.id,
          file_url: media.file_url,
          file_type: media.file_type as 'IMAGE' | 'VIDEO',
          thumbnail_url: undefined,
        });
        itemsMediaMap.set(media.item_id, existing);
      }
    });

    // 5. Mapear cotizaciones a formato público (usando la misma lógica que getPublicPromisePendientes)
    const mapearStart = Date.now();
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
      is_courtesy: boolean;
    };

    const mappedCotizaciones: PublicCotizacion[] = promise.quotes.map((cot: any) => {
      const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

      (cot.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
        if (item.item_id) {
          const itemMedia = itemsMediaMap.get(item.item_id);
          if (itemMedia) {
            cotizacionMedia.push(...itemMedia);
          }
        }
      });

      const itemsFiltrados = (cot.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

      const estructura = construirEstructuraJerarquicaCotizacion(
        itemsFiltrados.map((item: CotizacionItem) => ({
          item_id: item.item_id!,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          order: item.order,
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          name: item.name,
          description: item.description,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          id: item.id,
          billing_type: item.billing_type,
        })),
        {
          incluirPrecios: true,
          incluirDescripciones: true,
          ordenarPor: 'insercion',
        }
      );

      const servicios: PublicSeccionData[] = estructura.secciones.map((seccion) => ({
        id: seccion.nombre,
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map((categoria) => ({
          id: categoria.nombre,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.items.map((item: any) => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find((i) => i.id === item.id);
            // Usar billing_type guardado en cotizacion_item (no del catálogo)
            const billingType = (originalItem?.billing_type || item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            // Calcular cantidad efectiva si es tipo HOUR y hay duration_hours
            const cantidadEfectiva = billingType === 'HOUR' && promiseDurationHours !== null
              ? calcularCantidadEfectiva(billingType, item.cantidad, promiseDurationHours)
              : item.cantidad;
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre,
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null,
              price: item.unit_price,
              quantity: cantidadEfectiva, // Usar cantidad efectiva para mostrar correctamente
              is_courtesy: originalItem?.is_courtesy || false,
              billing_type: billingType,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
        })),
      }));

      const condicionesComerciales = (cot as any)['condiciones_comerciales'];

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        status: cot.status,
        order: cot.order ?? 0,
        servicios: servicios,
        condiciones_comerciales: condicionesComerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: condicionesComerciales.description || null,
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
        items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
      };
    });
    console.log(`[${uniqueId}] getPublicPromiseUpdate:mapear: ${Date.now() - mapearStart}ms`);

    console.log(`[${uniqueId}] getPublicPromiseUpdate:total: ${Date.now() - startTime}ms`);

    return {
      success: true,
      data: {
        promise: {
          id: promiseBasic.id,
          contact_name: promiseBasic.contact_name,
          contact_phone: promiseBasic.contact_phone,
          contact_email: promiseBasic.contact_email,
          contact_address: promiseBasic.contact_address,
          event_type_id: promiseBasic.event_type_id,
          event_type_name: promiseBasic.event_type_name,
          event_name: promiseBasic.event_name,
          event_date: promiseBasic.event_date,
          event_location: promiseBasic.event_location,
        },
        cotizaciones: mappedCotizaciones,
      },
    };
  } catch (error) {
    console.error('[getPublicPromiseUpdate] Error:', error);
    return {
      success: false,
      error: 'Error al actualizar datos de promesa',
    };
  }
}

/**
 * ⚠️ STREAMING: Exportar para uso con Suspense
 * Helper compartido: Obtener datos básicos de promise + studio (sin cotizaciones pesadas)
 * Usado por todas las funciones fragmentadas
 */
/**
 * ⚠️ INTERNA: Función con cache de React para obtener Studio completo
 * Cachea por request para evitar queries duplicadas
 */
const getStudioBySlug = cache(async (studioSlug: string) => {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      studio_name: true,
      slogan: true,
      logo_url: true,
      representative_name: true,
      phone: true,
      email: true,
      address: true,
      promise_share_default_show_packages: true,
      promise_share_default_show_categories_subtotals: true,
      promise_share_default_show_items_prices: true,
      promise_share_default_min_days_to_hire: true,
      promise_share_default_show_standard_conditions: true,
      promise_share_default_show_offer_conditions: true,
      promise_share_default_portafolios: true,
      promise_share_default_auto_generate_contract: true,
    },
  });

  if (studio && !studio.id) {
    console.error('[getStudioBySlug] Studio retornado sin ID:', {
      studioSlug,
      studioKeys: Object.keys(studio),
      studioName: studio.studio_name,
    });
  }

  return studio;
});

export async function getPublicPromiseBasicData(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
      duration_hours: number | null;
      share_show_packages: boolean | null;
      share_show_categories_subtotals: boolean | null;
      share_show_items_prices: boolean | null;
      share_min_days_to_hire: number | null;
      share_show_standard_conditions: boolean | null;
      share_show_offer_conditions: boolean | null;
      share_auto_generate_contract: boolean | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
    };
  };
  error?: string;
}> {
  try {
    // ⚠️ TAREA 1: Cache de React para Studio (cachea por request)
    const studio = await getStudioBySlug(studioSlug);

    if (!studio) {
      console.error('[getPublicPromiseBasicData] Studio no encontrado:', {
        studioSlug,
      });
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    if (!studio.id || typeof studio.id !== 'string') {
      console.error('[getPublicPromiseBasicData] Studio sin ID válido:', {
        studioSlug,
        studio: {
          id: studio.id,
          studio_name: studio.studio_name,
          keys: Object.keys(studio),
        },
      });
      return {
        success: false,
        error: "Studio ID inválido",
      };
    }

    const fetchPromiseStart = Date.now();
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        name: true,
        event_type_id: true,
        event_date: true,
        event_location: true,
        duration_hours: true,
        share_show_packages: true,
        share_show_categories_subtotals: true,
        share_show_items_prices: true,
        share_min_days_to_hire: true,
        share_show_standard_conditions: true,
        share_show_offer_conditions: true,
        share_auto_generate_contract: true,
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
            cover_image_url: true,
            cover_video_url: true,
            cover_media_type: true,
            cover_design_variant: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    return {
      success: true,
      data: {
        promise: {
          id: promise.id,
          contact_name: promise.contact.name,
          contact_phone: promise.contact.phone,
          contact_email: promise.contact.email,
          contact_address: promise.contact.address,
          event_type_id: promise.event_type?.id || null,
          event_type_name: promise.event_type?.name || null,
          event_type_cover_image_url: promise.event_type?.cover_image_url || null,
          event_type_cover_video_url: promise.event_type?.cover_video_url || null,
          event_type_cover_media_type: promise.event_type?.cover_media_type as 'image' | 'video' | null || null,
          event_type_cover_design_variant: promise.event_type?.cover_design_variant as 'solid' | 'gradient' | null || null,
          event_type_cover_design_variant: promise.event_type?.cover_design_variant as 'solid' | 'gradient' | null || null,
          event_name: promise.name,
          event_date: promise.event_date,
          event_location: promise.event_location,
          duration_hours: promise.duration_hours ?? null,
          share_show_packages: promise.share_show_packages,
          share_show_categories_subtotals: promise.share_show_categories_subtotals,
          share_show_items_prices: promise.share_show_items_prices,
          share_min_days_to_hire: promise.share_min_days_to_hire,
          share_show_standard_conditions: promise.share_show_standard_conditions,
          share_show_offer_conditions: promise.share_show_offer_conditions,
          share_auto_generate_contract: promise.share_auto_generate_contract,
        },
        studio: {
          studio_name: studio.studio_name,
          slogan: studio.slogan,
          logo_url: studio.logo_url,
          id: studio.id,
          representative_name: studio.representative_name,
          phone: studio.phone,
          email: studio.email,
          address: studio.address,
          promise_share_default_show_packages: studio.promise_share_default_show_packages,
          promise_share_default_show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
          promise_share_default_show_items_prices: studio.promise_share_default_show_items_prices,
          promise_share_default_min_days_to_hire: studio.promise_share_default_min_days_to_hire,
          promise_share_default_show_standard_conditions: studio.promise_share_default_show_standard_conditions,
          promise_share_default_show_offer_conditions: studio.promise_share_default_show_offer_conditions,
          promise_share_default_portafolios: studio.promise_share_default_portafolios,
          promise_share_default_auto_generate_contract: studio.promise_share_default_auto_generate_contract,
        },
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseBasicData] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos básicos de promesa",
    };
  }
}

/**
 * Invalidar caché de route state público
 * Usado cuando se detecta cancelación de cierre desde el cliente para evitar bucles infinitos
 */
export async function invalidatePublicPromiseRouteState(
  studioSlug: string,
  promiseId: string
): Promise<{ success: boolean }> {
  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`, 'max');
    return { success: true };
  } catch (error) {
    console.error("[invalidatePublicPromiseRouteState] Error:", error);
    return { success: false };
  }
}

