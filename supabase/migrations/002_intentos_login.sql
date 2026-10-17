-- ================================================================
-- supabase/migrations/002_intentos_login.sql
-- Rate limiting y bloqueo temporal de intentos de login
-- ================================================================

-- Tabla para registrar intentos de login fallidos
CREATE TABLE IF NOT EXISTS public.intentos_login (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula      TEXT        NOT NULL,
  ip          TEXT        NOT NULL DEFAULT '',
  exitoso     BOOLEAN     NOT NULL DEFAULT FALSE,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intentos_login_cedula ON public.intentos_login (cedula, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_login_ip     ON public.intentos_login (ip, fecha DESC);

-- No requiere RLS: solo se accede desde el servidor con service_role
-- Pero la habilitamos para mayor seguridad y denegamos todo al rol authenticated
ALTER TABLE public.intentos_login ENABLE ROW LEVEL SECURITY;

-- No hay políticas para authenticated = acceso denegado por defecto
-- Solo se manipula desde el servidor con la clave service_role
