-- ================================================================
-- supabase/migrations/008_numero_escarapela.sql
-- Campo opcional "numero_escarapela" para Deportistas y Visitantes
-- Soporta códigos que inician con 0 (ej: 001, 002)
-- Escuela Naval de Cadetes "Almirante Padilla" (ENAP)
-- ================================================================

-- 1. Agregar campo numero_escarapela a deportistas
ALTER TABLE public.deportistas 
ADD COLUMN IF NOT EXISTS numero_escarapela TEXT;

-- 2. Agregar campo numero_escarapela a visitantes
ALTER TABLE public.visitantes 
ADD COLUMN IF NOT EXISTS numero_escarapela TEXT;

-- 3. Índices UNIQUE para garantizar que nunca se repita una escarapela asignada
CREATE UNIQUE INDEX IF NOT EXISTS idx_deportistas_escarapela 
ON public.deportistas (numero_escarapela) 
WHERE numero_escarapela IS NOT NULL AND numero_escarapela <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitantes_escarapela 
ON public.visitantes (numero_escarapela) 
WHERE numero_escarapela IS NOT NULL AND numero_escarapela <> '';
