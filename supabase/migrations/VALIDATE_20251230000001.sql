-- Script de validación para migración 20251230000001
-- Ejecutar DESPUÉS de aplicar la migración principal

-- =====================================================
-- 1. Verificar campos en platform_config
-- =====================================================
SELECT 
    'platform_config fields' as check_name,
    COUNT(*) as found_columns
FROM information_schema.columns 
WHERE table_name = 'platform_config' 
  AND column_name IN ('auto_generate_contract', 'require_contract_before_event');
-- Esperado: 2

-- =====================================================
-- 2. Verificar tipo de studio_cotizaciones.status
-- =====================================================
SELECT 
    'studio_cotizaciones.status type' as check_name,
    data_type,
    CASE 
        WHEN data_type = 'text' THEN '✅ Correcto (TEXT)'
        ELSE '❌ Incorrecto'
    END as validation
FROM information_schema.columns 
WHERE table_name = 'studio_cotizaciones' 
  AND column_name = 'status';

-- =====================================================
-- 3. Verificar campo contract_id en studio_eventos
-- =====================================================
-- NOTA: La tabla se llama studio_eventos (no studio_events)
SELECT 
    'studio_eventos.contract_id' as check_name,
    data_type,
    is_nullable,
    CASE 
        WHEN data_type = 'text' AND is_nullable = 'YES' THEN '✅ Correcto'
        ELSE '❌ Incorrecto'
    END as validation
FROM information_schema.columns 
WHERE table_name = 'studio_eventos' 
  AND column_name = 'contract_id';

-- =====================================================
-- 4. Verificar foreign key en studio_eventos
-- =====================================================
SELECT 
    'studio_eventos FK' as check_name,
    constraint_name,
    CASE 
        WHEN constraint_name = 'fk_studio_eventos_contract' THEN '✅ Correcto'
        ELSE '❌ Incorrecto'
    END as validation
FROM information_schema.table_constraints 
WHERE table_name = 'studio_eventos'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'fk_studio_eventos_contract';

-- =====================================================
-- 5. Verificar índice en studio_eventos
-- =====================================================
SELECT 
    'studio_eventos index' as check_name,
    indexname,
    CASE 
        WHEN indexname = 'idx_studio_eventos_contract_id' THEN '✅ Correcto'
        ELSE '❌ Incorrecto'
    END as validation
FROM pg_indexes 
WHERE tablename = 'studio_eventos'
  AND indexname = 'idx_studio_eventos_contract_id';

-- =====================================================
-- 6. Verificar campos en studio_contacts
-- =====================================================
SELECT 
    'studio_contacts fields' as check_name,
    COUNT(*) as found_columns
FROM information_schema.columns 
WHERE table_name = 'studio_contacts' 
  AND column_name IN ('data_confirmed_at', 'data_confirmed_ip');
-- Esperado: 2

-- =====================================================
-- 7. Verificar campo signed_ip en studio_event_contracts
-- =====================================================
SELECT 
    'studio_event_contracts.signed_ip' as check_name,
    data_type,
    is_nullable,
    CASE 
        WHEN data_type = 'inet' AND is_nullable = 'YES' THEN '✅ Correcto'
        ELSE '❌ Incorrecto'
    END as validation
FROM information_schema.columns 
WHERE table_name = 'studio_event_contracts' 
  AND column_name = 'signed_ip';

-- =====================================================
-- 8. Resumen de validación
-- =====================================================
SELECT 
    '=== RESUMEN ===' as summary,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'platform_config' AND column_name IN ('auto_generate_contract', 'require_contract_before_event')) as platform_config_fields,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'studio_eventos' AND column_name = 'contract_id') as studio_eventos_field,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'studio_eventos' AND constraint_name = 'fk_studio_eventos_contract') as studio_eventos_fk,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'studio_eventos' AND indexname = 'idx_studio_eventos_contract_id') as studio_eventos_index,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'studio_contacts' AND column_name IN ('data_confirmed_at', 'data_confirmed_ip')) as studio_contacts_fields,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'studio_event_contracts' AND column_name = 'signed_ip') as contracts_signed_ip;

-- Todos los valores deberían ser >= 1 (excepto los COUNT que deberían ser 2)

