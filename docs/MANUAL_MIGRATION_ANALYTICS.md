# 🗄️ Migración Manual - Sistema de Analytics

## 📋 Instrucciones

### 1. **Acceder a Supabase SQL Editor**

1. Ir a https://supabase.com
2. Seleccionar el proyecto
3. Ir a **SQL Editor** en el menú lateral
4. Crear una nueva query

### 2. **Ejecutar Migración**

Copiar y pegar el contenido del archivo:
```
prisma/migrations/MANUAL_APPLY_ANALYTICS.sql
```

### 3. **Ejecutar por Partes** (Recomendado)

**⚠️ IMPORTANTE**: Los `ALTER TYPE ADD VALUE` deben ejecutarse **FUERA** de bloques transaccionales.

#### Parte 1: Crear ENUMs y Tabla
```sql
-- Copiar desde PASO 1 hasta PASO 3 (incluido)
-- Ejecutar
```

#### Parte 2: Agregar Nuevos Valores al Enum
```sql
-- Ejecutar estas líneas POR SEPARADO (una por una):
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SIDEBAR_VIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'OFFER_CLICK';
```

#### Parte 3: Índices y Constraints
```sql
-- Copiar desde PASO 4 hasta PASO 5
-- Ejecutar
```

#### Parte 4: Verificación
```sql
-- Copiar queries de VERIFICACIÓN
-- Ejecutar para confirmar que todo está OK
```

---

## ✅ Verificación Post-Migración

### 1. **Verificar Tabla Creada**
```sql
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename = 'studio_content_analytics';
```

**Resultado esperado:**
```
tablename                    | schemaname
-----------------------------|-----------
studio_content_analytics     | public
```

### 2. **Verificar Índices (5 índices)**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'studio_content_analytics';
```

**Resultado esperado:**
```
studio_content_analytics_pkey
studio_content_analytics_studio_id_content_type_content_id_event_type_idx
studio_content_analytics_content_type_content_id_created_at_idx
studio_content_analytics_studio_id_created_at_idx
studio_content_analytics_event_type_created_at_idx
studio_content_analytics_session_id_idx
```

### 3. **Verificar ENUMs**
```sql
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'AnalyticsEventType'
ORDER BY e.enumsortorder;
```

**Debe incluir (22 valores):**
- PAGE_VIEW
- FEED_VIEW
- **SIDEBAR_VIEW** ← Nuevo
- MODAL_OPEN
- MODAL_CLOSE
- **OFFER_CLICK** ← Nuevo
- NEXT_CONTENT
- PREV_CONTENT
- LINK_COPY
- SHARE_CLICK
- MEDIA_CLICK
- MEDIA_VIEW
- CAROUSEL_NEXT
- CAROUSEL_PREV
- CTA_CLICK
- WHATSAPP_CLICK
- FORM_VIEW
- FORM_SUBMIT
- SCROLL_50
- SCROLL_100
- TIME_30S
- TIME_60S

### 4. **Test de Inserción**
```sql
-- Probar insertar un evento de prueba
INSERT INTO studio_content_analytics (
    studio_id,
    content_type,
    content_id,
    event_type,
    created_at
) VALUES (
    (SELECT id FROM studios LIMIT 1),
    'POST',
    'test_post_id',
    'FEED_VIEW',
    NOW()
);

-- Verificar
SELECT * FROM studio_content_analytics WHERE content_id = 'test_post_id';

-- Limpiar test
DELETE FROM studio_content_analytics WHERE content_id = 'test_post_id';
```

---

## 🚨 Troubleshooting

### Error: "type already exists"
```sql
-- Verificar si ya existe
SELECT typname FROM pg_type WHERE typname = 'ContentType';

-- Si existe, saltar la creación del enum
```

### Error: "relation already exists"
```sql
-- Verificar si la tabla ya existe
SELECT tablename FROM pg_tables WHERE tablename = 'studio_content_analytics';

-- Si existe, saltar la creación de tabla
```

### Error: "constraint already exists"
```sql
-- Verificar constraints existentes
SELECT conname FROM pg_constraint WHERE conname = 'studio_content_analytics_studio_id_fkey';

-- Si existe, está OK
```

---

## 📊 Queries Útiles Post-Migración

### Ver estadísticas de la tabla
```sql
SELECT 
    COUNT(*) as total_events,
    content_type,
    event_type,
    COUNT(*) as count
FROM studio_content_analytics
GROUP BY content_type, event_type
ORDER BY count DESC;
```

### Ver últimos 10 eventos
```sql
SELECT 
    content_type,
    event_type,
    created_at,
    studio_id
FROM studio_content_analytics
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Marcar Migración como Aplicada

Después de ejecutar manualmente en Supabase, marcar en Prisma:

```bash
# Terminal
npx prisma migrate resolve --applied 20251204_add_content_analytics_system
npx prisma migrate resolve --applied 20251204_add_offer_analytics_events
```

---

## 📝 Notas

- **Tiempo estimado**: 2-5 minutos
- **Downtime**: Ninguno (tabla nueva, no afecta existentes)
- **Rollback**: Si es necesario, `DROP TABLE studio_content_analytics CASCADE;`
- **Backup**: No requerido (tabla nueva sin datos)

---

**Fecha de creación**: 4 de diciembre de 2024  
**Última actualización**: 4 de diciembre de 2024
