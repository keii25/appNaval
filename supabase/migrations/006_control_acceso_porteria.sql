-- ================================================================
-- supabase/migrations/006_control_acceso_porteria.sql
-- Control de Portería / Acceso Físico — Verificación y Registro Transaccional
-- Escuela Naval de Cadetes "Almirante Padilla" (ENAP)
-- ================================================================

-- ---------------------------------------------------------------
-- 1. TIPOS ENUMERADOS PARA ACCESO
-- ---------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.tipo_evento_acceso AS ENUM ('INGRESO', 'SALIDA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tipo_sujeto_acceso AS ENUM ('DEPORTISTA', 'VISITANTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extensión de acciones de auditoría si se requiere
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'REGISTRO_INGRESO';
ALTER TYPE public.accion_auditoria ADD VALUE IF NOT EXISTS 'REGISTRO_SALIDA';

-- ---------------------------------------------------------------
-- 2. TABLA TRANSACCIONAL: registros_acceso
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_acceso (
    id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_sujeto    tipo_sujeto_acceso NOT NULL,
    deportista_id  UUID               REFERENCES public.deportistas(id) ON DELETE RESTRICT,
    visitante_id   UUID               REFERENCES public.visitantes(id) ON DELETE RESTRICT,
    tipo_evento    tipo_evento_acceso NOT NULL,
    creado_en      TIMESTAMPTZ        NOT NULL DEFAULT timezone('America/Bogota', now()),
    operador_id    UUID               NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    observaciones  TEXT,

    CONSTRAINT chk_sujeto_acceso CHECK (
        (tipo_sujeto = 'DEPORTISTA' AND deportista_id IS NOT NULL AND visitante_id IS NULL) OR
        (tipo_sujeto = 'VISITANTE'  AND visitante_id IS NOT NULL)
    )
);

-- Índices optimizados para verificación instantánea del último estado
CREATE INDEX IF NOT EXISTS idx_registros_acceso_deportista ON public.registros_acceso (deportista_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_visitante  ON public.registros_acceso (visitante_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_operador   ON public.registros_acceso (operador_id);
CREATE INDEX IF NOT EXISTS idx_registros_acceso_creado_en  ON public.registros_acceso (creado_en DESC);

-- ---------------------------------------------------------------
-- 3. SEGURIDAD Y POLÍTICAS RLS (Inmutabilidad RN-03 & RBAC RF-03)
-- ---------------------------------------------------------------
ALTER TABLE public.registros_acceso ENABLE ROW LEVEL SECURITY;

-- Política de Lectura (SELECT): Administradores, Auxiliares y Operadores de Portería
DROP POLICY IF EXISTS "Permitir lectura registros_acceso a personal autorizado" ON public.registros_acceso;
CREATE POLICY "Permitir lectura registros_acceso a personal autorizado"
ON public.registros_acceso FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
          AND perfiles.rol IN ('admin', 'auxiliar', 'porteria')
          AND perfiles.activo IS NOT FALSE
    )
);

-- Política de Inserción (INSERT): Administradores y Auxiliares de Portería (RF-03)
DROP POLICY IF EXISTS "Permitir insertar registros_acceso a personal autorizado" ON public.registros_acceso;
CREATE POLICY "Permitir insertar registros_acceso a personal autorizado"
ON public.registros_acceso FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = operador_id AND
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
          AND perfiles.rol IN ('admin', 'auxiliar', 'porteria')
          AND perfiles.activo IS NOT FALSE
    )
);

-- INMUTABILIDAD ESTRICTA (RN-03):
-- No existen políticas para UPDATE ni DELETE para perfiles operativos (auxiliar / porteria).
-- Las marcas de tiempo y eventos son inmutables una vez registrados.
