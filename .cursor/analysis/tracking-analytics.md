# Análisis: Sistema de Tracking y Analytics

**Fecha:** 29 Diciembre 2025  
**Última actualización:** 17 Enero 2025  
**Versión:** 3.0  
**Contexto:** Documentación completa del sistema de tracking y analytics de ZEN Platform, incluyendo contenido, ofertas, promesas y conversiones

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Sistema de Analytics General](#sistema-de-analytics-general)
3. [Tracking de Ofertas](#tracking-de-ofertas)
4. [Tracking de Contenido](#tracking-de-contenido)
5. [Tracking de Promesas y Paquetes](#tracking-de-promesas-y-paquetes)
6. [Dashboards Disponibles](#dashboards-disponibles)
7. [Propagación de UTMs](#propagación-de-utms)
8. [Métricas y Reportes](#métricas-y-reportes)

---

## 🎯 VISIÓN GENERAL

ZEN Platform cuenta con un sistema completo de tracking y analytics que permite a los estudios medir:

- **Interacción con contenido:** Posts, portfolios, ofertas
- **Conversiones:** Leads, promesas, eventos
- **Origen de tráfico:** UTMs, referrers, fuentes
- **Performance:** Clicks, impresiones, tasas de conversión

### Arquitectura

El sistema utiliza **dos tablas principales**:

1. **`studio_content_analytics`**: Tracking general de contenido (posts, portfolios, ofertas, paquetes)
2. **`studio_offer_visits`** y **`studio_offer_submissions`**: Tracking específico de ofertas comerciales

---

## 📊 SISTEMA DE ANALYTICS GENERAL

### Tabla: `studio_content_analytics`

**Schema:** `prisma/schema.prisma` (líneas 3128-3154)

```prisma
model studio_content_analytics {
  id           String            @id @default(cuid())
  studio_id   String
  content_type ContentType       // POST, PORTFOLIO, OFFER, PACKAGE, PROMISE
  content_id   String
  event_type   AnalyticsEventType
  
  // Tracking de usuario
  user_id      String?
  ip_address   String?
  user_agent   String?
  session_id   String?
  
  // Tracking de origen
  referrer     String?
  utm_source   String?
  utm_medium   String?
  utm_campaign String?
  utm_term     String?
  utm_content  String?
  
  // Metadata adicional
  metadata     Json?
  created_at   DateTime          @default(now())
}
```

### Tipos de Contenido (`ContentType`)

- **`POST`**: Publicaciones en el feed
- **`PORTFOLIO`**: Portafolios de trabajo
- **`OFFER`**: Ofertas comerciales (cards en sidebar)
- **`PACKAGE`**: Paquetes de servicios
- **`PROMISE`**: Promesas/cotizaciones públicas

### Tipos de Eventos (`AnalyticsEventType`)

#### Eventos de Visualización
- **`PAGE_VIEW`**: Vista de página completa
- **`FEED_VIEW`**: Contenido visible en feed (≥50% visible, ≥1s)
- **`SIDEBAR_VIEW`**: Oferta visible en sidebar

#### Eventos de Interacción
- **`MODAL_OPEN`**: Apertura de modal/detalle
- **`MODAL_CLOSE`**: Cierre de modal
- **`MEDIA_CLICK`**: Click en media (imagen/video)
- **`MEDIA_VIEW`**: Visualización de media
- **`OFFER_CLICK`**: Click en oferta
- **`PAQUETE_CLICK`**: Click en paquete
- **`COTIZACION_CLICK`**: Click en cotización

#### Eventos de Navegación
- **`NEXT_CONTENT`**: Siguiente contenido
- **`PREV_CONTENT`**: Contenido anterior
- **`CAROUSEL_NEXT`**: Siguiente en carousel
- **`CAROUSEL_PREV`**: Anterior en carousel

#### Eventos de Compartir
- **`LINK_COPY`**: Copia de enlace
- **`SHARE_CLICK`**: Click en botón compartir

#### Eventos de Conversión
- **`CTA_CLICK`**: Click en call-to-action
- **`WHATSAPP_CLICK`**: Click en WhatsApp
- **`FORM_VIEW`**: Vista de formulario
- **`FORM_SUBMIT`**: Envío de formulario

#### Eventos de Engagement
- **`SCROLL_50`**: Scroll al 50%
- **`SCROLL_100`**: Scroll completo
- **`TIME_30S`**: 30 segundos en página
- **`TIME_60S`**: 60 segundos en página

### Características del Sistema

#### Rate Limiting
- **30 eventos/minuto** por IP/usuario
- Previene spam y sobrecarga

#### Deduplicación
- **3 segundos** de ventana
- Evita conteos duplicados del mismo evento

#### Queue System
- Batch writes para optimización
- Reduce carga en base de datos

#### Exclusión de Owner
- Los clicks del dueño del studio se excluyen automáticamente
- Variable de entorno: `ANALYTICS_INCLUDE_OWNER` (desarrollo)

---

## 🎯 TRACKING DE OFERTAS

### Tablas Específicas

#### 1. `studio_offer_visits`

**Schema:** `prisma/schema.prisma` (líneas 2974-2994)

```prisma
model studio_offer_visits {
  id           String   @id @default(cuid())
  offer_id     String
  visit_type   String   // 'landing' | 'leadform'
  
  // Tracking de origen
  referrer     String?
  utm_source   String?
  utm_medium   String?
  utm_campaign String?
  utm_term     String?
  utm_content  String?
  session_id   String?
  
  // Metadata
  ip_address   String?
  user_agent   String?
  created_at   DateTime @default(now())
}
```

**Tipos de visita:**
- **`landing`**: Usuario llegó a la landing page de la oferta
- **`leadform`**: Usuario vio el formulario de contacto

#### 2. `studio_offer_submissions`

**Schema:** `prisma/schema.prisma` (líneas 2996-3016)

```prisma
model studio_offer_submissions {
  id               String   @id @default(cuid())
  offer_id         String
  contact_id       String?
  visit_id         String?  // Relación con visit
  
  // Tracking UTM
  utm_source       String?
  utm_medium       String?
  utm_campaign     String?
  
  // Datos del formulario
  form_data        Json
  conversion_value Decimal?
  
  // Metadata
  ip_address       String?
  user_agent       String?
  created_at       DateTime @default(now())
}
```

### Flujo de Tracking

#### A) Visita Landing Page

**Archivo:** `src/components/offers/OfferLandingPage.tsx`

```typescript
// Captura UTMs de URL
const urlParams = new URLSearchParams(window.location.search);
const utmParams = {
  utm_source: urlParams.get("utm_source") || undefined,
  utm_medium: urlParams.get("utm_medium") || undefined,
  utm_campaign: urlParams.get("utm_campaign") || undefined,
  // ...
};

// Genera session_id único
let sessionId = localStorage.getItem(`offer_session_${offerId}`);
if (!sessionId) {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(`offer_session_${offerId}`, sessionId);
}

// Trackea visita
await trackOfferVisit({
  offer_id: offerId,
  visit_type: "landing",
  referrer: document.referrer || undefined,
  ...utmParams,
  session_id: sessionId,
});
```

#### B) Submit de Leadform

**Archivo:** `src/components/offers/OfferLeadForm.tsx`

```typescript
// Obtiene UTMs de URL y session_id
const urlParams = new URLSearchParams(window.location.search);
const sessionId = localStorage.getItem(`offer_session_${offerId}`);

// Envía submission con UTMs
const result = await submitOfferLeadform(studioSlug, {
  offer_id: offerId,
  // ... datos del formulario
  utm_source: urlParams.get("utm_source") || undefined,
  utm_medium: urlParams.get("utm_medium") || undefined,
  utm_campaign: urlParams.get("utm_campaign") || undefined,
  session_id: sessionId || undefined,
});
```

### Métricas Disponibles

En el dashboard de conversión (`/analytics/marketing`):

- **Visitas Landing**: Total de usuarios que vieron la oferta
- **Visitas Leadform**: Total de usuarios que vieron el formulario
- **Conversiones**: Total de formularios completados
- **Tasa de Conversión**: Submissions / Visitas Leadform
- **Click Through Rate**: Leadform / Landing
- **Valor Total**: Suma de `conversion_value`

---

## 📱 TRACKING DE CONTENIDO

### Posts

#### Impresiones (`FEED_VIEW`)

**Componente:** `PostFeedCardWithTracking`

- Usa `IntersectionObserver`
- Requisitos: ≥50% visible, ≥1s
- Tracking automático al hacer scroll

#### Clicks (`MODAL_OPEN`, `MEDIA_CLICK`)

**Componente:** `PostDetailModal`

- `MODAL_OPEN`: Cuando se abre el modal
- `MEDIA_CLICK`: Cuando se hace click en media dentro del modal

#### Compartidos (`LINK_COPY`)

**Componente:** `PostRenderer`

- Al copiar enlace del post
- Guarda en `studio_content_analytics`

### Portfolios

#### Impresiones (`FEED_VIEW`)

**Componente:** `PortfolioFeedCardWithTracking`

- Similar a posts con `IntersectionObserver`

#### Clicks (`MODAL_OPEN`)

**Componente:** `PortfolioDetailModal`

- Tracking al abrir modal de detalle

#### Compartidos (`LINK_COPY`)

**Componente:** `PortfolioDetailModal`

- Tracking al copiar enlace

### Ofertas (Cards en Sidebar)

#### Impresiones (`SIDEBAR_VIEW`)

**Componente:** `OfferCardWithTracking`

- Cuando la oferta es visible en el sidebar del perfil público

#### Clicks (`OFFER_CLICK`)

**Componente:** `OfferCardWithTracking`

- Al hacer click en el card de oferta

### Perfil Público

#### Visitas (`PAGE_VIEW`)

**Componente:** `ProfilePageClient`

- Tracking de visita al perfil público
- Captura `referrer` para diferenciar tráfico interno vs externo
- Usa `metadata.traffic_source`: 'profile' | 'external'

---

## 📦 TRACKING DE PROMESAS Y PAQUETES

### Promesas

Las promesas públicas tienen tracking específico:

**Archivo:** `src/lib/actions/studio/commercial/promises/promise-analytics.actions.ts`

#### Eventos Disponibles

- **`PAGE_VIEW`**: Visita a la página pública de promesa
- **`PAQUETE_CLICK`**: Click en un paquete dentro de la promesa
- **`COTIZACION_CLICK`**: Click en una cotización

#### Tracking de Clicks en Paquetes

**Componente:** `PaquetesSection.tsx`

```typescript
const handlePaqueteClick = (paquete: PublicPaquete) => {
  // Trackea click
  trackPaqueteClick(
    studioId,
    promiseId,
    paquete.id,
    paquete.name,
    sessionId
  );
};
```

**Nota importante:** Los clicks en paquetes se guardan con:
- `content_type: 'PROMISE'` (no 'PACKAGE')
- `event_type: 'PAQUETE_CLICK'`
- `paquete_id` en `metadata.paquete_id`

### Paquetes

Los paquetes se trackean cuando:
- Se hace click desde una promesa pública
- Se visualizan en el catálogo (si aplica)

---

## 📊 DASHBOARDS DISPONIBLES

### 1. Analytics - Perfil de Negocio

**Ruta:** `/studio/{slug}/analytics/perfil`

**Métricas:**
- Visitas al perfil público (únicas, recurrentes)
- Dispositivos (mobile vs desktop)
- Origen del tráfico (interno, externo, directo)
- Top referrers y UTMs
- Contenido más popular (posts, portfolios)
- Clicks y shares por contenido

**Componentes:**
- `AnalyticsOverviewCards`: Métricas generales
- `TopContentList`: Contenido más visto
- `TrafficSourceStats`: Origen del tráfico

### 2. Analytics - Conversiones

**Ruta:** `/studio/{slug}/analytics/marketing`

**Métricas:**
- Total de conversiones
- Tasa de conversión
- Click Through Rate
- Valor total de conversiones
- Funnel de conversión (Landing → Leadform → Conversión)
- Promesas pendientes
- Eventos convertidos (con filtro de fecha)
- Top paquetes más vistos

**Componentes:**
- `ConversionMetrics`: Métricas principales
- `ConversionMetricsClient`: Cliente con filtro de fecha

**Filtros:**
- Por mes (por defecto: mes actual)
- Por rango de fechas personalizable
- Calendario interactivo

### 3. Dashboard Comercial (Legacy)

**Ruta:** `/studio/{slug}/commercial/dashboard`

**Nota:** Este dashboard fue refactorizado y las métricas principales se movieron a `/analytics`

---

## 🔗 PROPAGACIÓN DE UTMs

### Problema Identificado

Cuando un usuario llega desde una campaña externa al perfil público y luego navega a una oferta, **los UTMs se pierden** porque los links internos no los propagan.

### Casos de Uso

#### ✅ Caso 1: Campaña Directa a Oferta
```
URL: /{slug}/offer/boda?utm_source=facebook&utm_campaign=boda2025
✅ UTMs capturados y guardados
```

#### ❌ Caso 2: Campaña → Perfil → Oferta
```
1. URL: /{slug}?utm_source=facebook&utm_campaign=brand
2. Click en banner → /{slug}/offer/boda
❌ UTMs se pierden
```

#### ❌ Caso 3: Orgánico → Perfil → Oferta
```
1. URL: /{slug} (sin UTMs)
2. Click en banner → /{slug}/offer/boda
❌ No hay diferenciación de origen
```

### Solución Propuesta: Opción 2 (Recomendada)

**Propagación de UTMs + Fallback**

#### Hook Personalizado: `useUTMPropagation`

```typescript
// src/hooks/useUTMPropagation.ts
export function useUTMPropagation() {
  const searchParams = useSearchParams();
  
  // Capturar UTMs de URL actual
  const currentUTMs = {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    // ...
  };
  
  // Guardar en sessionStorage para persistencia
  useEffect(() => {
    if (currentUTMs.utm_source) {
      sessionStorage.setItem('original_utms', JSON.stringify(currentUTMs));
    }
  }, [currentUTMs]);
  
  // Función para construir URL con UTMs
  const buildURLWithUTMs = (baseUrl: string, fallback: {
    source: string;
    medium: string;
    campaign: string;
  }) => {
    // Intentar recuperar UTMs originales
    const storedUTMs = sessionStorage.getItem('original_utms');
    const utms = storedUTMs 
      ? JSON.parse(storedUTMs)
      : {
          utm_source: fallback.source,
          utm_medium: fallback.medium,
          utm_campaign: fallback.campaign,
        };
    
    const params = new URLSearchParams();
    Object.entries(utms).forEach(([key, value]) => {
      if (value) params.set(key, value as string);
    });
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  return { buildURLWithUTMs, currentUTMs };
}
```

#### Uso en Componentes

**OfferCard.tsx:**
```typescript
export function OfferCard({ offer, studioSlug, ... }) {
  const { buildURLWithUTMs } = useUTMPropagation();
  
  const offerUrl = buildURLWithUTMs(
    `/${studioSlug}/offer/${offer.slug}`,
    {
      source: 'profile',
      medium: 'banner',
      campaign: 'organic'
    }
  );
  
  return (
    <a href={offerUrl} onClick={handleClick}>
      {/* ... */}
    </a>
  );
}
```

### Ventajas

- ✅ Propaga UTMs de campaña original
- ✅ Fallback a UTMs de perfil si no hay originales
- ✅ Atribución completa del journey
- ✅ Mide campañas multi-touch
- ✅ No requiere cambios en DB

### Estado

**Pendiente de implementación** - Ver sección "Próximos Pasos"

---

## 📈 MÉTRICAS Y REPORTES

### Métricas Disponibles Actualmente

#### Dashboard de Conversión

1. **¿Cuántas conversiones tengo en un período?**
   - Total de submissions con filtro de fecha
   - Valor total de conversiones

2. **¿Cuál es mi tasa de conversión?**
   - Submissions / Visitas Leadform
   - Click Through Rate (Leadform / Landing)

3. **¿Cuántos usuarios vieron mis ofertas?**
   - Visitas Landing (primer contacto)
   - Visitas Leadform (interés confirmado)

4. **¿Qué paquetes generan más interés?**
   - Top paquetes por clicks
   - Con categoría y visualización

5. **¿Cuántas promesas y eventos tengo?**
   - Promesas pendientes (requieren atención)
   - Eventos convertidos en el período

### Métricas Futuras (con propagación de UTMs)

1. **¿Cuántos leads vienen de cada canal?**
   - Facebook Ads vs Google Ads vs Orgánico vs Perfil
   - Desglose por `utm_source`

2. **¿Qué campaña genera más conversiones?**
   - Por `utm_campaign`
   - Comparación de performance

3. **¿Qué medio funciona mejor?**
   - CPC vs Orgánico vs Email vs Banner
   - Por `utm_medium`

4. **¿Cuál es el journey más común?**
   - Campaña → Perfil → Oferta vs Directo a Oferta
   - Análisis de navegación

5. **ROI por canal**
   - Inversión en ads vs leads generados
   - Costo por conversión

---

## 🚀 PRÓXIMOS PASOS

### ✅ Completado (Enero 2025)

- [x] Dashboard de analytics de conversión (`/analytics/marketing`)
- [x] Métricas de ofertas integradas (visitas, submissions, conversiones)
- [x] Filtros de fecha implementados (mes/rango personalizable)
- [x] Visualización de funnel de conversión
- [x] Métricas de promesas y eventos convertidos
- [x] Top paquetes más vistos con clicks
- [x] Dashboard de perfil público (`/analytics/perfil`)
- [x] Tracking de clicks en paquetes desde promesas
- [x] Exclusión automática de owner en analytics
- [x] Tracking de visita al perfil público (`PAGE_VIEW` con `metadata.traffic_source`)
- [x] Tracking de `MODAL_OPEN` en posts
- [x] Tracking de `MEDIA_CLICK` en posts
- [x] Tracking de `LINK_COPY` en posts y portfolios
- [x] Corrección de queries de portfolios (usar `FEED_VIEW`)

### 🔄 Pendiente

1. **Propagación de UTMs**
   - [ ] Crear hook `useUTMPropagation`
   - [ ] Integrar en `OfferCard.tsx`
   - [ ] Integrar en `MobilePromotionsSection.tsx`
   - [ ] Testing exhaustivo de flujos

2. **Mejoras en Reportes**
   - [ ] Desglose por UTM source/medium/campaign
   - [ ] Comparación de performance por canal
   - [ ] Gráficos de tendencias temporales
   - [ ] Exportación de datos

3. **Tracking Adicional**
   - [ ] Tracking de tiempo en página (`TIME_30S`, `TIME_60S`)
   - [ ] Tracking de scroll depth (`SCROLL_50`, `SCROLL_100`)
   - [ ] Tracking de heatmaps (futuro)

4. **Optimizaciones**
   - [ ] Revisar necesidad de `ContentType: 'PROFILE'` vs usar metadata
   - [ ] Optimizar queries del dashboard con agregaciones SQL
   - [ ] Agregar índices adicionales si es necesario
   - [ ] Considerar particionamiento por `studio_id` para escalabilidad

---

## 📝 NOTAS TÉCNICAS

### Estructura de Datos

**Ofertas:**
- `studio_offer_visits`: Tracking de visitas (landing/leadform)
- `studio_offer_submissions`: Formularios completados
- Relación: `submission.visit_id` → `visit.id`

**Analytics General:**
- `studio_content_analytics`: Tracking de contenido (posts, portfolios, offers, packages, promises)
- Eventos: `OFFER_CLICK`, `SIDEBAR_VIEW`, `PAQUETE_CLICK`, `FEED_VIEW`, etc.
- Integrado con sistema de exclusión de owner

**Conversión:**
- `studio_promises`: Promesas pendientes
- `studio_events`: Eventos convertidos (con cotización autorizada/aprobada)
- `studio_paquetes`: Paquetes con tracking de clicks

### Performance

- **Queries paralelizadas:** Uso de `Promise.all` para optimizar
- **Límites de fecha:** Por defecto últimos 90 días
- **Filtros opcionales:** Rangos de fecha personalizables
- **Exclusión de owner:** Automática en todas las queries
- **Rate limiting:** 30 eventos/minuto por IP/usuario
- **Deduplicación:** 3 segundos de ventana

### Consideraciones

- Los eventos convertidos se filtran por cotización autorizada/aprobada
- Las promesas pendientes excluyen pruebas (`is_test: false`)
- Los clicks en paquetes se trackean con `content_type: 'PROMISE'` y `paquete_id` en metadata
- El tracking de perfil público usa `content_type: 'PACKAGE'` como placeholder con `metadata.profile_view: true`

### Privacy y Compliance

- UTMs en sessionStorage (no cookies)
- No se trackea información personal directamente
- Compatible con GDPR/CCPA
- IP addresses se guardan pero no se usan para identificación personal

---

## 📚 REFERENCIAS

### Archivos Clave

**Server Actions:**
- `src/lib/actions/studio/analytics/analytics-dashboard.actions.ts`
- `src/lib/actions/studio/analytics/analytics.actions.ts`
- `src/lib/actions/studio/offers/offer-visits.actions.ts`
- `src/lib/actions/studio/offers/offer-submissions.actions.ts`
- `src/lib/actions/studio/commercial/promises/promise-analytics.actions.ts`

**Componentes:**
- `src/app/[slug]/studio/analytics/components/ConversionMetrics.tsx`
- `src/app/[slug]/studio/analytics/components/AnalyticsOverviewCards.tsx`
- `src/app/[slug]/studio/analytics/marketing/components/ConversionMetricsClient.tsx`
- `src/components/offers/OfferLandingPage.tsx`
- `src/components/offers/OfferLeadForm.tsx`

**Hooks:**
- `src/hooks/useContentAnalytics.ts`

**Utils:**
- `src/lib/utils/analytics-helpers.ts`
- `src/lib/utils/analytics-filters.ts`

### Consideraciones de Arquitectura

#### Escalabilidad para N Studios

**Estado actual:** ✅ Bien diseñado

- Tabla `studio_content_analytics` tiene índice en `studio_id`
- Queries filtran por `studio_id`
- Rate limiting por IP/usuario (no por studio)

**Posibles mejoras:**

- Agregar particionamiento por `studio_id` si crece mucho
- Considerar archivar datos antiguos (>1 año)
- Agregar materialized views para métricas agregadas

#### Eficiencia de Queries

**Optimización actual:**

- Queries paralelizadas con `Promise.all`
- Límites de fecha por defecto (últimos 90 días)
- Exclusión de owner automática

**Mejoras futuras:**

- Usar una sola query con agregaciones múltiples cuando sea posible
- Considerar agregaciones SQL directas para métricas complejas

---

**Fin del análisis**
