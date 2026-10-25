-- ================================================================
-- supabase/migrations/006_control_acceso_porteria_rollback.sql
-- Rollback de la migración 006: Control de Portería / Acceso Físico
-- ================================================================

DROP TABLE IF EXISTS public.registros_acceso CASCADE;
DROP TYPE IF EXISTS public.tipo_evento_acceso;
DROP TYPE IF EXISTS public.tipo_sujeto_acceso;
