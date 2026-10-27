// app/api/deportistas/[id]/visitantes/route.ts — Gestión de Visitantes por Deportista
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visitanteSchema } from "@/lib/validations/visitante";
import { validarEscarapelaUnica } from "@/lib/validations/escarapela";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

async function verificarAccesoStaff(permitirPorteria = false) {
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
    return { error: "Su cuenta se encuentra inactiva o bloqueada.", status: 403, user: null, perfil: null };
  }

  const rolesPermitidos = permitirPorteria
    ? ["admin", "auxiliar", "porteria"]
    : ["admin", "auxiliar"];

  if (!rolesPermitidos.includes(perfil.rol)) {
    return {
      error: "Acceso denegado. Se requiere rol de Administrador o Auxiliar.",
      status: 403,
      user: null,
      perfil: null,
    };
  }

  return { error: null, status: 200, user, perfil };
}

// 1. GET — Listar visitantes del deportista con límites y reglas de acreditación
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await verificarAccesoStaff(true);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: deportistaId } = params;
    if (!deportistaId) {
      return NextResponse.json({ error: "Falta el ID del deportista." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Obtener datos del deportista y su escuela
    const { data: deportista, error: depErr } = await supabaseAdmin
      .from("deportistas")
      .select(
        `
        id,
        nombre_completo,
        cedula,
        celular,
        escuela_id,
        escuela:escuelas!deportistas_escuela_id_fkey (
          id,
          nombre,
          activa
        )
      `
      )
      .eq("id", deportistaId)
      .single();

    if (depErr || !deportista) {
      return NextResponse.json({ error: "Deportista no encontrado." }, { status: 404 });
    }

    // 2. Obtener configuración global
    const { data: config } = await supabaseAdmin
      .from("configuracion")
      .select("limite_visitantes, fecha_limite")
      .eq("id", 1)
      .single();

    const limiteMaximo = config?.limite_visitantes ?? 5;
    const fechaLimite = config?.fecha_limite || null;

    let registroVencido = false;
    if (fechaLimite) {
      const hoy = new Date().toISOString().split("T")[0];
      const limiteStr = new Date(fechaLimite).toISOString().split("T")[0];
      if (hoy > limiteStr) {
        registroVencido = true;
      }
    }

    // 3. Obtener visitantes asociados a este deportista
    const { data: visitantes, error: visErr } = await supabaseAdmin
      .from("visitantes")
      .select("*")
      .eq("deportista_id", deportistaId)
      .order("creado_en", { ascending: false });

    if (visErr) {
      return NextResponse.json(
        { error: "Error al consultar los visitantes: " + visErr.message },
        { status: 500 }
      );
    }

    const totalVisitantes = (visitantes || []).length;
    const cuposDisponibles = Math.max(0, limiteMaximo - totalVisitantes);

    const d: any = deportista;

    return NextResponse.json({
      ok: true,
      deportista: {
        id: d.id,
        nombre_completo: d.nombre_completo,
        cedula: d.cedula,
        celular: d.celular,
        escuela_id: d.escuela_id,
        escuela_nombre: d.escuela?.nombre || "Sin escuela asignada",
      },
      configuracion: {
        limite_visitantes: limiteMaximo,
        fecha_limite: fechaLimite,
        registro_vencido: registroVencido,
      },
      visitantes: visitantes || [],
      total_visitantes: totalVisitantes,
      cupos_usados: totalVisitantes,
      cupos_disponibles: cuposDisponibles,
      limite_alcanzado: totalVisitantes >= limiteMaximo,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. POST — Agregar visitante a la ficha del deportista
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await verificarAccesoStaff(false);
    if (authCheck.error || !authCheck.user || !authCheck.perfil) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: deportistaId } = params;
    if (!deportistaId) {
      return NextResponse.json({ error: "Falta el ID del deportista." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Verificar existencia del deportista
    const { data: deportista, error: depErr } = await supabaseAdmin
      .from("deportistas")
      .select("id, nombre_completo, cedula")
      .eq("id", deportistaId)
      .single();

    if (depErr || !deportista) {
      return NextResponse.json({ error: "Deportista no encontrado." }, { status: 404 });
    }

    // 2. Validar parámetros de configuración global (fecha límite y cupo)
    const { data: config } = await supabaseAdmin
      .from("configuracion")
      .select("limite_visitantes, fecha_limite")
      .eq("id", 1)
      .single();

    const limiteMaximo = config?.limite_visitantes ?? 5;
    const fechaLimite = config?.fecha_limite || null;

    // Solo el Admin puede omitir fecha límite si lo desea, pero para auxiliares es estricto
    if (authCheck.perfil.rol !== "admin" && fechaLimite) {
      const hoy = new Date().toISOString().split("T")[0];
      const limiteStr = new Date(fechaLimite).toISOString().split("T")[0];
      if (hoy > limiteStr) {
        return NextResponse.json(
          {
            error: `El plazo para agregar o modificar visitantes venció el ${new Date(fechaLimite).toLocaleDateString("es-CO")}.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Validar cupo máximo de visitantes del deportista
    const { count, error: countErr } = await supabaseAdmin
      .from("visitantes")
      .select("*", { count: "exact", head: true })
      .eq("deportista_id", deportistaId);

    if (countErr) {
      return NextResponse.json(
        { error: "Error al validar cupos: " + countErr.message },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= limiteMaximo) {
      return NextResponse.json(
        {
          error: `Cupo agotado: Este deportista ya tiene registrados los ${limiteMaximo} visitantes permitidos.`,
        },
        { status: 400 }
      );
    }

    // 4. Validar cuerpo de la petición con Zod
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
      numero_escarapela,
      tiene_vehiculo,
      placa,
      modelo,
      fecha_desde,
      fecha_hasta,
    } = validation.data;

    // 5. Validar que no se repita el documento para el mismo deportista
    const { data: duplicado } = await supabaseAdmin
      .from("visitantes")
      .select("id")
      .eq("deportista_id", deportistaId)
      .eq("numero_documento", numero_documento)
      .maybeSingle();

    if (duplicado) {
      return NextResponse.json(
        {
          error: `Este deportista ya tiene registrado un visitante con el número de documento ${numero_documento}.`,
        },
        { status: 409 }
      );
    }

    // 6. Validar unicidad de escarapela si se proporcionó
    if (numero_escarapela) {
      const valEscarapela = await validarEscarapelaUnica(supabaseAdmin, numero_escarapela);
      if (!valEscarapela.esValido) {
        return NextResponse.json({ error: valEscarapela.mensajeError }, { status: 409 });
      }
    }

    // 7. Insertar visitante
    const { data: nuevoVisitante, error: insertError } = await supabaseAdmin
      .from("visitantes")
      .insert({
        deportista_id: deportistaId,
        nombre,
        parentesco,
        tipo_documento,
        numero_documento,
        numero_escarapela: numero_escarapela?.trim() || null,
        tiene_vehiculo: Boolean(tiene_vehiculo),
        placa: tiene_vehiculo ? placa : null,
        modelo: tiene_vehiculo ? modelo : null,
        fecha_desde,
        fecha_hasta,
        estado: validation.data.estado || "Pendiente",
        creado_por: authCheck.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Error al registrar el visitante: " + insertError.message },
        { status: 500 }
      );
    }

    // 7. Registrar en Auditoría
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: authCheck.user.id,
      accion: "CREAR_VISITANTE",
      entidad: "visitantes",
      entidad_id: nuevoVisitante.id,
      detalle: {
        deportista_id: deportistaId,
        deportista_nombre: deportista.nombre_completo,
        visitante_nombre: nombre,
        numero_documento,
        parentesco,
        tiene_vehiculo,
        placa: tiene_vehiculo ? placa : null,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Visitante "${nombre}" acreditado exitosamente.`,
      visitante: nuevoVisitante,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
