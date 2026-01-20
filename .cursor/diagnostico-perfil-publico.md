# Diagnóstico de Arquitectura: Perfil Público (`/[slug]`)

## 📊 Resumen Ejecutivo

**Ruta analizada:** `src/app/[slug]/page.tsx`  
**Fecha:** 2025-01-28  
**Estado:** ⚠️ Requiere optimización antes de aplicar Metodología ZEN

---

## 1. Estrategia de Carga: Server vs Client

### ✅ **Arquitectura Actual**

**Server Component (page.tsx):**
- ✅ Carga completa de datos en servidor antes de renderizar
- ✅ Dos Server Actions secuenciales:
  1. `getStudioProfileBySlug({ slug })` - Query principal
  2. `getPublicActiveOffers(slug)` - Query secundaria
- ✅ Datos pasados como props a Client Component

**Client Component (ProfilePageClient.tsx):**
- ✅ Recibe todos los datos como props (no hace fetching)
- ✅ Maneja estado local (tabs, modals, scroll)
- ✅ Tracking de analytics en `useEffect`

### ⚠️ **Problemas Identificados**

1. **Bloqueo Total:** La página no renderiza hasta que TODOS los datos estén listos
2. **Queries Secuenciales:** `getPublicActiveOffers` espera a que termine `getStudioProfileBySlug`
3. **Sin Streaming:** No hay `loading.tsx` ni `Suspense` boundaries
4. **Metadata Duplicada:** `generateMetadata` ejecuta `getStudioProfileBySlug` de nuevo (duplica query)

---

## 2. Complejidad de Queries

### 🔴 **Query Principal: `getStudioProfileBySlug`**

**Ubicación:** `src/lib/actions/public/profile.actions.ts:23`

**Estructura:**
```typescript
// Query 1: Verificar ownership (línea 44-55)
studios.findUnique({ where: { slug }, select: { id, user_profiles } })

// Query 2: Query masiva con joins profundos (línea 68-277)
studios.findUnique({
  select: {
    // Studio básico
    id, studio_name, presentation, keywords, logo_url, slogan, website, address, email, maps_url, plan_id,
    
    // Relaciones anidadas (JOINS profundos):
    user_profiles: { where: { is_active }, select: { supabase_id } },
    social_networks: { include: { platform } }, // JOIN con platform
    phones: { where: { is_active } },
    business_hours: { orderBy: { order } },
    items: { 
      where: { status: 'active' },
      include: { service_categories } // JOIN con service_categories
    },
    portfolios: {
      where: { is_published },
      include: {
        event_type: { select: { id, name } }, // JOIN con event_type
        items: { orderBy: { order } }, // JOIN con portfolio_items
        media: { orderBy: { display_order } }, // JOIN con portfolio_media
        content_blocks: {
          include: {
            block_media: {
              include: { media } // JOIN anidado: content_blocks → block_media → media
            }
          }
        }
      }
    },
    plan: { select: { name, slug } }, // JOIN con plans
    zonas_trabajo: { orderBy: { orden } },
    posts: {
      where: { is_published },
      include: {
        media: { orderBy: { display_order } } // JOIN con post_media
      },
      take: 50
    },
    faq: { where: { is_active } }
  }
})

// Query 3: Paquetes separada (línea 423-445)
studio_paquetes.findMany({
  where: { studio_id, status: "active" },
  include: { event_types } // JOIN con event_types
})
```

**Problemas Críticos:**

1. **JOIN Profundo en 4 Niveles:**
   - `portfolios` → `content_blocks` → `block_media` → `media`
   - Cada portfolio puede tener múltiples content_blocks
   - Cada content_block puede tener múltiples block_media
   - Multiplicación exponencial de datos transferidos

2. **Query Masiva Única:**
   - Todo en una sola query = alto tiempo de ejecución
   - Si falla una relación, falla todo
   - No hay paginación en posts (toma 50, pero sin límite real)

3. **Query Separada de Paquetes:**
   - Se ejecuta después de la query principal
   - Podría incluirse en el JOIN principal

4. **Sin Índices Optimizados:**
   - No se verifica si existen índices en:
     - `studios.slug` + `is_active`
     - `posts.is_published` + `created_at`
     - `portfolios.is_published` + `order`
     - `studio_paquetes.studio_id` + `status`

### 🟡 **Query Secundaria: `getPublicActiveOffers`**

