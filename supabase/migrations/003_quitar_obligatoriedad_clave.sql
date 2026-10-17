-- ================================================================
-- supabase/migrations/003_quitar_obligatoriedad_clave.sql
-- Desactiva la obligatoriedad de cambio de contraseña
-- El usuario ingresa directamente con su cédula como usuario y contraseña
-- ================================================================

-- 1. Cambiar valor por defecto de la columna a FALSE
ALTER TABLE public.perfiles ALTER COLUMN debe_cambiar_clave SET DEFAULT FALSE;

-- 2. Actualizar perfiles existentes para que no tengan cambio de clave obligatorio
UPDATE public.perfiles
SET debe_cambiar_clave = FALSE;
