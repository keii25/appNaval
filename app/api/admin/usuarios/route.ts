// app/api/admin/usuarios/route.ts — Gestión de Auxiliares y Portería por el Administrador
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  usuarioStaffSchema,
  editarUsuarioStaffSchema,
  resetClaveSchema,
} from "@/lib/validations/admin";

export const dynamic = "force-dynamic";

// Helper para verificar rol de Administrador
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

// 1. GET — Listar personal auxiliar y portería
export async function GET(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const rolFiltro = searchParams.get("rol");

    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin
      .from("perfiles")
      .select("id, cedula, nombre, unidad, rol, activo, debe_cambiar_clave, creado_en")
      .in("rol", ["auxiliar", "porteria"])
      .order("creado_en", { ascending: true });

    if (rolFiltro && (rolFiltro === "auxiliar" || rolFiltro === "porteria")) {
      query = query.eq("rol", rolFiltro);
    }

    const { data: usuarios, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al consultar los usuarios: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, usuarios });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. POST — Crear nuevo auxiliar/portería, o resetear clave a cédula
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const action = body.action || "create";
    const supabaseAdmin = createAdminClient();

    // Acción A: Resetear contraseña a cédula (con opción de exigir o no cambio)
    if (action === "reset_clave") {
      const parsed = resetClaveSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Datos inválidos." },
          { status: 400 }
        );
      }

      const { userId, debe_cambiar_clave } = parsed.data;

      // Buscar perfil
      const { data: perfil, error: perfilErr } = await supabaseAdmin
        .from("perfiles")
        .select("id, cedula, nombre, rol")
        .eq("id", userId)
        .single();

      if (perfilErr || !perfil) {
        return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
      }

      // Restablecer clave en Auth a la cédula
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: perfil.cedula,
      });

      if (authErr) {
        return NextResponse.json(
          { error: "Error al restablecer contraseña: " + authErr.message },
          { status: 500 }
        );
      }

      // Actualizar bandera en perfil
      const { error: updateErr } = await supabaseAdmin
        .from("perfiles")
        .update({ debe_cambiar_clave })
        .eq("id", userId);

      if (updateErr) {
        return NextResponse.json(
          { error: "Error actualizando perfil: " + updateErr.message },
          { status: 500 }
        );
      }

      // Registrar auditoría
      await supabaseAdmin.from("auditoria").insert({
        usuario_id: authCheck.user.id,
        accion: "GESTIONAR_AUXILIAR",
        entidad: "perfiles",
        entidad_id: userId,
        detalle: {
          operacion: "RESET_CLAVE_A_CEDULA",
          cedula: perfil.cedula,
          debe_cambiar_clave,
        },
        fecha: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        mensaje: `Contraseña restablecida a la cédula (${perfil.cedula}). Exigir cambio al ingresar: ${debe_cambiar_clave ? "SÍ" : "NO"}`,
      });
    }

    // Acción B: Crear nuevo Auxiliar o Portería
    const parsed = usuarioStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { cedula, nombre, unidad, rol, debe_cambiar_clave } = parsed.data;
    const email = `${cedula}@naval.local`;

    // Verificar si ya existe en perfiles
    const { data: existente } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();

    let userId = existente?.id;

    if (!userId) {
      // Crear en Auth con password = cédula
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: cedula,
        email_confirm: true,
        user_metadata: { nombre, cedula, unidad },
      });

      if (authErr) {
        if (authErr.message.includes("already") || authErr.code === "email_exists") {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const found = listData.users.find((u) => u.email === email);
          if (found) userId = found.id;
        } else {
          return NextResponse.json(
            { error: "Error al crear cuenta en Auth: " + authErr.message },
            { status: 500 }
          );
        }
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No se pudo obtener el identificador de usuario." },
        { status: 500 }
      );
    }

    // Asegurar clave = cédula en Auth
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: cedula,
      user_metadata: { nombre, cedula, unidad },
    });

    // Guardar / Actualizar en perfiles
    const { error: perfilErr } = await supabaseAdmin.from("perfiles").upsert({
      id: userId,
      cedula,
      nombre,
      unidad,
      rol,
      activo: true,
      debe_cambiar_clave,
      acepto_datos: true,
    });

    if (perfilErr) {
      return NextResponse.json(
        { error: "Error al guardar el perfil: " + perfilErr.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "GESTIONAR_AUXILIAR",
      entidad: "perfiles",
      entidad_id: userId,
      detalle: {
        operacion: "CREAR_STAFF",
        cedula,
        nombre,
        rol,
        debe_cambiar_clave,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Usuario ${rol} registrado con éxito con credenciales cédula/cédula.`,
      usuario: {
        id: userId,
        cedula,
        nombre,
        unidad,
        rol,
        activo: true,
        debe_cambiar_clave,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 3. PATCH — Modificar estado (activo/inactivo), debe_cambiar_clave, nombre, etc.
export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await verificarAdmin();
    if (authCheck.error || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const parsed = editarUsuarioStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { id, nombre, cedula, unidad, activo, debe_cambiar_clave } = parsed.data;

    // No permitir desactivar su propia cuenta de admin
    if (id === authCheck.user.id && activo === false) {
      return NextResponse.json(
        { error: "No puede desactivar su propia cuenta de administrador." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Consultar usuario actual para validaciones y sincronización
    const { data: usuarioActual, error: errActual } = await supabaseAdmin
      .from("perfiles")
      .select("id, cedula, nombre, unidad, rol")
      .eq("id", id)
      .single();

    if (errActual || !usuarioActual) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // Si se modifica la cédula, verificar que no esté ocupada por otro perfil
    if (cedula && cedula !== usuarioActual.cedula) {
      const { data: existente } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("cedula", cedula)
        .neq("id", id)
        .maybeSingle();

      if (existente) {
        return NextResponse.json(
          { error: `Ya existe otro usuario registrado con la cédula ${cedula}.` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (cedula !== undefined) updates.cedula = cedula;
    if (unidad !== undefined) updates.unidad = unidad;
    if (activo !== undefined) updates.activo = activo;
    if (debe_cambiar_clave !== undefined) updates.debe_cambiar_clave = debe_cambiar_clave;

    const { data: usuarioActualizado, error } = await supabaseAdmin
      .from("perfiles")
      .update(updates)
      .eq("id", id)
      .select("id, cedula, nombre, unidad, rol, activo, debe_cambiar_clave")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar perfil: " + error.message },
        { status: 500 }
      );
    }

    // Sincronizar en Supabase Auth si cambió cédula, nombre o unidad
    if (cedula || nombre || unidad) {
      try {
        const authUpdates: {
          email?: string;
          user_metadata: Record<string, unknown>;
        } = {
          user_metadata: {
            nombre: nombre ?? usuarioActual.nombre,
            cedula: cedula ?? usuarioActual.cedula,
            unidad: unidad ?? usuarioActual.unidad,
          },
        };

        if (cedula && cedula !== usuarioActual.cedula) {
          authUpdates.email = `${cedula}@naval.local`;
        }

        await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
      } catch (authErr) {
        console.error("Error sincronizando Auth:", authErr);
      }
    }

    // Registrar auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "GESTIONAR_AUXILIAR",
      entidad: "perfiles",
      entidad_id: id,
      detalle: {
        operacion: "EDITAR_STAFF",
        cambios: updates,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Datos del responsable actualizados exitosamente.",
      usuario: usuarioActualizado,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