**Ubicación:** `src/lib/actions/studio/offers/offers.actions.ts:1434`

**Estructura:**
```typescript
// Query 1: Buscar studio (línea 1437-1440)
studios.findUnique({ where: { slug }, select: { id } })

// Query 2: Ofertas activas (línea 1448-1489)
studio_offers.findMany({
  where: {
    studio_id,
    is_active: true,
    OR: [/* condiciones de fecha */]
  },
  include: {
    business_term: { select: { discount_percentage, description } },
    leadform: { select: { event_type_id } }
  }
})

// Query 3: Event types (línea 1499-1503) - Solo si hay event_type_ids
studio_event_types.findMany({ where: { id: { in: eventTypeIds } } })
```

**Problemas:**

1. **Query Redundante:** Busca el studio de nuevo (ya se hizo en `getStudioProfileBySlug`)
2. **Query Condicional:** La query de event_types solo se ejecuta si hay IDs
3. **Potencial N+1:** Si hay muchas ofertas, podría optimizarse con un JOIN

### 📊 **Métricas Estimadas**

- **Queries Totales:** 6-7 queries por carga
- **JOINs Máximos:** 4 niveles de profundidad
- **Datos Transferidos:** ~500KB - 2MB (depende de cantidad de posts/portfolios)
- **Tiempo Estimado:** 800ms - 3000ms (sin índices optimizados)

---

## 3. Estado de Streaming

### ❌ **Sin Streaming Implementado**

**Problemas:**

1. **No existe `loading.tsx`:**
   - No hay skeleton mientras carga
   - Usuario ve pantalla en blanco hasta que todo esté listo

2. **No hay Suspense Boundaries:**
   - Todo se carga de forma bloqueante
   - No se puede mostrar contenido parcial

3. **No hay Deferred Data:**
   - A diferencia de `/pendientes` que usa `PendientesPageBasic` + `PendientesPageDeferred`
   - No hay separación entre datos críticos y secundarios

**Comparación con Ruta Optimizada:**

```typescript
// ✅ PendientesPage (optimizado)
const basicData = await getPublicPromiseBasicData(...); // Instantáneo
const deferredDataPromise = getPublicPromisePendientes(...); // Deferred
return (
  <PendientesPageBasic {...basicData} />
  <Suspense fallback={<Skeleton />}>
    <PendientesPageDeferred dataPromise={deferredDataPromise} />
  </Suspense>
);

// ❌ PublicProfilePage (actual)
const result = await getStudioProfileBySlug(...); // Bloquea todo
const offers = await getPublicActiveOffers(...); // Bloquea más
return <ProfilePageClient {...} />; // Renderiza solo cuando todo está listo
```

---

## 4. Interactividad: Client Components

### ✅ **Componentes Cliente Identificados**

**ProfilePageClient.tsx:**
- ✅ Maneja estado local (tabs, modals, scroll)
- ✅ Sincroniza URL con query params
- ✅ Tracking de analytics
- ✅ Keyboard shortcuts (Cmd+K)

**ProfileContentView.tsx:**
- ✅ Switch entre vistas según tab activo
- ✅ No hace fetching, solo renderiza

### ⚠️ **Problemas de Re-renders**

1. **useMemo en publishedPosts (línea 257-269):**
   - ✅ Correcto: Memoiza filtrado y ordenamiento
   - ⚠️ Dependencia: `[posts]` - Si posts cambia, recalcula

2. **Múltiples useEffect:**
   - Línea 76-113: Tracking (solo una vez)
   - Línea 116-123: Scroll listener
   - Línea 126-136: Keyboard shortcut
   - Línea 139-159: Sync query params
   - Línea 162-171: Create post param
   - ⚠️ Riesgo: Si `searchParams` cambia frecuentemente, múltiples re-renders

3. **No hay React.memo:**
   - `ProfileContentView` se re-renderiza en cada cambio de `activeTab`
   - Componentes hijos podrían beneficiarse de memoización

4. **Router.push con scroll: false:**
   - ✅ Correcto: Evita scroll no deseado
   - ⚠️ Pero causa re-render completo del componente

---

## 5. Metadata: SEO

### ✅ **Implementación Actual**

**Ubicación:** `src/app/[slug]/page.tsx:73-136`

