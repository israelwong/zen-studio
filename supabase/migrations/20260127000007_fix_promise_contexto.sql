-- Actualizar el contexto del agendamiento de la promesa cmk627cpt000104l1ljhc025p
-- Cambiar de 'evento' a 'promise' y actualizar el metadata correspondiente

-- Primero, verificar el estado actual
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
ORDER BY date;

-- Actualizar el contexto y el metadata
UPDATE studio_agenda
SET 
    contexto = 'promise',
    metadata = CASE
        -- Si tiene type_scheduling, es una cita comercial
        WHEN type_scheduling IN ('presencial', 'virtual') THEN
            jsonb_build_object(
                'agenda_type', 'commercial_appointment',
                'sync_google', true,
                'google_calendar_type', 'primary'
            )
        -- Si no tiene type_scheduling, es fecha de evento (event_date)
        ELSE
            jsonb_build_object(
                'agenda_type', 'event_date',
                'sync_google', false
            )
    END
WHERE promise_id = 'cmk627cpt000104l1ljhc025p'
  AND contexto = 'evento';

-- Verificar el resultado
SELECT 
    id,
    contexto,
    type_scheduling,
    promise_id,
    evento_id,
    date,
    metadata->>'agenda_type' as agenda_type,
    CASE 
        WHEN metadata->>'agenda_type' = 'event_date' THEN '❌ EXCLUIDO (fecha de promesa sin cita)'
        WHEN metadata->>'agenda_type' = 'commercial_appointment' THEN '✅ INCLUIDO (cita comercial)'
        ELSE '⚠️ OTRO'
    END as status
FROM studio_agenda
WHERE promise_id = 'cmk627cpt000104l1ljhc025p'
ORDER BY date;
