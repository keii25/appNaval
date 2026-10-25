-- ===============================================================
-- MIGRACIÓN 007: Cascada en Llaves Foráneas de Registros de Acceso
-- Corrige el error "violates foreign key constraint registros_acceso_deportista_id_fkey"
-- permitiendo eliminar deportistas y visitantes eliminando automáticamente
-- su historial de acceso en portería.
-- ===============================================================

DO $$ BEGIN
    -- 1. Actualizar llave foránea de deportista_id a ON DELETE CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'registros_acceso_deportista_id_fkey'
        AND table_name = 'registros_acceso'
    ) THEN
        ALTER TABLE public.registros_acceso
            DROP CONSTRAINT registros_acceso_deportista_id_fkey;
    END IF;

    ALTER TABLE public.registros_acceso
        ADD CONSTRAINT registros_acceso_deportista_id_fkey
        FOREIGN KEY (deportista_id)
        REFERENCES public.deportistas(id)
        ON DELETE CASCADE;

    -- 2. Actualizar llave foránea de visitante_id a ON DELETE CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'registros_acceso_visitante_id_fkey'
        AND table_name = 'registros_acceso'
    ) THEN
        ALTER TABLE public.registros_acceso
            DROP CONSTRAINT registros_acceso_visitante_id_fkey;
    END IF;

    ALTER TABLE public.registros_acceso
        ADD CONSTRAINT registros_acceso_visitante_id_fkey
        FOREIGN KEY (visitante_id)
        REFERENCES public.visitantes(id)
        ON DELETE CASCADE;
END $$;
