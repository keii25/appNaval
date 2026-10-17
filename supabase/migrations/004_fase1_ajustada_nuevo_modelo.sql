-- ================================================================
-- supabase/migrations/004_fase1_ajustada_nuevo_modelo.sql
-- FASE 1 AJUSTADA: Nuevo Modelo de Roles, Escuelas y Deportistas
-- Escuela Naval de Cadetes "Almirante Padilla" — Inter Escuelas
-- ================================================================

-- ---------------------------------------------------------------
-- 1. EXTENSIÓN DE TIPOS ENUMERADOS
-- ---------------------------------------------------------------
ALTER TYPE public.rol_usuario ADD VALUE IF NOT EXISTS 'auxiliar';

ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'CREAR_DEPORTISTA';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'EDITAR_DEPORTISTA';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'ELIMINAR_DEPORTISTA';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'CREAR_ESCUELA';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'EDITAR_ESCUELA';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'GESTIONAR_AUXILIAR';

-- ---------------------------------------------------------------
-- 2. ACTUALIZACIÓN DE TABLA: perfiles
-- ---------------------------------------------------------------
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------
-- 3. ACTUALIZACIÓN DE TABLA: auditoria
-- ---------------------------------------------------------------
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS entidad TEXT;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS entidad_id TEXT;
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria (entidad, entidad_id);

