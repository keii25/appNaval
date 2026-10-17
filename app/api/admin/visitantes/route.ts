// app/api/admin/visitantes/route.ts — Listar y filtrar visitantes (Admin)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoVisitante } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Verificar rol admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfil?.rol !== "admin") {
      return NextResponse.json(
        { error: "Acceso restringido a administradores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const estado = searchParams.get("estado")?.trim();
    const escuelaId = searchParams.get("escuela_id")?.trim();
    const vehiculo = searchParams.get("vehiculo")?.trim();

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
          celular,
          escuela_id,
          escuela:escuelas!deportistas_escuela_id_fkey (
            id,
            nombre
          )
        )
      `
      )
      .order("creado_en", { ascending: false });

    if (estado && ["Pendiente", "Aprobado", "Rechazado"].includes(estado)) {
      query = query.eq("estado", estado);
    }

    if (vehiculo === "si") {
      query = query.eq("tiene_vehiculo", true);
    } else if (vehiculo === "no") {
      query = query.eq("tiene_vehiculo", false);
    }

    const { data: visitantes, error: queryError } = await query;

    if (queryError) {
      console.error("Error consultando visitantes admin:", queryError);
      return NextResponse.json(
        { error: "Error al consultar los visitantes: " + queryError.message },
        { status: 500 }
      );
    }

    // Mapear y aplanar estructura
    let lista = (visitantes || []).map((v: any) => {
      const dep = Array.isArray(v.deportista) ? v.deportista[0] : v.deportista;
      const esc = dep?.escuela;
      const escuelaObj = Array.isArray(esc) ? esc[0] : esc;

      return {
        id: v.id,
        deportista_id: v.deportista_id,
        nombre: v.nombre,
        parentesco: v.parentesco,
        tipo_documento: v.tipo_documento,
        numero_documento: v.numero_documento,
        tiene_vehiculo: v.tiene_vehiculo,
        placa: v.placa,
        modelo: v.modelo,
        fecha_desde: v.fecha_desde,
        fecha_hasta: v.fecha_hasta,
        estado: v.estado as EstadoVisitante,
        creado_en: v.creado_en,
        deportista_nombre: dep?.nombre_completo || "—",
        deportista_cedula: dep?.cedula || "—",
        escuela_id: dep?.escuela_id || "",
        escuela_nombre: escuelaObj?.nombre || "—",
      };
    });

    // Filtro por escuela
    if (escuelaId) {
      lista = lista.filter((v) => v.escuela_id === escuelaId);
    }

    // Filtro por texto global (nombre, documento, placa o datos del deportista)
    if (q) {
      const term = q.toLowerCase();
      lista = lista.filter((v) => {
        return (
          v.nombre.toLowerCase().includes(term) ||
          v.numero_documento.toLowerCase().includes(term) ||
          (v.placa && v.placa.toLowerCase().includes(term)) ||
          v.deportista_nombre.toLowerCase().includes(term) ||
          v.deportista_cedula.toLowerCase().includes(term)
        );
      });
    }

    // Calcular estadísticas
    const stats = {
      total: lista.length,
      aprobados: lista.filter((v) => v.estado === "Aprobado").length,
      pendientes: lista.filter((v) => v.estado === "Pendiente").length,
      rechazados: lista.filter((v) => v.estado === "Rechazado").length,
      con_vehiculo: lista.filter((v) => v.tiene_vehiculo).length,
    };

    return NextResponse.json({
      ok: true,
      visitantes: lista,
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
