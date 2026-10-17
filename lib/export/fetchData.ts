// lib/export/fetchData.ts — Consulta centralizada de datos para exportaciones oficiales
import { createAdminClient } from "@/lib/supabase/admin";
import type { VisitanteExportItem } from "./excel";

export interface FiltrosExportacion {
  escuela_id?: string | null;
  estado?: string | null;
  vehiculo?: string | null;
}

export async function obtenerDatosParaExportar(filtros: FiltrosExportacion): Promise<{
  visitantes: VisitanteExportItem[];
  nombreEscuelaFiltro?: string;
  tituloFiltro: string;
}> {
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from("visitantes")
    .select(
      `
      id,
      deportista_id,
      nombre,
      parentesco,
      tipo_documento,
      numero_documento,
      tiene_vehiculo,
      placa,
      modelo,
      fecha_desde,
      fecha_hasta,
      estado,
      creado_en,
      deportista:deportistas!visitantes_deportista_id_fkey (
        id,
        nombre_completo,
        cedula,
        escuela_id,
        escuela:escuelas!deportistas_escuela_id_fkey (
          id,
          nombre
        )
      )
    `
    )
    .order("creado_en", { ascending: false });

  if (filtros.estado && ["Aprobado", "Pendiente", "Rechazado"].includes(filtros.estado)) {
    query = query.eq("estado", filtros.estado);
  }

  if (filtros.vehiculo === "si") {
    query = query.eq("tiene_vehiculo", true);
  } else if (filtros.vehiculo === "no") {
    query = query.eq("tiene_vehiculo", false);
  }

  const { data: rawVisitantes, error } = await query;
  if (error) {
    throw new Error("Error consultando base de datos para exportación: " + error.message);
  }

  // Mapear y normalizar
  let lista: VisitanteExportItem[] = (rawVisitantes || []).map((v: any) => {
    const dep = Array.isArray(v.deportista) ? v.deportista[0] : v.deportista;
    const esc = dep?.escuela;
    const escuelaObj = Array.isArray(esc) ? esc[0] : esc;

    return {
      id: v.id,
      nombre: v.nombre,
      parentesco: v.parentesco,
      tipo_documento: v.tipo_documento,
      numero_documento: v.numero_documento,
      tiene_vehiculo: !!v.tiene_vehiculo,
      placa: v.placa || null,
      modelo: v.modelo || null,
      fecha_desde: v.fecha_desde,
      fecha_hasta: v.fecha_hasta,
      estado: v.estado,
      creado_en: v.creado_en,
      deportista_nombre: dep?.nombre_completo || "Sin asignar",
      deportista_cedula: dep?.cedula || "—",
      escuela_id: dep?.escuela_id || "",
      escuela_nombre: escuelaObj?.nombre || "Sin Escuela",
    };
  });

  let nombreEscuelaFiltro: string | undefined;

  // Filtrado en memoria por escuela si aplica
  if (filtros.escuela_id && filtros.escuela_id !== "todas") {
    lista = lista.filter((v) => v.escuela_id === filtros.escuela_id);
    const primera = lista[0];
    if (primera) {
      nombreEscuelaFiltro = primera.escuela_nombre;
    } else {
      // Buscar nombre de la escuela si no hay visitantes
      const { data: escData } = await supabaseAdmin
        .from("escuelas")
        .select("nombre")
        .eq("id", filtros.escuela_id)
        .single();
      if (escData) nombreEscuelaFiltro = escData.nombre;
    }
  }

  let tituloFiltro = "Consolidado General";
  if (nombreEscuelaFiltro) {
    tituloFiltro = nombreEscuelaFiltro;
  }
  if (filtros.estado && filtros.estado !== "todos") {
    tituloFiltro += ` — Estado: ${filtros.estado}`;
  }
  if (filtros.vehiculo === "si") {
    tituloFiltro += " (Solo Vehículos)";
  }

  return {
    visitantes: lista,
    nombreEscuelaFiltro,
    tituloFiltro,
  };
}