-- ---------------------------------------------------------------
-- 4. NUEVA TABLA: escuelas (Catálogo oficial gestionado por Admin)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escuelas (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    TEXT        NOT NULL UNIQUE,
  activa    BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escuelas_activa ON public.escuelas (activa);
CREATE INDEX IF NOT EXISTS idx_escuelas_nombre ON public.escuelas (nombre);

-- ---------------------------------------------------------------
-- 5. SEMBRAR ESCUELAS INICIALES Y UNIDADES DE MUESTRA
-- ---------------------------------------------------------------
INSERT INTO public.escuelas (nombre, activa)
VALUES 
  ('Escuela Naval de Cadetes "Almirante Padilla"', TRUE),
  ('Escuela Militar de Aviación "Marco Fidel Suárez"', TRUE),
  ('Escuela Militar de Cadetes "General José María Córdova"', TRUE),
  ('Escuela de Cadetes de Policía "General Santander"', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Si existen unidades previamente usadas en perfiles, incorporarlas al catálogo:
INSERT INTO public.escuelas (nombre, activa)
SELECT DISTINCT TRIM(unidad), TRUE
  FROM public.perfiles
 WHERE rol::text = 'deportista' 
   AND TRIM(unidad) != ''
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------
-- 6. NUEVA TABLA: deportistas (Registros de datos, NO usuarios Auth)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deportistas (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo    TEXT        NOT NULL,
  cedula             TEXT        NOT NULL UNIQUE,
  celular            TEXT        NOT NULL,
  escuela_id         UUID        NOT NULL REFERENCES public.escuelas(id) ON DELETE RESTRICT,
  observaciones      TEXT,
  autorizacion_datos BOOLEAN     NOT NULL DEFAULT FALSE,
  autorizado_por     UUID        REFERENCES public.perfiles(id) ON DELETE SET NULL,
  creado_por         UUID        REFERENCES public.perfiles(id) ON DELETE SET NULL,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validación de cédula (solo números)
  CONSTRAINT chk_deportista_cedula CHECK (cedula ~ '^[0-9]+$'),

  -- Validación de celular (10 dígitos, inicia en 3)
  CONSTRAINT chk_deportista_celular CHECK (celular ~ '^3[0-9]{9}$'),

  -- Observaciones opcionales, máximo 500 caracteres
  CONSTRAINT chk_deportista_observaciones CHECK (observaciones IS NULL OR LENGTH(observaciones) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_deportistas_cedula  ON public.deportistas (cedula);
CREATE INDEX IF NOT EXISTS idx_deportistas_escuela ON public.deportistas (escuela_id);
CREATE INDEX IF NOT EXISTS idx_deportistas_nombre  ON public.deportistas USING gin (nombre_completo gin_trgm_ops);

-- ---------------------------------------------------------------
-- 7. CONVERTIR DATOS EXISTENTES: De perfiles a deportistas
-- ---------------------------------------------------------------
INSERT INTO public.deportistas (
  id,
  nombre_completo,
  cedula,
  celular,
  escuela_id,
  observaciones,
  autorizacion_datos,
  creado_en
)
SELECT 
  p.id,
  p.nombre,
  p.cedula,
  '3001234567' AS celular,
  e.id AS escuela_id,
  'Migrado automáticamente desde perfiles de deportista' AS observaciones,
  p.acepto_datos AS autorizacion_datos,
  p.creado_en
FROM public.perfiles p
JOIN public.escuelas e ON e.nombre = TRIM(p.unidad)
WHERE p.rol::text = 'deportista'
ON CONFLICT (cedula) DO NOTHING;

-- ---------------------------------------------------------------
-- 8. ADAPTAR TABLA: visitantes
-- Reemplazar perfil_id por deportista_id, añadir celular, obs y creado_por
-- ---------------------------------------------------------------
ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS deportista_id UUID REFERENCES public.deportistas(id) ON DELETE CASCADE;
ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS celular TEXT;
ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL;

-- Eliminar vista y políticas antiguas que dependen de perfil_id
DROP VIEW IF EXISTS public.visitantes_completo CASCADE;
DROP POLICY IF EXISTS "deportista_ver_propios_visitantes" ON public.visitantes;
DROP POLICY IF EXISTS "deportista_crear_visitante" ON public.visitantes;
DROP POLICY IF EXISTS "deportista_editar_visitante" ON public.visitantes;
DROP POLICY IF EXISTS "deportista_eliminar_visitante" ON public.visitantes;
DROP POLICY IF EXISTS "admin_todos_visitantes" ON public.visitantes;
DROP POLICY IF EXISTS "porteria_ver_visitantes" ON public.visitantes;

-- Migrar referencias existentes si hubiesen
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitantes' AND column_name = 'perfil_id') THEN
    UPDATE public.visitantes
       SET deportista_id = perfil_id
     WHERE deportista_id IS NULL AND perfil_id IS NOT NULL;

    ALTER TABLE public.visitantes DROP CONSTRAINT IF EXISTS uq_visitante_doc_perfil CASCADE;
    ALTER TABLE public.visitantes DROP CONSTRAINT IF EXISTS visitantes_perfil_id_fkey CASCADE;
    ALTER TABLE public.visitantes DROP COLUMN IF EXISTS perfil_id CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.visitantes ALTER COLUMN deportista_id SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE public.visitantes DROP CONSTRAINT IF EXISTS uq_visitante_doc_deportista;
ALTER TABLE public.visitantes ADD CONSTRAINT uq_visitante_doc_deportista UNIQUE (deportista_id, numero_documento);

CREATE INDEX IF NOT EXISTS idx_visitantes_deportista ON public.visitantes (deportista_id);

-- ---------------------------------------------------------------
-- 9. LIMPIEZA DE perfiles: Retirar registros antiguos de deportistas
-- (Ahora solo residen las cuentas operativas: admin, auxiliar, porteria)
-- ---------------------------------------------------------------
DELETE FROM public.perfiles WHERE rol::text = 'deportista';

-- ---------------------------------------------------------------
-- 10. REEMPLAZAR TRIGGERS Y FUNCIONES
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_limite_visitantes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  limite INT;
  conteo INT;
BEGIN
  SELECT limite_visitantes INTO limite FROM public.configuracion WHERE id = 1;
  SELECT COUNT(*) INTO conteo
    FROM public.visitantes
   WHERE deportista_id = NEW.deportista_id;

  IF conteo >= limite THEN
    RAISE EXCEPTION 'Límite de visitantes alcanzado para este deportista (máximo: %)', limite;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limite_visitantes ON public.visitantes;
CREATE TRIGGER trg_limite_visitantes
  BEFORE INSERT ON public.visitantes
  FOR EACH ROW EXECUTE FUNCTION public.verificar_limite_visitantes();

-- ---------------------------------------------------------------
-- 11. RECREAR VISTA: visitantes_completo
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.visitantes_completo AS
  SELECT
    v.*,
    d.nombre_completo AS deportista_nombre,
    d.cedula          AS deportista_cedula,
    e.nombre          AS deportista_escuela,
    e.id              AS escuela_id
  FROM public.visitantes v
  JOIN public.deportistas d ON d.id = v.deportista_id
  JOIN public.escuelas e    ON e.id = d.escuela_id;

-- ---------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------
ALTER TABLE public.escuelas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deportistas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria      ENABLE ROW LEVEL SECURITY;

-- Función auxiliar: obtener rol del usuario activo
CREATE OR REPLACE FUNCTION public.obtener_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol::TEXT
    FROM public.perfiles
   WHERE id = auth.uid()
     AND activo = TRUE
   LIMIT 1;
$$;

-- Políticas: escuelas
DROP POLICY IF EXISTS "escuelas_admin_all" ON public.escuelas;
CREATE POLICY "escuelas_admin_all"
  ON public.escuelas FOR ALL
  USING (public.obtener_rol() = 'admin');

DROP POLICY IF EXISTS "escuelas_lectura_staff" ON public.escuelas;
CREATE POLICY "escuelas_lectura_staff"
  ON public.escuelas FOR SELECT
  USING (public.obtener_rol() IN ('auxiliar', 'porteria'));

-- Políticas: deportistas
DROP POLICY IF EXISTS "deportistas_admin_all" ON public.deportistas;
CREATE POLICY "deportistas_admin_all"
  ON public.deportistas FOR ALL
  USING (public.obtener_rol() = 'admin');

DROP POLICY IF EXISTS "deportistas_auxiliar_all" ON public.deportistas;
CREATE POLICY "deportistas_auxiliar_all"
  ON public.deportistas FOR ALL
  USING (public.obtener_rol() = 'auxiliar');

DROP POLICY IF EXISTS "deportistas_porteria_select" ON public.deportistas;
CREATE POLICY "deportistas_porteria_select"
  ON public.deportistas FOR SELECT
  USING (public.obtener_rol() = 'porteria');

-- Políticas: visitantes
DROP POLICY IF EXISTS "visitantes_admin_all" ON public.visitantes;
CREATE POLICY "visitantes_admin_all"
  ON public.visitantes FOR ALL
  USING (public.obtener_rol() = 'admin');

DROP POLICY IF EXISTS "visitantes_auxiliar_all" ON public.visitantes;
CREATE POLICY "visitantes_auxiliar_all"
  ON public.visitantes FOR ALL
  USING (public.obtener_rol() = 'auxiliar');

DROP POLICY IF EXISTS "visitantes_porteria_select" ON public.visitantes;
CREATE POLICY "visitantes_porteria_select"
  ON public.visitantes FOR SELECT
  USING (public.obtener_rol() = 'porteria');

-- Políticas: configuracion (Solo Admin)
DROP POLICY IF EXISTS "configuracion_admin_all" ON public.configuracion;
CREATE POLICY "configuracion_admin_all"
  ON public.configuracion FOR ALL
  USING (public.obtener_rol() = 'admin');

-- Políticas: auditoria (Lectura solo Admin, Inserción staff autenticado)
DROP POLICY IF EXISTS "auditoria_admin_select" ON public.auditoria;
CREATE POLICY "auditoria_admin_select"
  ON public.auditoria FOR SELECT
  USING (public.obtener_rol() = 'admin');

DROP POLICY IF EXISTS "auditoria_insert_staff" ON public.auditoria;
CREATE POLICY "auditoria_insert_staff"
  ON public.auditoria FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Políticas: perfiles
DROP POLICY IF EXISTS "perfiles_admin_all" ON public.perfiles;
CREATE POLICY "perfiles_admin_all"
  ON public.perfiles FOR ALL
  USING (public.obtener_rol() = 'admin');

DROP POLICY IF EXISTS "perfiles_propio_select" ON public.perfiles;
CREATE POLICY "perfiles_propio_select"
  ON public.perfiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "perfiles_propio_update" ON public.perfiles;
CREATE POLICY "perfiles_propio_update"
  ON public.perfiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------
-- 13. PERMISOS EXPLÍCITOS PARA authenticated
-- ---------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escuelas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deportistas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitantes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfiles TO authenticated;
GRANT SELECT, UPDATE ON public.configuracion TO authenticated;
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT SELECT ON public.visitantes_completo TO authenticated;
