-- Migration: Add enable_event_duration and event_duration_required fields to studio_offer_leadforms
-- Description: Agregar campos para solicitar duración del evento en formularios de ofertas
-- Date: 2026-01-11

ALTER TABLE public.studio_offer_leadforms
ADD COLUMN IF NOT EXISTS enable_event_duration BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS event_duration_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.studio_offer_leadforms.enable_event_duration IS 'Indica si se debe solicitar la duración del evento en horas en el formulario de contacto';
COMMENT ON COLUMN public.studio_offer_leadforms.event_duration_required IS 'Indica si la duración del evento es obligatoria cuando está habilitada';
