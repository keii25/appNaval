// app/api/porteria/historial/route.ts — Histórico de Ingresos y Salidas (Consulta Transaccional)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatearTimestampAuditoria } from "@/lib/fechas";

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

    // Verificar rol de portería, auxiliar o admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("id", user.id)
      .single();

    if (!perfil || !["admin", "auxiliar", "porteria"].includes(perfil.rol) || perfil.activo === false) {
      return NextResponse.json(
        { error: "No cuenta con privilegios para consultar el historial de acceso." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sujetoId = searchParams.get("sujeto_id");
    const tipoSujetoParam = searchParams.get("tipo_sujeto")?.toLowerCase();
    const limitParam = parseInt(searchParams.get("limit") || "40", 10);
    const limit = Math.min(Math.max(1, limitParam), 100);

    if (!sujetoId) {
      return NextResponse.json(
        { error: "El parámetro 'sujeto_id' es obligatorio." },
        { status: 400 }
      );
    }

    if (tipoSujetoParam !== "deportista" && tipoSujetoParam !== "visitante") {
      return NextResponse.json(
        { error: "El parámetro 'tipo_sujeto' debe ser 'deportista' o 'visitante'." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from("registros_acceso")
      .select(`
        id,
        tipo_sujeto,
        tipo_evento,
        creado_en,
        observaciones,
        operador:perfiles!operador_id (
          id,
          nombre,
          rol,
          unidad
        )
      `)
      .order("creado_en", { ascending: false })
      .limit(limit);

    if (tipoSujetoParam === "deportista") {
      query = query.eq("deportista_id", sujetoId);
    } else {
      query = query.eq("visitante_id", sujetoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Historial Acceso] Error al consultar registros:", error);
      return NextResponse.json(
        { error: "Error al consultar el historial de acceso en base de datos." },
        { status: 500 }
      );
    }

    const historial = (data || []).map((row: any) => {
      const op = Array.isArray(row.operador) ? row.operador[0] : row.operador;
      return {
        id: row.id,
        tipo_evento: row.tipo_evento as "INGRESO" | "SALIDA",
        creado_en: row.creado_en,
        timestamp_formateado: formatearTimestampAuditoria(row.creado_en),
        observaciones: row.observaciones || null,
        operador_nombre: op?.nombre || "Guardia de Portería",
        operador_rol: op?.rol || "porteria",
        operador_unidad: op?.unidad || null,
      };
    });

    const totalIngresos = historial.filter((h) => h.tipo_evento === "INGRESO").length;
    const totalSalidas = historial.filter((h) => h.tipo_evento === "SALIDA").length;

    return NextResponse.json({
      historial,
      total_movimientos: historial.length,
      total_ingresos: totalIngresos,
      total_salidas: totalSalidas,
    });
  } catch (err) {
    console.error("[Historial Acceso] Error no controlado:", err);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el historial." },
      { status: 500 }
    );
  }
}
