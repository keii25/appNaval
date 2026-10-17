// app/api/admin/escuelas/route.ts — Catálogo de Escuelas para el Administrador
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escuelaSchema, editarEscuelaSchema } from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

async function verificarAdmin() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autorizado.", status: 401, user: null };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return {
      error: "Acceso denegado. Se requiere rol de administrador.",
      status: 403,
      user: null,
    };
  }

  return { error: null, status: 200, user };
}

async function verificarStaff() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autorizado.", status: 401, user: null };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.activo === false) {
    return { error: "Cuenta inactiva.", status: 403, user: null };
  }

  if (!["admin", "auxiliar", "porteria"].includes(perfil.rol)) {
    return {
      error: "Acceso denegado. Se requiere personal autorizado.",
      status: 403,
      user: null,
    };
  }

  return { error: null, status: 200, user };
}

// 1. GET — Listar escuelas con conteo de deportistas
export async function GET(request: NextRequest) {
  try {
    const authCheck = await verificarStaff();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const soloActivas = searchParams.get("activas") === "true";
    const busqueda = searchParams.get("q")?.trim();

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from("escuelas")
      .select(`
        id,
        nombre,
        activa,
        creado_en,
        deportistas:deportistas(count)
      `)
      .order("nombre", { ascending: true });

    if (soloActivas) {
      query = query.eq("activa", true);
    }

    if (busqueda) {
      query = query.ilike("nombre", `%${busqueda}%`);
    }

    const { data: escuelas, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al consultar las escuelas: " + error.message },
        { status: 500 }
      );
    }

    // Aplanar el conteo
    const resultado = (escuelas || []).map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      activa: e.activa,
      creado_en: e.creado_en,
      deportistas_count: e.deportistas?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ ok: true, escuelas: resultado });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. POST — Crear nueva escuela
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const json = await request.json();
    const parsed = escuelaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { nombre, activa } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // Validar duplicado por nombre exacto (case-insensitive)
    const { data: existente } = await supabaseAdmin
      .from("escuelas")
      .select("id")
      .ilike("nombre", nombre)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una escuela registrada con este nombre." },
        { status: 409 }
      );
    }

    const { data: nuevaEscuela, error: insertError } = await supabaseAdmin
      .from("escuelas")
      .insert({ nombre, activa })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "No fue posible registrar la escuela: " + insertError.message },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "CREAR_ESCUELA",
      entidad: "escuelas",
      entidad_id: nuevaEscuela.id,
      detalle: { nombre, activa },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Escuela creada exitosamente.",
      escuela: {
        ...nuevaEscuela,
        deportistas_count: 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 3. PATCH — Actualizar escuela (nombre o estado activa/inactiva)
export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const json = await request.json();
    const parsed = editarEscuelaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { id, nombre, activa } = parsed.data;
    const supabaseAdmin = createAdminClient();

    const { data: escuelaActual, error: getErr } = await supabaseAdmin
      .from("escuelas")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !escuelaActual) {
      return NextResponse.json({ error: "Escuela no encontrada." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (activa !== undefined) updates.activa = activa;

    // Si cambia el nombre, validar duplicados
    if (nombre && nombre.toLowerCase() !== escuelaActual.nombre.toLowerCase()) {
      const { data: dup } = await supabaseAdmin
        .from("escuelas")
        .select("id")
        .ilike("nombre", nombre)
        .neq("id", id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          { error: "Ya existe otra escuela con este nombre." },
          { status: 409 }
        );
      }
    }

    const { data: escuelaModificada, error: updateErr } = await supabaseAdmin
      .from("escuelas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: "Error al actualizar la escuela: " + updateErr.message },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "EDITAR_ESCUELA",
      entidad: "escuelas",
      entidad_id: id,
      detalle: {
        nombre_anterior: escuelaActual.nombre,
        nuevo_nombre: nombre,
        activa_anterior: escuelaActual.activa,
        nueva_activa: activa,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Escuela actualizada exitosamente.",
      escuela: escuelaModificada,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 4. DELETE — Eliminar escuela con validación estricta de deportistas asociados
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la escuela a eliminar." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Obtener la escuela
    const { data: escuela, error: escErr } = await supabaseAdmin
      .from("escuelas")
      .select("id, nombre")
      .eq("id", id)
      .single();

    if (escErr || !escuela) {
      return NextResponse.json({ error: "Escuela no encontrada." }, { status: 404 });
    }

    // 2. Verificar si tiene deportistas asociados
    const { count, error: countErr } = await supabaseAdmin
      .from("deportistas")
      .select("*", { count: "exact", head: true })
      .eq("escuela_id", id);

    if (countErr) {
      return NextResponse.json(
        { error: "Error al verificar deportistas asociados: " + countErr.message },
        { status: 500 }
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `No es posible eliminar la escuela "${escuela.nombre}" porque tiene ${count} deportista(s) asociado(s). Para ocultarla, desactívela.`,
        },
        { status: 400 }
      );
    }

    // 3. Proceder a eliminar
    const { error: delErr } = await supabaseAdmin.from("escuelas").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json(
        { error: "No se pudo eliminar la escuela: " + delErr.message },
        { status: 500 }
      );
    }

    // 4. Registrar en auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "EDITAR_ESCUELA",
      entidad: "escuelas",
      entidad_id: id,
      detalle: { accion: "ELIMINAR_ESCUELA", nombre: escuela.nombre },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Escuela "${escuela.nombre}" eliminada exitosamente.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
