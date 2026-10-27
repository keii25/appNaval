// app/api/deportistas/route.ts — CRUD y Consulta de Deportistas (Admin y Auxiliar)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deportistaSchema } from "@/lib/validations/deportista";
import { validarEscarapelaUnica } from "@/lib/validations/escarapela";

export const dynamic = "force-dynamic";

// Helper para validar autenticación y rol de staff (Admin o Auxiliar)
async function verificarAccesoStaff(permitirPorteria = false) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autorizado. Inicie sesión para continuar.", status: 401, user: null, perfil: null };
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
    return { error: "Esta cuenta se encuentra bloqueada por la administración.", status: 403, user: null, perfil: null };
  }

  const rolesPermitidos = permitirPorteria
    ? ["admin", "auxiliar", "porteria"]
    : ["admin", "auxiliar"];

  if (!rolesPermitidos.includes(perfil.rol)) {
    return {
      error: "Acceso denegado. Se requiere rol de Administrador o Auxiliar de acreditación.",
      status: 403,
      user: null,
      perfil: null,
    };
  }

  return { error: null, status: 200, user, perfil };
}

// 1. GET — Buscar y listar deportistas con filtros y conteo de visitantes
export async function GET(request: NextRequest) {
  try {
    // Permitimos a portería solo consultar si lo requiere para verificar ficha
    const authCheck = await verificarAccesoStaff(true);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("q")?.trim() || "";
    const escuelaId = searchParams.get("escuela_id")?.trim();
    const hasLimit = searchParams.has("limit");
    const limit = hasLimit ? Math.min(Number(searchParams.get("limit")) || 50, 1000) : null;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * (limit || 0);

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from("deportistas")
      .select(
        `
        id,
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        numero_escarapela,
        observaciones,
        autorizacion_datos,
        creado_en,
        escuela:escuelas!deportistas_escuela_id_fkey (
          id,
          nombre,
          activa
        ),
        visitantes:visitantes(count)
      `,
        { count: "exact" }
      )
      .order("creado_en", { ascending: false });

    if (hasLimit && limit !== null) {
      query = query.range(offset, offset + limit - 1);
    }

    // Filtro por escuela
    if (escuelaId) {
      query = query.eq("escuela_id", escuelaId);
    }

    // Filtro por texto (cédula exacta o nombre ilike)
    if (busqueda) {
      if (/^[0-9]+$/.test(busqueda)) {
        query = query.ilike("cedula", `%${busqueda}%`);
      } else {
        query = query.ilike("nombre_completo", `%${busqueda}%`);
      }
    }

    const { data: deportistas, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al consultar deportistas: " + error.message },
        { status: 500 }
      );
    }

    // Aplanar resultado
    const resultado = (deportistas || []).map((d: any) => ({
      id: d.id,
      nombre_completo: d.nombre_completo,
      cedula: d.cedula,
      celular: d.celular,
      escuela_id: d.escuela_id,
      escuela_nombre: d.escuela?.nombre || "Sin escuela asignada",
      escuela_activa: d.escuela?.activa ?? true,
      observaciones: d.observaciones,
      autorizacion_datos: d.autorizacion_datos,
      creado_en: d.creado_en,
      visitantes_count: d.visitantes?.[0]?.count ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      deportistas: resultado,
      total: count || 0,
      pagina: page,
      limite: limit,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. POST — Crear nuevo deportista
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAccesoStaff(false);
    if (authCheck.error || !authCheck.user || !authCheck.perfil) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const json = await request.json();
    const parsed = deportistaSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos del deportista inválidos." },
        { status: 400 }
      );
    }

    const {
      nombre_completo,
      cedula,
      celular,
      escuela_id,
      numero_escarapela,
      observaciones,
      autorizacion_datos,
    } = parsed.data;

    const supabaseAdmin = createAdminClient();

    // 1. Verificar duplicidad de documento
    const { data: existente } = await supabaseAdmin
      .from("deportistas")
      .select("id, nombre_completo")
      .eq("cedula", cedula)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          error: `Ya existe un deportista registrado con el documento ${cedula} (${existente.nombre_completo}).`,
        },
        { status: 409 }
      );
    }

    // 2. Verificar que la escuela exista y esté activa
    const { data: escuela, error: escErr } = await supabaseAdmin
      .from("escuelas")
      .select("id, nombre, activa")
      .eq("id", escuela_id)
      .single();

    if (escErr || !escuela) {
      return NextResponse.json(
        { error: "La escuela seleccionada no existe en el sistema." },
        { status: 400 }
      );
    }

    if (!escuela.activa) {
      return NextResponse.json(
        {
          error: `La escuela "${escuela.nombre}" se encuentra inactiva. No se pueden asociar nuevos deportistas a instituciones deshabilitadas.`,
        },
        { status: 400 }
      );
    }

    // 3. Validar unicidad de escarapela si se proporcionó
    if (numero_escarapela) {
      const valEscarapela = await validarEscarapelaUnica(supabaseAdmin, numero_escarapela);
      if (!valEscarapela.esValido) {
        return NextResponse.json({ error: valEscarapela.mensajeError }, { status: 409 });
      }
    }

    // 4. Insertar el registro del deportista
    const { data: nuevoDeportista, error: insertError } = await supabaseAdmin
      .from("deportistas")
      .insert({
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        numero_escarapela: numero_escarapela?.trim() || null,
        observaciones: observaciones || null,
        autorizacion_datos: true,
        autorizado_por: authCheck.user.id,
        creado_por: authCheck.user.id,
      })
      .select(
        `
        id,
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        numero_escarapela,
        observaciones,
        autorizacion_datos,
        creado_en
      `
      )
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Error al registrar el deportista: " + insertError.message },
        { status: 500 }
      );
    }

    // 4. Registrar en Auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "CREAR_DEPORTISTA",
      entidad: "deportistas",
      entidad_id: nuevoDeportista.id,
      detalle: {
        nombre_completo,
        cedula,
        escuela: escuela.nombre,
        autorizo_ley1581: true,
        registrado_por_rol: authCheck.perfil.rol,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Deportista ${nombre_completo} registrado exitosamente.`,
      deportista: {
        ...nuevoDeportista,
        escuela_nombre: escuela.nombre,
        escuela_activa: escuela.activa,
        visitantes_count: 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
