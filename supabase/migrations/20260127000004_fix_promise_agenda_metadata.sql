-- Fix metadata for agenda items related to promise cmk627cpt000104l1ljhc025p
-- This ensures all agenda items have correct metadata based on contexto and type_scheduling

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
WHERE promise_id = 'cmk627cpt000104l1ljhc025p'
  AND (
    -- Solo actualizar si no tiene metadata o si el metadata no tiene agenda_type
    metadata IS NULL 
    OR NOT (metadata ? 'agenda_type')
    OR (metadata->>'agenda_type') IS NULL
  );

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % agenda items for promise cmk627cpt000104l1ljhc025p', updated_count;
END $$;
