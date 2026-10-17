-- ================================================================
-- supabase/migrations/001_schema_inicial.sql
-- Escuela Naval de Cadetes "Almirante Padilla" — Inter Escuelas
-- Control de Ingreso de Visitantes
-- ================================================================

-- ---------------------------------------------------------------
-- 1. EXTENSIONES
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- para búsqueda full-text

-- ---------------------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE rol_usuario    AS ENUM ('deportista', 'admin', 'porteria');
  CREATE TYPE parentesco_tipo AS ENUM ('Familiar', 'Amigo');
  CREATE TYPE tipo_doc       AS ENUM ('CC', 'TI', 'CE', 'Pasaporte');
  CREATE TYPE estado_visitante AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
  CREATE TYPE accion_auditoria AS ENUM (
    'CREAR_VISITANTE',
    'EDITAR_VISITANTE',
    'ELIMINAR_VISITANTE',
    'CAMBIAR_ESTADO',
    'IMPORTAR_DEPORTISTAS',
    'CAMBIAR_CONFIGURACION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- 3. TABLA: perfiles
-- Vinculada 1-a-1 con auth.users
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  id                UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre            TEXT         NOT NULL,
  cedula            TEXT         NOT NULL UNIQUE,
  unidad            TEXT         NOT NULL DEFAULT '',
  rol               rol_usuario  NOT NULL DEFAULT 'deportista',
  debe_cambiar_clave BOOLEAN     NOT NULL DEFAULT FALSE,
  acepto_datos      BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfiles_cedula  ON public.perfiles (cedula);
CREATE INDEX IF NOT EXISTS idx_perfiles_unidad  ON public.perfiles (unidad);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol     ON public.perfiles (rol);

-- ---------------------------------------------------------------
-- 4. TABLA: configuracion (singleton, id siempre = 1)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion (
  id                 INT          PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  limite_visitantes  INT          NOT NULL DEFAULT 5,
  fecha_limite       DATE,
  actualizado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Insertar fila inicial si no existe
INSERT INTO public.configuracion (id, limite_visitantes, fecha_limite)
VALUES (1, 5, NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 5. TABLA: visitantes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visitantes (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id        UUID            NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  nombre           TEXT            NOT NULL,
  parentesco       parentesco_tipo NOT NULL,
  tipo_documento   tipo_doc        NOT NULL,
  numero_documento TEXT            NOT NULL,
  tiene_vehiculo   BOOLEAN         NOT NULL DEFAULT FALSE,
  placa            TEXT,
  modelo           TEXT,
  fecha_desde      DATE            NOT NULL,
  fecha_hasta      DATE            NOT NULL,
  estado           estado_visitante NOT NULL DEFAULT 'Pendiente',
  creado_en        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Un número de documento no puede repetirse dentro del mismo deportista
  CONSTRAINT uq_visitante_doc_perfil UNIQUE (perfil_id, numero_documento),

  -- fecha_hasta debe ser >= fecha_desde
  CONSTRAINT chk_fechas CHECK (fecha_hasta >= fecha_desde),

  -- placa y modelo obligatorios si tiene_vehiculo = true
  CONSTRAINT chk_vehiculo CHECK (
    NOT tiene_vehiculo OR (placa IS NOT NULL AND modelo IS NOT NULL)
  ),

  -- Validación de formato de placa colombiana: ABC123 o ABC12D
  CONSTRAINT chk_placa CHECK (
    placa IS NULL OR placa ~ '^[A-Z]{3}[0-9]{2}[A-Z0-9]$'
  )
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_visitantes_perfil      ON public.visitantes (perfil_id);
CREATE INDEX IF NOT EXISTS idx_visitantes_estado      ON public.visitantes (estado);
CREATE INDEX IF NOT EXISTS idx_visitantes_documento   ON public.visitantes (numero_documento);
CREATE INDEX IF NOT EXISTS idx_visitantes_placa       ON public.visitantes (placa);
CREATE INDEX IF NOT EXISTS idx_visitantes_fecha_desde ON public.visitantes (fecha_desde);
CREATE INDEX IF NOT EXISTS idx_visitantes_vehiculo    ON public.visitantes (tiene_vehiculo);

-- Índice de búsqueda por texto en nombre de visitante
CREATE INDEX IF NOT EXISTS idx_visitantes_nombre_trgm
  ON public.visitantes USING GIN (nombre gin_trgm_ops);

-- ---------------------------------------------------------------
-- 6. TABLA: auditoria
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID             NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accion     accion_auditoria NOT NULL,
  detalle    JSONB            NOT NULL DEFAULT '{}',
  fecha      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha   ON public.auditoria (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion  ON public.auditoria (accion);

-- ---------------------------------------------------------------
-- 7. FUNCIONES Y TRIGGERS
-- ---------------------------------------------------------------

-- 7.1 Trigger: actualizar actualizado_en automáticamente en visitantes
CREATE OR REPLACE FUNCTION public.set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visitantes_actualizado_en ON public.visitantes;
CREATE TRIGGER trg_visitantes_actualizado_en
  BEFORE UPDATE ON public.visitantes
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();

-- 7.2 Trigger: actualizar configuracion.actualizado_en
CREATE OR REPLACE FUNCTION public.set_config_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracion_actualizado_en ON public.configuracion;
CREATE TRIGGER trg_configuracion_actualizado_en
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW EXECUTE FUNCTION public.set_config_actualizado_en();

-- 7.3 Función: verificar límite de visitantes antes de insertar
CREATE OR REPLACE FUNCTION public.verificar_limite_visitantes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  limite    INT;
  conteo    INT;
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

-- 7.4 Función: verificar fecha límite de registro
CREATE OR REPLACE FUNCTION public.verificar_fecha_limite()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  fecha_lim DATE;
BEGIN
  SELECT fecha_limite INTO fecha_lim FROM public.configuracion WHERE id = 1;

  IF fecha_lim IS NOT NULL AND CURRENT_DATE > fecha_lim THEN
    RAISE EXCEPTION 'El período de registro de visitantes ha cerrado (fecha límite: %)', fecha_lim;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fecha_limite_registro ON public.visitantes;
CREATE TRIGGER trg_fecha_limite_registro
  BEFORE INSERT ON public.visitantes
  FOR EACH ROW EXECUTE FUNCTION public.verificar_fecha_limite();

-- ---------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------

-- Habilitar RLS en todas las tablas relevantes
ALTER TABLE public.perfiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria      ENABLE ROW LEVEL SECURITY;

-- ---- Función auxiliar: obtener rol del usuario actual ----
CREATE OR REPLACE FUNCTION public.obtener_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol::TEXT
    FROM public.perfiles
   WHERE id = auth.uid()
   LIMIT 1;
$$;

-- =========================================================
-- POLÍTICAS: perfiles
-- =========================================================

-- Deportista: solo puede leer y actualizar su propio perfil
DROP POLICY IF EXISTS "deportista_ver_propio_perfil" ON public.perfiles;
CREATE POLICY "deportista_ver_propio_perfil"
  ON public.perfiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "deportista_actualizar_propio_perfil" ON public.perfiles;
CREATE POLICY "deportista_actualizar_propio_perfil"
  ON public.perfiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin: puede ver y modificar todos los perfiles
DROP POLICY IF EXISTS "admin_todos_perfiles" ON public.perfiles;
CREATE POLICY "admin_todos_perfiles"
  ON public.perfiles FOR ALL
  USING (public.obtener_rol() = 'admin');

-- Portería: solo lectura de todos los perfiles
DROP POLICY IF EXISTS "porteria_ver_perfiles" ON public.perfiles;
CREATE POLICY "porteria_ver_perfiles"
  ON public.perfiles FOR SELECT
  USING (public.obtener_rol() = 'porteria');

-- =========================================================
-- POLÍTICAS: visitantes
-- =========================================================

-- Deportista: solo sus visitantes
DROP POLICY IF EXISTS "deportista_ver_propios_visitantes" ON public.visitantes;
CREATE POLICY "deportista_ver_propios_visitantes"
  ON public.visitantes FOR SELECT
  USING (perfil_id = auth.uid());

DROP POLICY IF EXISTS "deportista_crear_visitante" ON public.visitantes;
CREATE POLICY "deportista_crear_visitante"
  ON public.visitantes FOR INSERT
  WITH CHECK (perfil_id = auth.uid());

DROP POLICY IF EXISTS "deportista_editar_visitante" ON public.visitantes;
CREATE POLICY "deportista_editar_visitante"
  ON public.visitantes FOR UPDATE
  USING (perfil_id = auth.uid())
  WITH CHECK (perfil_id = auth.uid());

DROP POLICY IF EXISTS "deportista_eliminar_visitante" ON public.visitantes;
CREATE POLICY "deportista_eliminar_visitante"
  ON public.visitantes FOR DELETE
  USING (perfil_id = auth.uid());

-- Admin: acceso total a visitantes
DROP POLICY IF EXISTS "admin_todos_visitantes" ON public.visitantes;
CREATE POLICY "admin_todos_visitantes"
  ON public.visitantes FOR ALL
  USING (public.obtener_rol() = 'admin');

-- Portería: solo lectura de todos los visitantes
DROP POLICY IF EXISTS "porteria_ver_visitantes" ON public.visitantes;
CREATE POLICY "porteria_ver_visitantes"
  ON public.visitantes FOR SELECT
  USING (public.obtener_rol() = 'porteria');

-- =========================================================
-- POLÍTICAS: configuracion
-- =========================================================

-- Todos los autenticados pueden leer la configuración
DROP POLICY IF EXISTS "todos_leen_configuracion" ON public.configuracion;
CREATE POLICY "todos_leen_configuracion"
  ON public.configuracion FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo admin puede modificar la configuración
DROP POLICY IF EXISTS "admin_modifica_configuracion" ON public.configuracion;
CREATE POLICY "admin_modifica_configuracion"
  ON public.configuracion FOR ALL
  USING (public.obtener_rol() = 'admin')
  WITH CHECK (public.obtener_rol() = 'admin');

-- =========================================================
-- POLÍTICAS: auditoria
-- =========================================================

-- Solo admin puede leer la auditoría
DROP POLICY IF EXISTS "admin_ver_auditoria" ON public.auditoria;
CREATE POLICY "admin_ver_auditoria"
  ON public.auditoria FOR SELECT
  USING (public.obtener_rol() = 'admin');

-- Cualquier usuario autenticado puede insertar su propia auditoría
DROP POLICY IF EXISTS "usuarios_insertar_auditoria" ON public.auditoria;
CREATE POLICY "usuarios_insertar_auditoria"
  ON public.auditoria FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ---------------------------------------------------------------
-- 9. VISTAS PARA ADMIN Y PORTERÍA
-- ---------------------------------------------------------------

CREATE OR REPLACE VIEW public.visitantes_completo AS
  SELECT
    v.*,
    p.nombre  AS perfil_nombre,
    p.cedula  AS perfil_cedula,
    p.unidad  AS perfil_unidad
  FROM public.visitantes v
  JOIN public.perfiles p ON p.id = v.perfil_id;

-- La vista hereda la seguridad de la tabla base; no necesita RLS propio

-- ---------------------------------------------------------------
-- 10. GRANT de permisos al rol authenticated
-- ---------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfiles      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitantes    TO authenticated;
GRANT SELECT, UPDATE                 ON public.configuracion TO authenticated;
GRANT SELECT, INSERT                 ON public.auditoria     TO authenticated;
GRANT SELECT ON public.visitantes_completo                   TO authenticated;
