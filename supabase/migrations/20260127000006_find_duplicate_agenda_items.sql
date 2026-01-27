-- Encontrar agendamientos duplicados o problemáticos
-- Verificar si hay múltiples agendamientos para el mismo evento en la misma fecha

-- 1. Buscar agendamientos duplicados (mismo evento_id y misma fecha)
SELECT 
    evento_id,
    DATE(date) as fecha,
    COUNT(*) as cantidad,
    array_agg(id) as agenda_ids,
    array_agg(contexto) as contextos,
    array_agg(metadata->>'agenda_type') as agenda_types
FROM studio_agenda
WHERE evento_id IS NOT NULL
  AND date >= CURRENT_DATE
GROUP BY evento_id, DATE(date)
HAVING COUNT(*) > 1
ORDER BY fecha;

-- 2. Verificar si hay agendamientos con contexto 'promise' que deberían ser excluidos
SELECT 
    id,
    contexto,
    type_scheduling,
    promise_id,
    evento_id,
    date,
    metadata->>'agenda_type' as agenda_type,
    CASE 
        WHEN contexto = 'promise' AND type_scheduling IS NULL THEN '❌ DEBERÍA SER EXCLUIDO (event_date)'
        WHEN contexto = 'promise' AND type_scheduling IS NOT NULL THEN '✅ INCLUIDO (cita comercial)'
        WHEN contexto = 'evento' THEN '✅ INCLUIDO (evento)'
        ELSE '⚠️ CASO DESCONOCIDO'
    END as status_esperado
FROM studio_agenda
WHERE date >= CURRENT_DATE
  AND (
    -- Agendamientos problemáticos (promise sin type_scheduling)
    (contexto = 'promise' AND type_scheduling IS NULL)
    -- O todos los agendamientos futuros para revisar
    OR date >= CURRENT_DATE
  )
ORDER BY date, contexto, type_scheduling;

-- 3. Verificar específicamente la promesa cmk627cpt000104l1ljhc025p
SELECT 
    id,
    contexto,
    type_scheduling,
    promise_id,
    evento_id,
    date,
    metadata->>'agenda_type' as agenda_type,
    metadata,
    CASE 
        WHEN contexto = 'promise' AND type_scheduling IS NULL THEN '❌ EXCLUIDO'
        WHEN contexto = 'promise' AND type_scheduling IS NOT NULL THEN '✅ INCLUIDO'
        WHEN contexto = 'evento' THEN '✅ INCLUIDO'
        ELSE '⚠️ DESCONOCIDO'
    END as deberia_estar
FROM studio_agenda
WHERE promise_id = 'cmk627cpt000104l1ljhc025p'
ORDER BY date;

-- 4. Verificar si hay agendamientos dinámicos (confirmed-*) que están siendo creados
-- Estos son los items que se crean dinámicamente en obtenerAgendaUnificada
-- y que tienen formato: confirmed-{promise_id}-{date}
SELECT 
    id,
    contexto,
    type_scheduling,
    promise_id,
    evento_id,
    date,
    metadata->>'agenda_type' as agenda_type
FROM studio_agenda
WHERE id LIKE 'confirmed-%'
  AND date >= CURRENT_DATE
ORDER BY date;
