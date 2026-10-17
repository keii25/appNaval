-- ============================================================
-- 005_configuracion_marca.sql
-- Migración: Configuración de Marca y Textos Dinámicos
-- ============================================================
-- REGLAS DE PRODUCCIÓN:
-- 1. Cambio aditivo (no altera tablas, columnas ni datos existentes).
-- 2. Valores por defecto EXACTOS a los textos y logos actuales.
-- 3. Feature flag apagado por defecto (flag_marca_dinamica = false).
-- ============================================================

-- 1. TABLA: configuracion_marca (Singleton id=1)
CREATE TABLE IF NOT EXISTS public.configuracion_marca (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  
  -- Identidad
  nombre_actividad text NOT NULL DEFAULT 'XXX Juegos Interescuelas 2026',
  nombre_corto varchar(20) NOT NULL DEFAULT 'Inter Escuelas 2026',
  lema text NOT NULL DEFAULT '¡Bienvenidos a la fiesta deportiva naval!',
  organizacion text NOT NULL DEFAULT 'Escuela Naval de Cadetes "Almirante Padilla"',
  lugar text NOT NULL DEFAULT 'Cartagena de Indias',

  -- Logos e Iconos
  logo_claro_url text NOT NULL DEFAULT '/images/logo-interescuelas-2026.png',
  logo_oscuro_url text DEFAULT NULL,
  icono_url text NOT NULL DEFAULT '/images/logo-interescuelas-2026.png',
  mascota_url text DEFAULT '/images/mascota-interescuelas-2026.png',

  -- Estilo y Paleta
  color_acento varchar(9) NOT NULL DEFAULT '#0A2540',

  -- Textos específicos de Pantalla de Login (JSONB)
  textos_login jsonb NOT NULL DEFAULT '{
    "badge": "XXX Juegos Interescuelas 2026",
    "titulo_hero": "Escuela Naval de Cadetes",
    "subtitulo_hero": "“Almirante Padilla” • Cartagena de Indias",
    "lema": "¡Bienvenidos a la fiesta deportiva naval!",
    "seguridad": "Control Seguro y Acreditación",
    "ubicacion_pie": "Cartagena 2026",
    "titulo_formulario": "Control de Ingreso",
    "subtitulo_formulario": "Plataforma Oficial de Acreditación y Seguridad",
    "label_usuario": "Cédula de Identidad",
    "placeholder_usuario": "Ej. 1098765432",
    "label_password": "Contraseña",
    "ayuda_password": "Tu número de cédula",
    "placeholder_password": "••••••••",
    "boton_login": "Iniciar Sesión",
    "aviso_legal_corto": "Autorización obligatoria de datos personales (Ley 1581 de 2012) para ingreso y acreditación.",
    "pie_pagina": "© Escuela Naval de Cadetes “Almirante Padilla” — Cartagena de Indias 2026"
  }'::jsonb,

  -- Aviso Legal de Tratamiento de Datos (Ley 1581 de 2012)
  aviso_datos text NOT NULL DEFAULT 'En cumplimiento de la Ley 1581 de 2012, su Decreto Reglamentario 1377 de 2013 y demás normas concordantes, informamos que la Escuela Naval de Cadetes “Almirante Padilla” actuará como Responsable del Tratamiento de los datos personales suministrados a través de este sistema.

Los datos recolectados (nombres, cédula, teléfono, entidad de procedencia y datos de vehículos) serán utilizados exclusivamente para:
1. Gestionar el registro y acreditación de visitantes (familiares y amigos) de los deportistas participantes en los Juegos Inter Escuelas.
2. Garantizar la seguridad física y el orden dentro de la jurisdicción de la Escuela Naval.
3. Verificar el cumplimiento de cupos máximos de acompañantes y fechas autorizadas de ingreso.

Sus datos no serán transferidos a terceros con fines comerciales ni divulgados fuera del marco de la operación de seguridad del evento. Como titular, usted tiene derecho a conocer, actualizar y rectificar sus datos personales.',
  aviso_actualizado_en timestamptz NOT NULL DEFAULT now(),

  -- Vocabulario dinámico (participante, entidad, visitante, parentescos)
  vocabulario jsonb NOT NULL DEFAULT '{
    "participante": {
      "singular": "deportista",
      "plural": "deportistas",
      "genero": "m",
      "titulo": "Deportista",
      "titulo_plural": "Deportistas",
      "sinonimo": "atleta",
      "sinonimo_plural": "atletas"
    },
    "entidad": {
      "singular": "escuela",
      "plural": "escuelas",
      "genero": "f",
      "titulo": "Escuela",
      "titulo_plural": "Escuelas",
      "sinonimo": "institución militar",
      "sinonimo_plural": "instituciones"
    },
    "visitante": {
      "singular": "visitante",
      "plural": "visitantes",
      "genero": "m",
      "titulo": "Visitante",
      "titulo_plural": "Visitantes",
      "sinonimo": "acompañante",
      "sinonimo_plural": "acompañantes"
    },
    "parentescos": ["Familiar", "Amigo"]
  }'::jsonb,

  -- Control y Auditoría
  flag_marca_dinamica boolean NOT NULL DEFAULT false,
  actualizado_por uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 2. INSERTAR FILA INICIAL (Singleton id=1 con flag apagado)
INSERT INTO public.configuracion_marca (
  id,
  nombre_actividad,
  nombre_corto,
  lema,
  organizacion,
  lugar,
  logo_claro_url,
  logo_oscuro_url,
  icono_url,
  mascota_url,
  color_acento,
  flag_marca_dinamica
) VALUES (
  1,
  'XXX Juegos Interescuelas 2026',
  'Inter Escuelas 2026',
  '¡Bienvenidos a la fiesta deportiva naval!',
  'Escuela Naval de Cadetes "Almirante Padilla"',
  'Cartagena de Indias',
  '/images/logo-interescuelas-2026.png',
  NULL,
  '/images/logo-interescuelas-2026.png',
  '/images/mascota-interescuelas-2026.png',
  '#0A2540',
  false
)
ON CONFLICT (id) DO NOTHING;

-- 3. SEGURIDAD: Row Level Security (RLS)
ALTER TABLE public.configuracion_marca ENABLE ROW LEVEL SECURITY;

-- Política de Lectura Pública: Anon y Authenticated pueden leer (necesario para Login sin sesión)
DROP POLICY IF EXISTS "Lectura publica configuracion_marca" ON public.configuracion_marca;
CREATE POLICY "Lectura publica configuracion_marca"
  ON public.configuracion_marca
  FOR SELECT
  USING (true);

-- Política de Escritura: Solo administradores autenticados pueden actualizar
DROP POLICY IF EXISTS "Solo admin actualiza configuracion_marca" ON public.configuracion_marca;
CREATE POLICY "Solo admin actualiza configuracion_marca"
  ON public.configuracion_marca
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

-- 4. BUCKET DE STORAGE: "marca" (Público para logos y assets del evento)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marca',
  'marca',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Políticas de Storage para el bucket "marca"
DROP POLICY IF EXISTS "Lectura publica bucket marca" ON storage.objects;
CREATE POLICY "Lectura publica bucket marca"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'marca');

DROP POLICY IF EXISTS "Solo admin sube objetos bucket marca" ON storage.objects;
CREATE POLICY "Solo admin sube objetos bucket marca"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'marca' AND
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admin modifica objetos bucket marca" ON storage.objects;
CREATE POLICY "Solo admin modifica objetos bucket marca"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'marca' AND
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admin elimina objetos bucket marca" ON storage.objects;
CREATE POLICY "Solo admin elimina objetos bucket marca"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'marca' AND
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );
