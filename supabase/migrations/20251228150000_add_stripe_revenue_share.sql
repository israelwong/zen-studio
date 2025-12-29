-- Migration: Add Stripe Revenue Share Infrastructure
-- Date: 2025-12-28
-- Description: Añade infraestructura completa para Stripe Revenue Share (50/50) para servicios externos (invitaciones digitales)
-- 
-- Changes:
-- 1. Añade campos Stripe adicionales a studios (stripe_payment_method_id, stripe_invoice_id, billing_email)
-- 2. Añade invitation_base_cost a platform_config (configuración protegida para costo base)
-- 3. Crea tabla studio_external_service_sales para registrar ventas de servicios externos con revenue share
-- 4. Añade valor PAID al enum InvitationStatus
-- 5. Crea índices para optimizar consultas
--
-- Notes:
-- - base_cost se obtiene SIEMPRE desde platform_config (nunca del webhook)
-- - Cálculo: net_profit = amount_total - stripe_fee - base_cost
-- - División 50/50: studio_amount = platform_amount = net_profit / 2
-- - customer_name_cache preserva el nombre del cliente incluso si se elimina el contacto

-- ============================================
-- 1. Añadir campos Stripe adicionales a studios
-- ============================================
alter table "studios" 
add column if not exists "stripe_payment_method_id" text,
add column if not exists "stripe_invoice_id" text,
add column if not exists "billing_email" text;

-- ============================================
-- 2. Añadir invitation_base_cost a platform_config
-- ============================================
alter table "platform_config" 
add column if not exists "invitation_base_cost" decimal(10,2) default 0;

-- Comentario para documentar el campo
comment on column "platform_config"."invitation_base_cost" is 'Costo base protegido para servicios externos (invitaciones). Se obtiene desde la DB, nunca del webhook.';

-- ============================================
-- 3. Añadir valor PAID al enum InvitationStatus
-- ============================================
-- Nota: En PostgreSQL, para añadir un valor a un enum existente:
alter type "InvitationStatus" add value if not exists 'PAID';

-- ============================================
-- 4. Crear tabla studio_external_service_sales
-- ============================================
create table if not exists "studio_external_service_sales" (
  "id" text not null primary key,
  "studio_id" text not null,
  "contact_id" text,
  "customer_name_cache" text,
  "event_id" text,
  "scheduler_task_id" text unique,
  "service_type" text not null,
  "amount_total" decimal(10,2) not null,
  "base_cost" decimal(10,2) not null,
  "stripe_fee" decimal(10,2) not null,
  "studio_amount" decimal(10,2) not null,
  "platform_amount" decimal(10,2) not null,
  "stripe_payment_intent_id" text unique,
  "stripe_transfer_id" text,
  "stripe_charge_id" text,
  "status" text not null default 'pending',
  "payment_date" timestamp(3),
  "transfer_date" timestamp(3),
  "description" text,
  "metadata" jsonb,
  "created_at" timestamp(3) not null default now(),
  "updated_at" timestamp(3) not null default now(),
  
  constraint "studio_external_service_sales_studio_id_fkey" 
    foreign key ("studio_id") 
    references "studios"("id") 
    on delete cascade,
    
  constraint "studio_external_service_sales_contact_id_fkey" 
    foreign key ("contact_id") 
    references "studio_contacts"("id") 
    on delete set null,
    
  constraint "studio_external_service_sales_event_id_fkey" 
    foreign key ("event_id") 
    references "studio_eventos"("id") 
    on delete set null,
    
  constraint "studio_external_service_sales_scheduler_task_id_fkey" 
    foreign key ("scheduler_task_id") 
    references "studio_scheduler_event_tasks"("id") 
    on delete set null
);

-- Comentarios para documentar campos clave
comment on table "studio_external_service_sales" is 'Registra ventas de servicios externos (invitaciones digitales) con revenue share 50/50 entre plataforma y estudio';
comment on column "studio_external_service_sales"."base_cost" is 'Costo base obtenido desde platform_config (protegido, nunca del webhook)';
comment on column "studio_external_service_sales"."customer_name_cache" is 'Cache del nombre del cliente para preservar información incluso si se elimina el contacto';
comment on column "studio_external_service_sales"."studio_amount" is 'Ganancia del estudio (50% del net_profit)';
comment on column "studio_external_service_sales"."platform_amount" is 'Ganancia de la plataforma (50% del net_profit)';

-- ============================================
-- 5. Crear índices para optimizar consultas
-- ============================================

-- Índice compuesto para consultas por studio y status
create index if not exists "studio_external_service_sales_studio_id_status_idx" 
on "studio_external_service_sales"("studio_id", "status");

-- Índice compuesto para consultas por studio y fecha de pago
create index if not exists "studio_external_service_sales_studio_id_payment_date_idx" 
on "studio_external_service_sales"("studio_id", "payment_date");

-- Índices simples para relaciones
create index if not exists "studio_external_service_sales_contact_id_idx" 
on "studio_external_service_sales"("contact_id");

create index if not exists "studio_external_service_sales_event_id_idx" 
on "studio_external_service_sales"("event_id");

create index if not exists "studio_external_service_sales_scheduler_task_id_idx" 
on "studio_external_service_sales"("scheduler_task_id");

-- Índice para búsquedas por payment_intent_id (idempotencia)
create index if not exists "studio_external_service_sales_stripe_payment_intent_id_idx" 
on "studio_external_service_sales"("stripe_payment_intent_id");

-- Índice compuesto para consultas por status y fecha de pago
create index if not exists "studio_external_service_sales_status_payment_date_idx" 
on "studio_external_service_sales"("status", "payment_date");

-- ============================================
-- 6. Trigger para actualizar updated_at automáticamente
-- ============================================
create or replace function update_studio_external_service_sales_updated_at()
returns trigger as $$
begin
  new."updated_at" = now();
  return new;
end;
$$ language plpgsql;

create trigger "studio_external_service_sales_updated_at"
  before update on "studio_external_service_sales"
  for each row
  execute function update_studio_external_service_sales_updated_at();

