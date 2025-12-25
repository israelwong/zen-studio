-- ============================================
-- Agregar tipos de notificación de cancelación de contratos al enum StudioNotificationType
-- ============================================

ALTER TYPE "StudioNotificationType" ADD VALUE IF NOT EXISTS 'CONTRACT_CANCELLATION_CONFIRMED';
ALTER TYPE "StudioNotificationType" ADD VALUE IF NOT EXISTS 'CONTRACT_CANCELLATION_REJECTED';

