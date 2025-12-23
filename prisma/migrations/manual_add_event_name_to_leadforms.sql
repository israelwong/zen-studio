-- Agregar campos para solicitar nombre del evento en leadforms
ALTER TABLE studio_offer_leadforms
  ADD COLUMN IF NOT EXISTS enable_event_name BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS event_name_required BOOLEAN DEFAULT FALSE NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN studio_offer_leadforms.enable_event_name IS 'Habilitar campo para solicitar nombre del evento en el formulario';
COMMENT ON COLUMN studio_offer_leadforms.event_name_required IS 'Hacer obligatorio el campo de nombre del evento';

