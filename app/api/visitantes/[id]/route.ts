// app/api/visitantes/[id]/route.ts — Edición y Eliminación de Visitantes (Fase 4 Adaptada)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visitanteSchema } from "@/lib/validations/visitante";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

async function verificarAccesoStaff() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autorizado. Inicie sesión.", status: 401, user: null, perfil: null };
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("id, nombre, cedula, rol, activo")
    .eq("id", user.id)
    .single();

  if (perfilError || !perfil) {
    return { error: "Perfil de usuario no encontrado.", status: 403, user: null, perfil: null };
  }

  if (perfil.activo === false) {
    return { error: "Cuenta inactiva o bloqueada.", status: 403, user: null, perfil: null };
  }

  if (!["admin", "auxiliar"].includes(perfil.rol)) {
    return {
      error: "Acceso denegado. Se requiere rol de Administrador o Auxiliar.",
      status: 403,
      user: null,
      perfil: null,
    };
  }

  return { error: null, status: 200, user, perfil };
}

// 1. PATCH & PUT — Editar datos de un visitante
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleUpdate(request, params);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleUpdate(request, params);
}

async function handleUpdate(request: NextRequest, params: { id: string }) {
  try {
    const authCheck = await verificarAccesoStaff();
    if (authCheck.error || !authCheck.user || !authCheck.perfil) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID del visitante." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Obtener visitante actual
    const { data: existente, error: fetchError } = await supabaseAdmin
      .from("visitantes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existente) {
      return NextResponse.json({ error: "Visitante no encontrado." }, { status: 404 });
    }

    // 2. Validar fecha límite si es auxiliar
    if (authCheck.perfil.rol !== "admin") {
      const { data: config } = await supabaseAdmin
        .from("configuracion")
        .select("fecha_limite")
        .eq("id", 1)
        .single();

      if (config?.fecha_limite) {
        const hoy = new Date().toISOString().split("T")[0];
        const limiteStr = new Date(config.fecha_limite).toISOString().split("T")[0];
        if (hoy > limiteStr) {
          return NextResponse.json(
            {
              error: `El plazo para modificar acreditaciones finalizó el ${new Date(config.fecha_limite).toLocaleDateString("es-CO")}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 3. Validar con Zod
    const body = await request.json();
    const validation = visitanteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Datos del visitante inválidos." },
        { status: 400 }
      );
    }

    const {
      nombre,
      parentesco,
      tipo_documento,
      numero_documento,
      tiene_vehiculo,
      placa,
      modelo,
      fecha_desde,
      fecha_hasta,
    } = validation.data;

    // 4. Validar documento duplicado en otro visitante del mismo deportista
    const { data: duplicado } = await supabaseAdmin
      .from("visitantes")
      .select("id")
      .eq("deportista_id", existente.deportista_id)
      .eq("numero_documento", numero_documento)
      .neq("id", id)
      .maybeSingle();

    if (duplicado) {
      return NextResponse.json(
        {
          error: `Este deportista ya tiene registrado otro visitante con el documento ${numero_documento}.`,
        },
        { status: 409 }
      );
    }

    // 5. Actualizar registro
    const { data: actualizado, error: updateError } = await supabaseAdmin
      .from("visitantes")
      .update({
        nombre,
        parentesco,
        tipo_documento,
        numero_documento,
        tiene_vehiculo: Boolean(tiene_vehiculo),
        placa: tiene_vehiculo ? placa : null,
        modelo: tiene_vehiculo ? modelo : null,
        fecha_desde,
        fecha_hasta,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar el visitante: " + updateError.message },
        { status: 500 }
      );
    }

    // 6. Registrar en Auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "EDITAR_VISITANTE",
      entidad: "visitantes",
      entidad_id: id,
      detalle: {
        nombre_anterior: existente.nombre,
        nuevo_nombre: nombre,
        documento_anterior: existente.numero_documento,
        nuevo_documento: numero_documento,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Datos de "${nombre}" actualizados exitosamente.`,
      visitante: actualizado,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. DELETE — Eliminar visitante
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await verificarAccesoStaff();
    if (authCheck.error || !authCheck.user || !authCheck.perfil) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID del visitante." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Obtener datos del visitante
    const { data: existente, error: fetchError } = await supabaseAdmin
      .from("visitantes")
      .select("id, nombre, numero_documento, deportista_id")
      .eq("id", id)
      .single();

    if (fetchError || !existente) {
      return NextResponse.json({ error: "Visitante no encontrado." }, { status: 404 });
    }

    // 2. Validar fecha límite si es auxiliar
    if (authCheck.perfil.rol !== "admin") {
      const { data: config } = await supabaseAdmin
        .from("configuracion")
        .select("fecha_limite")
        .eq("id", 1)
        .single();

      if (config?.fecha_limite) {
        const hoy = new Date().toISOString().split("T")[0];
        const limiteStr = new Date(config.fecha_limite).toISOString().split("T")[0];
        if (hoy > limiteStr) {
          return NextResponse.json(
            {
              error: `El plazo para modificar o eliminar visitantes finalizó el ${new Date(config.fecha_limite).toLocaleDateString("es-CO")}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 2.5 Limpiar registros de acceso en portería asociados al visitante
    const { error: histErr } = await supabaseAdmin
      .from("registros_acceso")
      .delete()
      .eq("visitante_id", id);

    if (histErr) {
      console.warn("Advertencia al limpiar registros de acceso del visitante:", histErr.message);
    }

    // 3. Eliminar registro
    const { error: delError } = await supabaseAdmin
      .from("visitantes")
      .delete()
      .eq("id", id);

    if (delError) {
      return NextResponse.json(
        { error: "Error al eliminar el visitante: " + delError.message },
        { status: 500 }
      );
    }

    // 4. Registrar en Auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "ELIMINAR_VISITANTE",
      entidad: "visitantes",
      entidad_id: id,
      detalle: {
        nombre: existente.nombre,
        numero_documento: existente.numero_documento,
        deportista_id: existente.deportista_id,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Visitante "${existente.nombre}" eliminado exitosamente.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
