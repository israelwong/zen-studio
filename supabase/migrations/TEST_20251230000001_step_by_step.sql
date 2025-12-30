-- Script de prueba paso por paso
-- Ejecutar cada sección por separado para identificar problemas

-- =====================================================
-- PASO 1: Verificar que las tablas existen
-- =====================================================
SELECT 'Verificando tablas...' as step;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('platform_config', 'studio_eventos', 'studio_contacts', 'studio_event_contracts') 
        THEN '✅ Existe' 
        ELSE '❌ No existe' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('platform_config', 'studio_eventos', 'studio_contacts', 'studio_event_contracts', 'studio_events')
ORDER BY table_name;

-- Si studio_events aparece en lugar de studio_eventos, hay que usar ese nombre

-- =====================================================
-- PASO 2: Intentar agregar campos en platform_config
-- =====================================================
-- Ejecutar solo después de verificar que la tabla existe

/*
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS auto_generate_contract BOOLEAN DEFAULT false;

ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS require_contract_before_event BOOLEAN DEFAULT true;

-- Verificar
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'platform_config' 
  AND column_name IN ('auto_generate_contract', 'require_contract_before_event');
*/

-- =====================================================
-- PASO 3: Intentar agregar campo en studio_eventos
-- =====================================================
-- IMPORTANTE: Si la tabla se llama studio_events, cambiar el nombre

/*
-- Primero verificar el nombre correcto:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%evento%';

-- Si es studio_eventos:
ALTER TABLE studio_eventos
ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- Si es studio_events:
-- ALTER TABLE studio_events
-- ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('studio_eventos', 'studio_events')
  AND column_name = 'contract_id';
*/

-- =====================================================
-- PASO 4: Agregar campos en studio_contacts
-- =====================================================

/*
ALTER TABLE studio_contacts
ADD COLUMN IF NOT EXISTS data_confirmed_at TIMESTAMPTZ;

ALTER TABLE studio_contacts
ADD COLUMN IF NOT EXISTS data_confirmed_ip INET;

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'studio_contacts' 
  AND column_name IN ('data_confirmed_at', 'data_confirmed_ip');
*/

-- =====================================================
-- PASO 5: Agregar campo en studio_event_contracts
-- =====================================================

/*
ALTER TABLE studio_event_contracts
ADD COLUMN IF NOT EXISTS signed_ip INET;

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'studio_event_contracts' 
  AND column_name = 'signed_ip';
*/

-- =====================================================
-- PASO 6: Agregar FK e índice (solo después de paso 3)
-- =====================================================

/*
-- Si es studio_eventos:
ALTER TABLE studio_eventos
ADD CONSTRAINT fk_studio_eventos_contract
FOREIGN KEY (contract_id) 
REFERENCES studio_event_contracts(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_studio_eventos_contract_id 
ON studio_eventos(contract_id);

-- Si es studio_events:
-- ALTER TABLE studio_events
-- ADD CONSTRAINT fk_studio_events_contract
-- FOREIGN KEY (contract_id) 
-- REFERENCES studio_event_contracts(id)
-- ON DELETE SET NULL;
-- 
-- CREATE INDEX IF NOT EXISTS idx_studio_events_contract_id 
-- ON studio_events(contract_id);
*/