**Estructura:**
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  
  // ⚠️ PROBLEMA: Ejecuta getStudioProfileBySlug de nuevo
  const result = await getStudioProfileBySlug({ slug });
  
  return {
    title: `${studio.studio_name}${studio.slogan ? ` - ${studio.slogan}` : ''}`,
    description: studio.presentation || `Perfil profesional de ${studio.studio_name}`,
    keywords: studio.keywords,
    icons: studio.logo_url ? { /* favicon dinámico */ } : undefined,
    openGraph: { title, description, images: [studio.logo_url] },
    twitter: { card: 'summary_large_image', title, description, images: [studio.logo_url] }
  };
}
```

### 🔴 **Problemas Críticos**

1. **Query Duplicada:**
   - `generateMetadata` ejecuta `getStudioProfileBySlug` completo
   - La misma query se ejecuta 2 veces por request:
     - Una vez en `generateMetadata`
     - Otra vez en el componente principal
   - **Impacto:** Doble tiempo de carga, doble carga en DB

2. **Sin Caché:**
   - No hay `revalidate` configurado
   - Cada request ejecuta las queries
   - Metadata podría cachearse más agresivamente

3. **Favicon Dinámico:**
   - ✅ Feature interesante
   - ⚠️ Requiere query completa solo para obtener `logo_url`

---

## 📋 Resumen de Cuellos de Botella

### 🔴 **Críticos (Prioridad 1)**

1. **Query Duplicada en Metadata**
   - Impacto: 2x queries por request
   - Fix: Cachear resultado o compartir entre metadata y page

2. **JOIN Profundo en 4 Niveles**
   - Impacto: Datos masivos, tiempo alto
   - Fix: Separar en queries paralelas o usar deferred data

3. **Sin Streaming**
   - Impacto: Tiempo de bloqueo total
   - Fix: Implementar `loading.tsx` + Suspense boundaries

4. **Queries Secuenciales**
   - Impacto: Tiempo acumulado
   - Fix: Paralelizar `getStudioProfileBySlug` y `getPublicActiveOffers`

### 🟡 **Importantes (Prioridad 2)**

5. **Query Separada de Paquetes**
   - Impacto: Query adicional innecesaria
   - Fix: Incluir en query principal o hacer deferred

6. **Sin Índices Verificados**
   - Impacto: Queries lentas sin índices
   - Fix: Verificar y crear índices en campos críticos

7. **Re-renders en ProfileContentView**
   - Impacto: Re-render innecesario en cambio de tab
   - Fix: React.memo o optimizar dependencias

### 🟢 **Mejoras (Prioridad 3)**

8. **Tracking en useEffect**
   - Impacto: Mínimo, pero podría optimizarse
   - Fix: Mover a Server Action o edge function

9. **Paginación en Posts**
   - Impacto: Carga todos los posts (take: 50 sin límite real)
   - Fix: Implementar paginación real o virtual scrolling

---

## 🎯 Recomendaciones para Metodología ZEN

### **Fase 1: Streaming Básico**
1. Crear `loading.tsx` con skeleton
2. Separar datos críticos (studio básico) de secundarios (posts, portfolios)
3. Implementar Suspense boundaries

### **Fase 2: Optimización de Queries**
1. Eliminar query duplicada en metadata (cache compartido)
2. Paralelizar `getStudioProfileBySlug` y `getPublicActiveOffers`
3. Separar query de paquetes o hacerla deferred

### **Fase 3: Query Profunda**
1. Dividir JOIN de 4 niveles en queries separadas
2. Implementar deferred data para portfolios con content_blocks
3. Verificar y crear índices necesarios

### **Fase 4: Optimización Cliente**
1. Memoizar componentes pesados
2. Optimizar re-renders en cambio de tabs
3. Implementar virtual scrolling para posts

---

## 📊 Métricas Objetivo Post-Optimización

| Métrica | Actual | Objetivo | Mejora |
|---------|--------|----------|--------|
| Tiempo de carga inicial | 800-3000ms | <500ms | 60-83% |
| Queries por request | 6-7 | 3-4 | 43-50% |
| Tiempo de bloqueo | 100% | <30% | 70% |
| Datos transferidos | 500KB-2MB | <300KB | 40-85% |
| Re-renders innecesarios | ~5-10 | <2 | 80% |

---

**Próximos Pasos:** Aplicar Metodología ZEN siguiendo el orden de fases recomendado.
