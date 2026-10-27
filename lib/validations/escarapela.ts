// lib/validations/escarapela.ts — Validación de unicidad de escarapelas (ENAP)
import { SupabaseClient } from "@supabase/supabase-js";

export interface ValidacionEscarapelaOpciones {
  excludeDeportistaId?: string;
  excludeVisitanteId?: string;
}

export interface ResultadoValidacionEscarapela {
  esValido: boolean;
  mensajeError?: string;
}

/**
 * Valida que un número de escarapela no esté repetido en el sistema.
 * Un número de escarapela asignado no puede repetirse entre deportistas ni visitantes.
 * Soporta números que inicien con 0 (ej: 001, 002) y omite valores vacíos o nulos.
 */
export async function validarEscarapelaUnica(
  supabaseAdmin: SupabaseClient,
  numeroEscarapela: string | null | undefined,
  opciones?: ValidacionEscarapelaOpciones
): Promise<ResultadoValidacionEscarapela> {
  if (!numeroEscarapela) {
    return { esValido: true };
  }

  const escarapelaTrim = numeroEscarapela.trim();
  if (escarapelaTrim === "") {
    return { esValido: true };
  }

  // 1. Validar si ya está asignada a un deportista
  let queryDeportistas = supabaseAdmin
    .from("deportistas")
    .select("id, nombre_completo, cedula")
    .eq("numero_escarapela", escarapelaTrim);

  if (opciones?.excludeDeportistaId) {
    queryDeportistas = queryDeportistas.neq("id", opciones.excludeDeportistaId);
  }

  const { data: depExistente, error: depError } = await queryDeportistas.maybeSingle();

  // Si la columna aún no existe (42703), no bloquear
  if (depError && depError.code !== "42703") {
    console.error("Error al validar escarapela en deportistas:", depError);
  }

  if (depExistente) {
    return {
      esValido: false,
      mensajeError: `El número de escarapela "${escarapelaTrim}" ya se encuentra asignado al deportista ${depExistente.nombre_completo} (C.C. ${depExistente.cedula}). No se permiten escarapelas duplicadas.`,
    };
  }

  // 2. Validar si ya está asignada a un visitante / acompañante
  let queryVisitantes = supabaseAdmin
    .from("visitantes")
    .select("id, nombre, numero_documento")
    .eq("numero_escarapela", escarapelaTrim);

  if (opciones?.excludeVisitanteId) {
    queryVisitantes = queryVisitantes.neq("id", opciones.excludeVisitanteId);
  }

  const { data: visExistente, error: visError } = await queryVisitantes.maybeSingle();

  if (visError && visError.code !== "42703") {
    console.error("Error al validar escarapela en visitantes:", visError);
  }

  if (visExistente) {
    return {
      esValido: false,
      mensajeError: `El número de escarapela "${escarapelaTrim}" ya se encuentra asignado al visitante ${visExistente.nombre} (Doc: ${visExistente.numero_documento}). No se permiten escarapelas duplicadas.`,
    };
  }

  return { esValido: true };
}
