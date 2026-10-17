// app/api/admin/configuracion/route.ts — Configuración Global del Evento
import { NextRequest, NextResponse } from "next/server";
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

    const { data: config, error: configError } = await supabase
      .from("configuracion")
      .select("*")
      .eq("id", 1)
      .single();

    if (configError) {
      return NextResponse.json(
        { error: "Error al consultar la configuración." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, configuracion: config });
  } catch (err) {
    console.error("Error en GET /api/admin/configuracion:", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const limiteVisitantes = Number(body.limite_visitantes);
    const fechaLimite = body.fecha_limite ? String(body.fecha_limite).trim() : null;

    if (isNaN(limiteVisitantes) || limiteVisitantes < 1 || limiteVisitantes > 50) {
      return NextResponse.json(
        { error: "El límite de visitantes debe ser un número entre 1 y 50." },
        { status: 400 }
      );
    }

    // Obtener configuración anterior
    const { data: configAnterior } = await supabase
      .from("configuracion")
      .select("*")
      .eq("id", 1)
      .single();

    // Actualizar configuración
    const { data: configActualizada, error: updateError } = await supabase
      .from("configuracion")
      .update({
        limite_visitantes: limiteVisitantes,
        fecha_limite: fechaLimite,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", 1)
      .select()
      .single();

    if (updateError) {
      console.error("Error actualizando configuracion:", updateError);
      return NextResponse.json(
        { error: "No fue posible actualizar la configuración." },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from("auditoria").insert({
      usuario_id: user.id,
      accion: "CAMBIAR_CONFIGURACION",
      detalle: {
        limite_anterior: configAnterior?.limite_visitantes,
        nuevo_limite: limiteVisitantes,
        fecha_limite_anterior: configAnterior?.fecha_limite,
        nueva_fecha_limite: fechaLimite,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      configuracion: configActualizada,
      mensaje: "Configuración actualizada exitosamente.",
    });
  } catch (err) {
    console.error("Error en PUT /api/admin/configuracion:", err);
    return NextResponse.json(
      { error: "Error inesperado al guardar la configuración." },
      { status: 500 }
    );
  }
}
