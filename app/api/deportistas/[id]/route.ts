// app/api/deportistas/[id]/route.ts — Edición, Consulta y Eliminación de Deportistas
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { editarDeportistaSchema } from "@/lib/validations/deportista";

export const dynamic = "force-dynamic";

async function verificarAccesoStaff(permitirPorteria = false) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autorizado.", status: 401, user: null, perfil: null };
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("id, nombre, cedula, rol, activo")
    .eq("id", user.id)
    .single();

  if (perfilError || !perfil) {
    return { error: "Perfil no encontrado.", status: 403, user: null, perfil: null };
  }

  if (perfil.activo === false) {
    return { error: "Cuenta bloqueada.", status: 403, user: null, perfil: null };
  }

  const rolesPermitidos = permitirPorteria
    ? ["admin", "auxiliar", "porteria"]
    : ["admin", "auxiliar"];

  if (!rolesPermitidos.includes(perfil.rol)) {
    return { error: "Acceso denegado. Se requiere rol de Admin o Auxiliar.", status: 403, user: null, perfil: null };
  }

  return { error: null, status: 200, user, perfil };
}

// 1. GET — Obtener detalle de un deportista
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await verificarAccesoStaff(true);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID del deportista." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: deportista, error } = await supabaseAdmin
      .from("deportistas")
      .select(
        `
        id,
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        observaciones,
        autorizacion_datos,
        creado_en,
        escuela:escuelas!deportistas_escuela_id_fkey (
          id,
          nombre,
          activa
        ),
        visitantes:visitantes(count)
      `
      )
      .eq("id", id)
      .single();

    if (error || !deportista) {
      return NextResponse.json({ error: "Deportista no encontrado." }, { status: 404 });
    }

    const d: any = deportista;
    return NextResponse.json({
      ok: true,
      deportista: {
        id: d.id,
        nombre_completo: d.nombre_completo,
        cedula: d.cedula,
        celular: d.celular,
        escuela_id: d.escuela_id,
        escuela_nombre: d.escuela?.nombre || "Sin escuela",
        escuela_activa: d.escuela?.activa ?? true,
        observaciones: d.observaciones,
        autorizacion_datos: d.autorizacion_datos,
        creado_en: d.creado_en,
        visitantes_count: d.visitantes?.[0]?.count ?? 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. PATCH — Editar datos del deportista
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await verificarAccesoStaff(false);
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    const body = await request.json();
    const parsed = editarDeportistaSchema.safeParse({ ...body, id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { nombre_completo, cedula, celular, escuela_id, observaciones } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // 1. Obtener registro previo
    const { data: anterior, error: getErr } = await supabaseAdmin
      .from("deportistas")
      .select("id, nombre_completo, cedula, celular, escuela_id")
      .eq("id", id)
      .single();

    if (getErr || !anterior) {
      return NextResponse.json({ error: "Deportista no encontrado." }, { status: 404 });
    }

    // 2. Si cambia la cédula, validar que no exista en otro deportista
    if (cedula && cedula !== anterior.cedula) {
      const { data: dup } = await supabaseAdmin
        .from("deportistas")
        .select("id, nombre_completo")
        .eq("cedula", cedula)
        .neq("id", id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          {
            error: `Ya existe otro deportista registrado con el documento ${cedula} (${dup.nombre_completo}).`,
          },
          { status: 409 }
        );
      }
    }

    // 3. Si cambia de escuela, verificar que exista y esté activa
    if (escuela_id && escuela_id !== anterior.escuela_id) {
      const { data: escuela, error: escErr } = await supabaseAdmin
        .from("escuelas")
        .select("id, nombre, activa")
        .eq("id", escuela_id)
        .single();

      if (escErr || !escuela) {
        return NextResponse.json({ error: "La escuela seleccionada no existe." }, { status: 400 });
      }

      if (!escuela.activa) {
        return NextResponse.json(
          { error: `La escuela "${escuela.nombre}" se encuentra inactiva.` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (nombre_completo !== undefined) updates.nombre_completo = nombre_completo;
    if (cedula !== undefined) updates.cedula = cedula;
    if (celular !== undefined) updates.celular = celular;
    if (escuela_id !== undefined) updates.escuela_id = escuela_id;
    if (observaciones !== undefined) updates.observaciones = observaciones;

    const { data: deportistaActualizado, error: updateErr } = await supabaseAdmin
      .from("deportistas")
      .update(updates)
      .eq("id", id)
      .select(
        `
        id,
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        observaciones,
        autorizacion_datos,
        creado_en
      `
      )
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: "Error al actualizar deportista: " + updateErr.message },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "EDITAR_DEPORTISTA",
      entidad: "deportistas",
      entidad_id: id,
      detalle: {
        cambios: updates,
        documento_anterior: anterior.cedula,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Deportista actualizado exitosamente.",
      deportista: deportistaActualizado,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 3. DELETE — Eliminar deportista con validación de visitantes
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await verificarAccesoStaff(false);
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID del deportista." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Obtener deportista
    const { data: deportista, error: getErr } = await supabaseAdmin
      .from("deportistas")
      .select("id, nombre_completo, cedula")
      .eq("id", id)
      .single();

    if (getErr || !deportista) {
      return NextResponse.json({ error: "Deportista no encontrado." }, { status: 404 });
    }

    // 2. Verificar si tiene visitantes asociados
    const { count, error: countErr } = await supabaseAdmin
      .from("visitantes")
      .select("*", { count: "exact", head: true })
      .eq("deportista_id", id);

    if (countErr) {
      return NextResponse.json(
        { error: "Error al verificar acompañantes: " + countErr.message },
        { status: 500 }
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar porque tiene ${count} visitante(s) registrado(s). Elimine primero los visitantes.`,
        },
        { status: 400 }
      );
    }

    // 3. Proceder a eliminar
    const { error: delErr } = await supabaseAdmin
      .from("deportistas")
      .delete()
      .eq("id", id);

    if (delErr) {
      return NextResponse.json(
        { error: "Error al eliminar deportista: " + delErr.message },
        { status: 500 }
      );
    }

    // 4. Registrar en Auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "ELIMINAR_DEPORTISTA",
      entidad: "deportistas",
      entidad_id: id,
      detalle: {
        nombre_completo: deportista.nombre_completo,
        cedula: deportista.cedula,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Deportista "${deportista.nombre_completo}" eliminado exitosamente.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
