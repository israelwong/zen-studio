-- Migration: Add Google Contacts Integration
-- Date: 2025-12-28
-- Description: Añade campos google_contact_id a studio_contacts y user_studio_roles para sincronización con Google Contacts (People API)
-- 
-- Changes:
-- 1. Añade google_contact_id (text, nullable) a studio_contacts
-- 2. Añade google_contact_id (text, nullable) a user_studio_roles
-- 3. Añade índices para optimizar búsquedas por google_contact_id
--
-- Notes:
-- - Los campos son nullable porque no todos los contactos/staff estarán sincronizados
-- - Los índices permiten búsquedas eficientes durante la sincronización
-- - google_contact_id almacena el resourceName de Google Contacts (formato: "people/{personId}")

-- ============================================
-- 1. Añadir google_contact_id a studio_contacts
-- ============================================
alter table "studio_contacts" 
add column if not exists "google_contact_id" text;

-- Índice simple para búsquedas rápidas
create index if not exists "studio_contacts_google_contact_id_idx" 
on "studio_contacts"("google_contact_id");

-- Índice compuesto para búsquedas por studio + google_contact_id
create index if not exists "studio_contacts_studio_google_contact_idx" 
on "studio_contacts"("studio_id", "google_contact_id");

-- ============================================
-- 2. Añadir google_contact_id a user_studio_roles
-- ============================================
alter table "user_studio_roles" 
add column if not exists "google_contact_id" text;

-- Índice simple para búsquedas rápidas
create index if not exists "user_studio_roles_google_contact_id_idx" 
on "user_studio_roles"("google_contact_id");

-- Índice compuesto para búsquedas por studio + google_contact_id
create index if not exists "user_studio_roles_studio_google_contact_idx" 
on "user_studio_roles"("studio_id", "google_contact_id");

