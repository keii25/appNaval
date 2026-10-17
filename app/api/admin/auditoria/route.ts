// app/api/admin/auditoria/route.ts — Consultar bitácora de auditoría
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
        { error: "Acceso denegado. Se requiere rol de administrador." },
        { status: 403 }
      );
    }

    const { data: auditoria, error: auditError } = await supabase
      .from("auditoria")
      .select("id, usuario_id, accion, entidad, entidad_id, detalle, fecha")
      .order("fecha", { ascending: false })
      .limit(60);

    if (auditError) {
      console.error("Error al consultar auditoria:", auditError);
      return NextResponse.json(
        { error: "Error al consultar los registros de auditoría: " + auditError.message },
        { status: 500 }
      );
    }

    // Obtener perfiles de los usuarios involucrados
    const userIds = Array.from(
      new Set((auditoria || []).map((a) => a.usuario_id).filter(Boolean))
    );
    let perfilesMap: Record<string, { nombre: string; cedula: string; unidad: string }> = {};

    if (userIds.length > 0) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre, cedula, unidad")
        .in("id", userIds);

      if (perfiles) {
        perfilesMap = Object.fromEntries(perfiles.map((p) => [p.id, p]));
      }
    }

    const items = (auditoria || []).map((a) => {
      const perf = a.usuario_id ? perfilesMap[a.usuario_id] : null;
      return {
        id: a.id,
        accion: a.accion,
        entidad: a.entidad,
        entidad_id: a.entidad_id,
        detalle: a.detalle,
        fecha: a.fecha,
        usuario_nombre: perf?.nombre || "Sistema / Administrador",
        usuario_cedula: perf?.cedula || "—",
        usuario_unidad: perf?.unidad || "—",
      };
    });

    return NextResponse.json({ ok: true, auditoria: items });
  } catch (err) {
    console.error("Error en GET /api/admin/auditoria:", err);
    return NextResponse.json(
      { error: "Error inesperado al consultar la auditoría." },
      { status: 500 }
    );
  }
}
