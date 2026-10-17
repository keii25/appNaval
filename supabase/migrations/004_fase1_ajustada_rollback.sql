-- ================================================================
-- supabase/migrations/004_fase1_ajustada_rollback.sql
-- SCRIPT DE REVERSA (ROLLBACK) — FASE 1 AJUSTADA
-- Restaura el esquema previo con deportistas como usuarios Auth
-- ================================================================

-- 1. RESTAURAR COLUMNA perfil_id EN visitantes
ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE;

-- Re-vincular perfil_id con el id del deportista si coincide
UPDATE public.visitantes
   SET perfil_id = deportista_id
 WHERE perfil_id IS NULL AND deportista_id IS NOT NULL;

-- Restaurar restricción única anterior
ALTER TABLE public.visitantes DROP CONSTRAINT IF EXISTS uq_visitante_doc_deportista;
ALTER TABLE public.visitantes DROP CONSTRAINT IF EXISTS uq_visitante_doc_perfil;
ALTER TABLE public.visitantes ADD CONSTRAINT uq_visitante_doc_perfil UNIQUE (perfil_id, numero_documento);

-- Eliminar columnas agregadas a visitantes
ALTER TABLE public.visitantes DROP COLUMN IF EXISTS deportista_id;
ALTER TABLE public.visitantes DROP COLUMN IF EXISTS celular;
ALTER TABLE public.visitantes DROP COLUMN IF EXISTS observaciones;
ALTER TABLE public.visitantes DROP COLUMN IF EXISTS creado_por;

-- 2. RESTAURAR VISTA ORIGINAL visitantes_completo
CREATE OR REPLACE VIEW public.visitantes_completo AS
  SELECT
    v.*,
    p.nombre AS perfil_nombre,
    p.cedula AS perfil_cedula,
    p.unidad AS perfil_unidad
  FROM public.visitantes v
  JOIN public.perfiles p ON p.id = v.perfil_id;

-- 3. RESTAURAR TRIGGER ORIGINAL verificar_limite_visitantes
CREATE OR REPLACE FUNCTION public.verificar_limite_visitantes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  limite INT;
  conteo INT;
BEGIN
  SELECT limite_visitantes INTO limite FROM public.configuracion WHERE id = 1;
  SELECT COUNT(*) INTO conteo
    FROM public.visitantes
   WHERE perfil_id = NEW.perfil_id;

  IF conteo >= limite THEN
    RAISE EXCEPTION 'Límite de visitantes alcanzado (máximo: %)', limite;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limite_visitantes ON public.visitantes;
CREATE TRIGGER trg_limite_visitantes
  BEFORE INSERT ON public.visitantes
  FOR EACH ROW EXECUTE FUNCTION public.verificar_limite_visitantes();

-- 4. ELIMINAR TABLAS NUEVAS
DROP TABLE IF EXISTS public.deportistas CASCADE;
DROP TABLE IF EXISTS public.escuelas CASCADE;

-- 5. LIMPIAR COLUMNAS DE auditoria Y perfiles
ALTER TABLE public.auditoria DROP COLUMN IF EXISTS entidad;
ALTER TABLE public.auditoria DROP COLUMN IF EXISTS entidad_id;
ALTER TABLE public.perfiles  DROP COLUMN IF EXISTS activo;

-- 6. RESTAURAR POLÍTICAS RLS ORIGINALES
DROP POLICY IF EXISTS "deportistas_admin_all" ON public.deportistas;
DROP POLICY IF EXISTS "deportistas_auxiliar_all" ON public.deportistas;
DROP POLICY IF EXISTS "deportistas_porteria_select" ON public.deportistas;

DROP POLICY IF EXISTS "escuelas_admin_all" ON public.escuelas;
DROP POLICY IF EXISTS "escuelas_lectura_staff" ON public.escuelas;

DROP POLICY IF EXISTS "visitantes_admin_all" ON public.visitantes;
DROP POLICY IF EXISTS "visitantes_auxiliar_all" ON public.visitantes;
DROP POLICY IF EXISTS "visitantes_porteria_select" ON public.visitantes;

-- Política original para deportista
CREATE POLICY "deportista_ver_propios_visitantes"
  ON public.visitantes FOR SELECT
  USING (perfil_id = auth.uid());

CREATE POLICY "deportista_crear_visitante"
  ON public.visitantes FOR INSERT
  WITH CHECK (perfil_id = auth.uid());

CREATE POLICY "deportista_editar_visitante"
  ON public.visitantes FOR UPDATE
  USING (perfil_id = auth.uid())
  WITH CHECK (perfil_id = auth.uid());

CREATE POLICY "deportista_eliminar_visitante"
  ON public.visitantes FOR DELETE
  USING (perfil_id = auth.uid());

CREATE POLICY "admin_todos_visitantes"
  ON public.visitantes FOR ALL
  USING (public.obtener_rol() = 'admin');

CREATE POLICY "porteria_ver_visitantes"
  ON public.visitantes FOR SELECT
  USING (public.obtener_rol() = 'porteria');
