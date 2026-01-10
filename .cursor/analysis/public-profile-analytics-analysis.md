# Análisis: Métricas del Perfil Público y Arquitectura de Analytics

**Fecha:** 10 Enero 2025  
**Rama:** `260110-studio-public-analitycs`  
**Contexto:** Análisis de implementación actual de métricas y propuesta de refactorización

---

## 📊 MÉTRICAS REQUERIDAS

### 1. **POSTS**

- ✅ **Impresiones** (`FEED_VIEW`) - Implementado
- ❌ **Clicks** - Parcialmente implementado (solo `MODAL_OPEN`, falta `MEDIA_CLICK`)
- ⚠️ **Compartidos** (`LINK_COPY`) - Implementado pero no se usa en PostRenderer

### 2. **PORTAFOLIOS**

- ⚠️ **Impresiones** - Usa `PAGE_VIEW` en lugar de `FEED_VIEW` (inconsistente)
- ✅ **Click (modal)** (`MODAL_OPEN`) - Implementado
- ✅ **Click en compartido** (`LINK_COPY`) - Implementado

### 3. **OFFER CARDS**

- ✅ **Impresiones** (`SIDEBAR_VIEW`) - Implementado
- ✅ **Clickado** (`OFFER_CLICK`) - Implementado

### 4. **LANDING OFFER**

- ✅ **Visitas únicas** - Implementado en `studio_offer_visits`
- ✅ **Visitas recurrentes** - Implementado (basado en `session_id`)
- ✅ **Origen del tráfico** - Implementado (`referrer`, `utm_*`)
- ⚠️ **Diferenciación profile vs externo** - Parcial (solo por `referrer`)

---

## 🔍 ESTADO ACTUAL DE IMPLEMENTACIÓN

### ✅ **LO QUE SÍ ESTÁ IMPLEMENTADO**

#### Sistema de Analytics Base

- **Tabla:** `studio_content_analytics` (Prisma schema líneas 3128-3154)
- **Tipos de contenido:** `POST`, `PORTFOLIO`, `OFFER`, `PACKAGE`
- **Eventos:** `FEED_VIEW`, `MODAL_OPEN`, `MODAL_CLOSE`, `LINK_COPY`, `SHARE_CLICK`, `MEDIA_CLICK`, `SIDEBAR_VIEW`, `OFFER_CLICK`, etc.
- **Tracking de contexto:** `ip_address`, `user_agent`, `session_id`, `referrer`, `utm_*`
- **Rate limiting:** 30 eventos/minuto por IP/usuario
- **Deduplicación:** 3 segundos
- **Queue system:** Batch writes para optimización

#### Posts

- **Impresiones:** `PostFeedCardWithTracking` → `FEED_VIEW` (Intersection Observer, ≥50% visible, ≥1s)
- **Clicks (modal):** `PostDetailModal` → `MODAL_OPEN` (pero NO usa tracking hook)
- **Compartidos:** `PostRenderer` tiene botón de compartir pero NO trackea `LINK_COPY`

#### Portfolios

- **Impresiones:** `PortfolioFeedCardWithTracking` → `FEED_VIEW` (Intersection Observer)
- **Click (modal):** `PortfolioDetailModal` → `MODAL_OPEN` ✅
- **Compartidos:** `PortfolioDetailModal` → `LINK_COPY` ✅

#### Offer Cards

- **Impresiones:** `OfferCardWithTracking` → `SIDEBAR_VIEW` ✅
- **Clicks:** `OfferCardWithTracking` → `OFFER_CLICK` ✅

#### Landing Offers

- **Visitas:** `OfferLandingPage` → `trackOfferVisit()` → `studio_offer_visits`
- **Origen:** Captura `referrer`, `utm_*`, `session_id`
- **Únicas vs recurrentes:** Basado en `session_id` en localStorage

---

## ❌ **LO QUE FALTA IMPLEMENTAR**

### 1. **Tracking de Perfil Público**

**Problema:** No se trackea cuando alguien visita el perfil público `/{slug}`

**Solución necesaria:**

- Crear evento `PROFILE_PAGE_VIEW` en `AnalyticsEventType`
- Agregar tracking en `ProfilePageClient` o `PublicProfilePage`
- Capturar `referrer` para diferenciar tráfico interno vs externo
- Usar `ContentType: 'PROFILE'` o crear nuevo tipo

### 2. **Clicks en Posts**

**Problema:**

- `PostDetailModal` NO usa `useContentAnalytics`
- No se trackea `MODAL_OPEN` cuando se abre el modal
- No se trackea `MEDIA_CLICK` cuando se hace click en media

**Solución necesaria:**

- Agregar `useContentAnalytics` a `PostDetailModal` o `PostRenderer`
- Trackear `MODAL_OPEN` cuando se abre modal
- Trackear `MEDIA_CLICK` cuando se hace click en imagen/video

### 3. **Compartidos en Posts**

**Problema:** `PostRenderer` tiene botón de compartir pero NO trackea `LINK_COPY`

