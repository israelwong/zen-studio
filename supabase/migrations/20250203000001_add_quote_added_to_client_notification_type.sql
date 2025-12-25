-- ============================================
-- Agregar QUOTE_ADDED al enum ClientNotificationType si no existe
-- ============================================
-- Esto resuelve el error de Prisma que intenta eliminar un valor que no existe

ALTER TYPE "ClientNotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_ADDED';

