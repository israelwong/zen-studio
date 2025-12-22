# Migración: Integración Google (Drive + Calendar)

Esta migración agrega los campos necesarios para las integraciones con Google Drive API y Google Calendar API.

## Arquitectura Multi-Tenant

- **`platform_config`**: Credenciales OAuth compartidas (un solo set para toda la plataforma)
- **`studios`**: Tokens específicos de cada estudio (cada estudio conecta su propia cuenta)
- **`studio_event_deliverables`**: Configuración de entregables con Google Drive
- **`studio_agenda`**: Sincronización con Google Calendar

## Campos Agregados

### Tabla `platform_config` (Credenciales OAuth compartidas)
- `google_oauth_client_id` (TEXT) - Client ID de Google OAuth2
- `google_oauth_client_secret` (TEXT) - Client Secret (debe estar encriptado)
- `google_api_key` (TEXT) - API Key para Google Picker API
- `google_oauth_redirect_uri` (TEXT) - URI de redirección OAuth2

### Tabla `studios` (Tokens específicos por estudio)
- `google_refresh_token` (TEXT) - Token de refresh de OAuth2 (encriptado)
- `google_email` (TEXT) - Email de la cuenta de Google vinculada
- `is_google_connected` (BOOLEAN) - Indica si el estudio tiene Google Drive conectado

### Tabla `studio_event_deliverables`
- `google_folder_id` (TEXT) - ID de la carpeta de Google Drive vinculada
- `delivery_mode` (DeliveryMode ENUM) - Modo de entrega: 'native' | 'google_drive'
- `drive_metadata_cache` (JSONB) - Cache de metadata de archivos

### Tabla `studio_agenda` (Google Calendar sync)
- `google_event_id` (TEXT) - ID del evento en Google Calendar (para sincronización bidireccional)

### Nuevo Enum
- `DeliveryMode` - Enum con valores: 'native', 'google_drive'

## Aplicar Migración

### Opción 1: Desde psql
```bash
psql $DATABASE_URL -f migration.sql
```

### Opción 2: Desde Supabase Dashboard
1. Ir a SQL Editor
2. Copiar y pegar el contenido de `migration.sql`
3. Ejecutar

### Opción 3: Desde Prisma Studio (no recomendado para producción)
```bash
# Solo para desarrollo/testing
npx prisma db execute --file prisma/migrations/manual_add_google_drive_integration/migration.sql --schema prisma/schema.prisma
```

## Verificar Migración

```sql
-- Verificar campos en platform_config
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'platform_config' 
AND column_name LIKE 'google_%';

-- Verificar campos en studios
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'studios' 
AND column_name IN ('google_refresh_token', 'google_email', 'is_google_connected');

-- Verificar campos en studio_event_deliverables
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'studio_event_deliverables' 
AND column_name IN ('google_folder_id', 'delivery_mode', 'drive_metadata_cache');

-- Verificar campo en studio_agenda
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'studio_agenda' 
AND column_name = 'google_event_id';

-- Verificar enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeliveryMode');
```

## Rollback (si es necesario)

```sql
-- Eliminar campos de studio_event_deliverables
ALTER TABLE "studio_event_deliverables"
DROP COLUMN IF EXISTS "google_folder_id",
DROP COLUMN IF EXISTS "delivery_mode",
DROP COLUMN IF EXISTS "drive_metadata_cache";

-- Eliminar campo de studio_agenda
ALTER TABLE "studio_agenda"
DROP COLUMN IF EXISTS "google_event_id";

-- Eliminar campos de studios
ALTER TABLE "studios"
DROP COLUMN IF EXISTS "google_refresh_token",
DROP COLUMN IF EXISTS "google_email",
DROP COLUMN IF EXISTS "is_google_connected";

-- Eliminar campos de platform_config
ALTER TABLE "platform_config"
DROP COLUMN IF EXISTS "google_oauth_client_id",
DROP COLUMN IF EXISTS "google_oauth_client_secret",
DROP COLUMN IF EXISTS "google_api_key",
DROP COLUMN IF EXISTS "google_oauth_redirect_uri";

-- Eliminar índices
DROP INDEX IF EXISTS "studios_is_google_connected_idx";
DROP INDEX IF EXISTS "studio_event_deliverables_google_folder_id_idx";
DROP INDEX IF EXISTS "studio_event_deliverables_delivery_mode_idx";
DROP INDEX IF EXISTS "studio_agenda_google_event_id_idx";

-- Eliminar enum (solo si no hay referencias)
DROP TYPE IF EXISTS "DeliveryMode";
```

## Notas

- La migración usa `IF NOT EXISTS` para evitar errores si se ejecuta múltiples veces
- Todos los entregables existentes se configuran con `delivery_mode = 'native'`
- Todos los estudios existentes se configuran con `is_google_connected = false`
- Las credenciales OAuth en `platform_config` deben configurarse manualmente después de la migración
- `google_oauth_client_secret` debe encriptarse antes de guardarse en la base de datos

