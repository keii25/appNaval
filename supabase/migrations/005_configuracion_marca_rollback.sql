-- ============================================================
-- 005_configuracion_marca_rollback.sql
-- Script de Reversa: Eliminar configuracion_marca y bucket marca
-- ============================================================

-- 1. Eliminar políticas de Storage
DROP POLICY IF EXISTS "Solo admin elimina objetos bucket marca" ON storage.objects;
DROP POLICY IF EXISTS "Solo admin modifica objetos bucket marca" ON storage.objects;
DROP POLICY IF EXISTS "Solo admin sube objetos bucket marca" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica bucket marca" ON storage.objects;

-- 2. Eliminar objetos y bucket de storage "marca"
DELETE FROM storage.objects WHERE bucket_id = 'marca';
DELETE FROM storage.buckets WHERE id = 'marca';

-- 3. Eliminar políticas de la tabla configuracion_marca
DROP POLICY IF EXISTS "Solo admin actualiza configuracion_marca" ON public.configuracion_marca;
DROP POLICY IF EXISTS "Lectura publica configuracion_marca" ON public.configuracion_marca;

-- 4. Eliminar tabla configuracion_marca
DROP TABLE IF EXISTS public.configuracion_marca CASCADE;