**Solución necesaria:**

- Agregar `trackLinkCopy()` en `PostRenderer` cuando se copia link

### 4. **Impresiones de Portfolios**

**Problema:** Dashboard usa `PAGE_VIEW` pero debería usar `FEED_VIEW` (inconsistencia)

**Solución necesaria:**

- Corregir query en `getStudioAnalyticsSummary` línea 51

### 5. **Diferenciación Profile vs Externo en Landing Offers**

**Problema:** Solo se diferencia por `referrer`, pero si viene del mismo dominio no se detecta

**Solución necesaria:**

- Agregar `metadata.traffic_source: 'profile' | 'external'` en `trackOfferVisit`
- Detectar si `referrer` contiene `/{slug}` → `'profile'`
- Si no tiene referrer o es externo → `'external'`

---

## 🏗️ ARQUITECTURA ACTUAL

### Estructura de Archivos

```
src/
├── app/[slug]/
│   ├── page.tsx                    # PublicProfilePage (server)
│   └── profile/public/
│       ├── ProfilePageClient.tsx   # Client component principal
│       └── ProfileContentView.tsx # Switch de vistas
├── components/
│   ├── profile/
│   │   ├── sections/
│   │   │   ├── PostFeedCardWithTracking.tsx    # ✅ Tracking FEED_VIEW
│   │   │   ├── PostDetailModal.tsx              # ❌ NO tracking
│   │   │   ├── PortfolioFeedCardWithTracking.tsx # ✅ Tracking FEED_VIEW
│   │   │   └── PortfolioDetailModal.tsx         # ✅ Tracking MODAL_OPEN, LINK_COPY
│   │   └── cards/
│   │       ├── OfferCard.tsx                    # Tracking inline
│   │       └── OfferCardWithTracking.tsx       # ✅ Tracking SIDEBAR_VIEW, OFFER_CLICK
│   └── posts/
│       └── PostRenderer.tsx                     # ❌ NO tracking LINK_COPY
├── lib/
│   ├── actions/
│   │   └── studio/
│   │       ├── analytics/
│   │       │   ├── analytics.actions.ts         # trackContentEvent()
│   │       │   └── analytics-dashboard.actions.ts # getStudioAnalyticsSummary()
│   │       └── offers/
│   │           └── offer-visits.actions.ts      # trackOfferVisit()
│   └── analytics-queue.ts                        # Batch writes
└── hooks/
    └── useContentAnalytics.ts                    # Hook de tracking
```

### Flujo de Tracking Actual

```
Usuario visita /{slug}
  ↓
ProfilePageClient renderiza
  ❌ NO trackea visita al perfil
  ↓
PostFeedCardWithTracking renderiza
  ✅ Trackea FEED_VIEW (si ≥50% visible ≥1s)
  ↓
Usuario hace click en post
  ↓
PostDetailModal se abre
  ❌ NO trackea MODAL_OPEN
  ↓
PostRenderer muestra contenido
  ❌ NO trackea LINK_COPY cuando comparte
```

---

## 🔧 REFACTORIZACIÓN NECESARIA

### 1. **Agregar Tracking de Perfil Público**

**Archivo:** `src/app/[slug]/profile/public/ProfilePageClient.tsx`

```typescript
// Agregar useEffect para trackear visita inicial
useEffect(() => {
  if (!isOwner && studio?.id) {
    trackProfilePageView({
      studioId: studio.id,
      referrer: document.referrer,
      sessionId: getOrCreateSessionId(),
    });
  }
}, [studio?.id, isOwner]);
```

**Nuevo server action:** `src/lib/actions/studio/analytics/profile-analytics.actions.ts`

```typescript
export async function trackProfilePageView(data: {
  studioId: string;
  referrer?: string;
  sessionId: string;
}) {
  return trackContentEvent({
    studioId: data.studioId,
    contentType: "PROFILE", // Nuevo tipo o usar metadata
    contentId: data.studioId,
    eventType: "PAGE_VIEW",
    sessionId: data.sessionId,
    metadata: {
      traffic_source: data.referrer?.includes(`/${studioSlug}`)
        ? "profile"
        : "external",
    },
  });
}
```

### 2. **Agregar Tracking a PostDetailModal**

**Archivo:** `src/components/profile/sections/PostDetailModal.tsx`

```typescript
// Agregar useContentAnalytics
const analytics = useContentAnalytics({
  studioId: studio?.id || "",
  contentType: "POST",
  contentId: post?.id || "",
  ownerUserId: studio?.owner_id,
});

// Trackear cuando se abre modal
useEffect(() => {
  if (isOpen && post?.id && studio?.id) {
    analytics.trackModalOpen();
  }
}, [isOpen, post?.id, studio?.id, analytics]);
```

### 3. **Agregar Tracking de Compartidos en PostRenderer**

**Archivo:** `src/components/posts/PostRenderer.tsx`

