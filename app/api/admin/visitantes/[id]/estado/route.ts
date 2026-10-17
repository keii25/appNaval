// app/api/admin/visitantes/[id]/estado/route.ts — Cambiar estado de visitante con auditoría
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EstadoVisitante } from "@/types/database";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Verificar rol admin o auxiliar de acreditación
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!perfil || !["admin", "auxiliar"].includes(perfil.rol)) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de administrador o auxiliar de acreditación." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const nuevoEstado = body.estado as EstadoVisitante;

    if (!nuevoEstado || !["Pendiente", "Aprobado", "Rechazado"].includes(nuevoEstado)) {
      return NextResponse.json(
        { error: "Estado inválido. Debe ser Pendiente, Aprobado o Rechazado." },
        { status: 400 }
      );
    }

    // Obtener estado anterior del visitante
    const { data: visitanteActual, error: getError } = await supabase
      .from("visitantes")
      .select("id, nombre, estado, numero_documento")
      .eq("id", id)
      .single();

    if (getError || !visitanteActual) {
      return NextResponse.json(
        { error: "El visitante especificado no existe." },
        { status: 404 }
      );
    }

    const estadoAnterior = visitanteActual.estado;

    // Actualizar estado
    const { data: visitanteActualizado, error: updateError } = await supabase
      .from("visitantes")
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error al actualizar estado de visitante:", updateError);
      return NextResponse.json(
        { error: "No fue posible actualizar el estado del visitante." },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from("auditoria").insert({
      usuario_id: user.id,
      accion: "CAMBIAR_ESTADO",
      entidad: "visitantes",
      entidad_id: id,
      detalle: {
        visitante_id: id,
        visitante_nombre: visitanteActual.nombre,
        visitante_documento: visitanteActual.numero_documento,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        motivo:
          body.motivo ||
          (perfil.rol === "auxiliar"
            ? "Validación y autorización por Auxiliar de Acreditación"
            : "Actualización desde panel administrativo"),
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      visitante: visitanteActualizado,
      mensaje: `Estado de ${visitanteActual.nombre} actualizado a ${nuevoEstado}.`,
    });
  } catch (err) {
    console.error("Error en PATCH estado de visitante:", err);
    return NextResponse.json(
      { error: "Error inesperado al procesar el cambio de estado." },
      { status: 500 }
    );
  }
}
