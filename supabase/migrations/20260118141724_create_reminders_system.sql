-- ============================================
-- CREAR SISTEMA DE SEGUIMIENTOS (REMINDERS)
-- ============================================
-- Tablas: studio_reminders y studio_reminder_subjects
-- Sistema de seguimientos manuales para promesas con librería de asuntos personalizable

-- ============================================
-- TABLA: studio_reminder_subjects
-- ============================================
-- Librería de asuntos frecuentes por estudio

CREATE TABLE IF NOT EXISTS public.studio_reminder_subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL,
  text TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_studio_reminder_subjects_studio 
    FOREIGN KEY (studio_id) 
    REFERENCES public.studios(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT unique_studio_reminder_subjects_studio_text 
    UNIQUE (studio_id, text)
);

-- Índices para studio_reminder_subjects
CREATE INDEX IF NOT EXISTS idx_reminder_subjects_studio_active_order 
  ON public.studio_reminder_subjects(studio_id, is_active, "order");

-- ============================================
-- TABLA: studio_reminders
-- ============================================
-- Seguimientos manuales para promesas (1:1 con promises)

CREATE TABLE IF NOT EXISTS public.studio_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id TEXT NOT NULL,
  promise_id TEXT NOT NULL UNIQUE, -- ⚠️ UNIQUE: Solo un seguimiento activo por promise
  subject_id TEXT,
  subject_text TEXT NOT NULL,
  reminder_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by_user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_studio_reminders_studio 
    FOREIGN KEY (studio_id) 
    REFERENCES public.studios(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_studio_reminders_promise 
    FOREIGN KEY (promise_id) 
    REFERENCES public.studio_promises(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_studio_reminders_subject 
    FOREIGN KEY (subject_id) 
    REFERENCES public.studio_reminder_subjects(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT fk_studio_reminders_completed_by 
    FOREIGN KEY (completed_by_user_id) 
    REFERENCES public.studio_users(id) 
    ON DELETE SET NULL
);

-- Índices para studio_reminders
CREATE INDEX IF NOT EXISTS idx_reminders_studio_date 
  ON public.studio_reminders(studio_id, reminder_date);

CREATE INDEX IF NOT EXISTS idx_reminders_studio_completed_date 
  ON public.studio_reminders(studio_id, is_completed, reminder_date);

CREATE INDEX IF NOT EXISTS idx_reminders_promise 
  ON public.studio_reminders(promise_id);

CREATE INDEX IF NOT EXISTS idx_reminders_date_active 
  ON public.studio_reminders(reminder_date) 
  WHERE is_completed = false;

-- ============================================
-- HABILITAR RLS
-- ============================================

ALTER TABLE public.studio_reminder_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS: studio_reminder_subjects
-- ============================================

-- Política: Usuarios pueden leer asuntos de su studio
DROP POLICY IF EXISTS "studio_reminder_subjects_read_studio" ON public.studio_reminder_subjects;
CREATE POLICY "studio_reminder_subjects_read_studio" ON public.studio_reminder_subjects
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden crear asuntos en su studio
DROP POLICY IF EXISTS "studio_reminder_subjects_insert_studio" ON public.studio_reminder_subjects;
CREATE POLICY "studio_reminder_subjects_insert_studio" ON public.studio_reminder_subjects
FOR INSERT TO authenticated
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden actualizar asuntos de su studio
DROP POLICY IF EXISTS "studio_reminder_subjects_update_studio" ON public.studio_reminder_subjects;
CREATE POLICY "studio_reminder_subjects_update_studio" ON public.studio_reminder_subjects
FOR UPDATE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden eliminar asuntos de su studio
DROP POLICY IF EXISTS "studio_reminder_subjects_delete_studio" ON public.studio_reminder_subjects;
CREATE POLICY "studio_reminder_subjects_delete_studio" ON public.studio_reminder_subjects
FOR DELETE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- ============================================
-- POLÍTICAS RLS: studio_reminders
-- ============================================

-- Política: Usuarios pueden leer seguimientos de su studio
DROP POLICY IF EXISTS "studio_reminders_read_studio" ON public.studio_reminders;
CREATE POLICY "studio_reminders_read_studio" ON public.studio_reminders
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden crear seguimientos en su studio
DROP POLICY IF EXISTS "studio_reminders_insert_studio" ON public.studio_reminders;
CREATE POLICY "studio_reminders_insert_studio" ON public.studio_reminders
FOR INSERT TO authenticated
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  -- Verificar que la promesa pertenece al studio
  AND promise_id IN (
    SELECT id FROM public.studio_promises
    WHERE studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
);

-- Política: Usuarios pueden actualizar seguimientos de su studio
DROP POLICY IF EXISTS "studio_reminders_update_studio" ON public.studio_reminders;
CREATE POLICY "studio_reminders_update_studio" ON public.studio_reminders
FOR UPDATE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden eliminar seguimientos de su studio
DROP POLICY IF EXISTS "studio_reminders_delete_studio" ON public.studio_reminders;
CREATE POLICY "studio_reminders_delete_studio" ON public.studio_reminders
FOR DELETE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE public.studio_reminder_subjects IS 
  'Librería de asuntos frecuentes para seguimientos - personalizable por estudio';

COMMENT ON TABLE public.studio_reminders IS 
  'Seguimientos manuales para promesas - relación 1:1 con promises';

COMMENT ON COLUMN public.studio_reminders.promise_id IS 
  'UNIQUE: Solo puede existir un seguimiento activo por promesa';

COMMENT ON COLUMN public.studio_reminders.subject_text IS 
  'Texto del asunto (copia para historial, incluso si se elimina de librería)';
