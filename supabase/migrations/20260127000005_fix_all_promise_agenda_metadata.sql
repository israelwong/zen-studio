-- Fix metadata for ALL agenda items that are missing or have incorrect metadata
-- This ensures all agenda items have correct metadata based on contexto and type_scheduling

-- Primero, verificar qué agendamientos hay para la promesa específica
DO $$
DECLARE
    agenda_rec RECORD;
BEGIN
    RAISE NOTICE '=== Agendamientos para promesa cmk627cpt000104l1ljhc025p ===';
    FOR agenda_rec IN 
        SELECT 
            id,
            contexto,
            type_scheduling,
            promise_id,
            evento_id,
            date,
            metadata->>'agenda_type' as agenda_type,
            metadata
        FROM studio_agenda
        WHERE promise_id = 'cmk627cpt000104l1ljhc025p'
        ORDER BY date
    LOOP
        RAISE NOTICE 'ID: %, Contexto: %, Type: %, Evento: %, Fecha: %, Agenda Type: %', 
            agenda_rec.id, 
            agenda_rec.contexto, 
            agenda_rec.type_scheduling,
            agenda_rec.evento_id,
            agenda_rec.date,
            agenda_rec.agenda_type;
    END LOOP;
END $$;

-- Actualizar metadata para todos los agendamientos que lo necesiten
UPDATE studio_agenda
SET metadata = CASE
    -- PROMESA FECHA EVENTO (NO Google Calendar)
    WHEN contexto = 'promise' AND type_scheduling IS NULL THEN
        jsonb_build_object(
            'agenda_type', 'event_date',
            'sync_google', false
        )
    -- PROMESA CITA PRESENCIAL/VIRTUAL (SÍ Google Calendar - Principal)
    WHEN contexto = 'promise' AND type_scheduling IN ('presencial', 'virtual') THEN
        jsonb_build_object(
            'agenda_type', 'commercial_appointment',
            'sync_google', true,
            'google_calendar_type', 'primary'
        )
    -- EVENTO ASIGNADO (SÍ Google Calendar - Principal)
    WHEN contexto = 'evento' AND type_scheduling IS NULL THEN
        jsonb_build_object(
            'agenda_type', 'main_event_date',
            'sync_google', true,
            'google_calendar_type', 'primary',
            'is_main_event_date', true
        )
    -- EVENTO CITA PRESENCIAL/VIRTUAL (SÍ Google Calendar - Principal)
    WHEN contexto = 'evento' AND type_scheduling IN ('presencial', 'virtual') THEN
        jsonb_build_object(
            'agenda_type', 'event_appointment',
            'sync_google', true,
            'google_calendar_type', 'primary'
        )
    -- Fallback
    ELSE
        jsonb_build_object(
            'agenda_type', 'event_date',
            'sync_google', false
        )
END
WHERE (
    -- Solo actualizar si no tiene metadata o si el metadata no tiene agenda_type
    metadata IS NULL 
    OR NOT (metadata ? 'agenda_type')
    OR (metadata->>'agenda_type') IS NULL
    -- O si tiene metadata incorrecto (promise sin type_scheduling debería ser event_date)
    OR (
        contexto = 'promise' 
        AND type_scheduling IS NULL 
        AND (metadata->>'agenda_type') != 'event_date'
    )
    -- O si tiene metadata incorrecto (promise con type_scheduling debería ser commercial_appointment)
    OR (
        contexto = 'promise' 
        AND type_scheduling IN ('presencial', 'virtual')
        AND (metadata->>'agenda_type') != 'commercial_appointment'
    )
);

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % agenda items with correct metadata', updated_count;
END $$;

-- Verificar agendamientos futuros que deberían aparecer en el popover
-- (excluyendo event_date)
SELECT 
    id,
    contexto,
    type_scheduling,
    promise_id,
    evento_id,
    date,
    metadata->>'agenda_type' as agenda_type,
    CASE 
        WHEN metadata->>'agenda_type' = 'event_date' THEN '❌ EXCLUIDO'
        ELSE '✅ INCLUIDO'
    END as status
FROM studio_agenda
WHERE date >= CURRENT_DATE
  AND (
    -- Incluir eventos
    contexto = 'evento'
    -- O promesas con type_scheduling (citas comerciales)
    OR (contexto = 'promise' AND type_scheduling IS NOT NULL)
  )
ORDER BY date
LIMIT 10;