```typescript
// Agregar props para tracking
interface PostRendererProps {
  // ... existing props
  studioId?: string;
  ownerUserId?: string;
}

// Agregar hook
const analytics = useContentAnalytics({
  studioId: studioId || "",
  contentType: "POST",
  contentId: post.id,
  ownerUserId,
});

// Modificar handleCopyLink
const handleCopyLink = () => {
  // ... existing code
  analytics.trackLinkCopy();
};
```

### 4. **Corregir Query de Portfolios en Dashboard**

**Archivo:** `src/lib/actions/studio/analytics/analytics-dashboard.actions.ts`

```typescript
// Línea 51: Cambiar PAGE_VIEW por FEED_VIEW
const portfolioViews =
  portfoliosStats.find((s) => s.event_type === "FEED_VIEW")?._count.id || 0;
```

### 5. **Mejorar Tracking de Origen en Landing Offers**

**Archivo:** `src/components/offers/OfferLandingPage.tsx`

```typescript
// Detectar origen del tráfico
const detectTrafficSource = (referrer?: string): "profile" | "external" => {
  if (!referrer) return "external";
  // Si viene del mismo dominio (perfil público)
  if (referrer.includes(window.location.origin)) {
    return "profile";
  }
  return "external";
};

// Agregar a metadata
await trackOfferVisit({
  offer_id: offerId,
  visit_type: "landing",
  referrer: document.referrer || undefined,
  traffic_source: detectTrafficSource(document.referrer),
  ...utmParams,
  session_id: sessionId,
});
```

### 6. **Actualizar Schema si es Necesario**

**Archivo:** `prisma/schema.prisma`

```prisma
// Verificar si necesitamos agregar 'PROFILE' a ContentType
enum ContentType {
  POST
  PORTFOLIO
  OFFER
  PACKAGE
  // PROFILE? O usar metadata para diferenciar
}
```

---

## 📈 MÉTRICAS DEL DASHBOARD

### Estado Actual (`analytics-dashboard.actions.ts`)

```typescript
// Posts
totalViews: FEED_VIEW ✅
totalClicks: MODAL_OPEN ✅ (pero no se trackea)
totalShares: LINK_COPY ✅ (pero no se trackea)

// Portfolios
totalViews: PAGE_VIEW ❌ (debería ser FEED_VIEW)

// Offers
totalViews: SIDEBAR_VIEW ✅
totalClicks: OFFER_CLICK ✅
```

### Métricas Faltantes

1. **Visitas al perfil público** (nuevo)
2. **Origen del tráfico** (profile vs external)
3. **Visitas únicas vs recurrentes** del perfil
4. **Clicks en media de posts** (`MEDIA_CLICK`)

---

## 🎯 PLAN DE REFACTORIZACIÓN

### Fase 1: Tracking Básico Faltante

1. ✅ Agregar tracking de perfil público
2. ✅ Agregar tracking a `PostDetailModal`
3. ✅ Agregar tracking de compartidos en `PostRenderer`
4. ✅ Corregir query de portfolios en dashboard

### Fase 2: Mejoras de Origen

1. ✅ Mejorar detección de origen en landing offers
2. ✅ Agregar métricas de tráfico por origen en dashboard

### Fase 3: Optimizaciones

1. ⚠️ Revisar si necesitamos `ContentType: 'PROFILE'` o usar metadata
2. ⚠️ Optimizar queries del dashboard (agregaciones SQL)
3. ⚠️ Agregar índices si es necesario

---

## ⚠️ CONSIDERACIONES DE ARQUITECTURA

### Escalabilidad para N Studios

**Estado actual:** ✅ Bien diseñado

- Tabla `studio_content_analytics` tiene índice en `studio_id`
- Queries filtran por `studio_id`
- Rate limiting por IP/usuario (no por studio)

**Posibles mejoras:**

- Agregar particionamiento por `studio_id` si crece mucho
- Considerar archivar datos antiguos (>1 año)
- Agregar materialized views para métricas agregadas

### Eficiencia de Queries

**Problema potencial:** `getStudioAnalyticsSummary` hace múltiples `groupBy`

**Solución:** Usar una sola query con agregaciones múltiples:

```typescript
const stats = await prisma.studio_content_analytics.groupBy({
  by: ["content_type", "event_type"],
  where: { studio_id: studioId },
  _count: { id: true },
});
// Luego procesar en memoria
```

---

## 📝 RESUMEN EJECUTIVO

### ✅ Implementado Correctamente

- Sistema base de analytics
- Tracking de impresiones (FEED_VIEW)
- Tracking de ofertas (sidebar y clicks)
- Tracking de landing offers con origen

### ❌ Falta Implementar

- Tracking de visita al perfil público
- Tracking de MODAL_OPEN en posts
- Tracking de LINK_COPY en posts
- Corrección de query de portfolios

### ⚠️ Mejoras Necesarias

- Mejor detección de origen (profile vs external)
- Optimización de queries del dashboard
- Consistencia en tipos de eventos

---

**Próximos pasos:** Implementar Fase 1 de refactorización.
