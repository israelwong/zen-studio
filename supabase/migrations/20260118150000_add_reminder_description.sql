-- ============================================
-- AGREGAR CAMPO description A studio_reminders
-- ============================================
-- Campo opcional para agregar descripción adicional al seguimiento

ALTER TABLE public.studio_reminders
ADD COLUMN IF NOT EXISTS description TEXT;

-- Comentario
COMMENT ON COLUMN public.studio_reminders.description IS 'Descripción adicional opcional del seguimiento (máximo 500 caracteres)';
