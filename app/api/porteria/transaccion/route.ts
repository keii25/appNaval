// app/api/porteria/transaccion/route.ts — Registro transaccional de Ingreso y Egreso (Check-in / Check-out)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluarVigenciaVisitante, formatearTimestampAuditoria } from "@/lib/fechas";
import type { TipoEventoAcceso, TipoSujetoAcceso, EstadoPresencia } from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // RF-03: Control de acceso basado en roles (RBAC)
    // Administrador, Auxiliar de Portería y Portería tienen permisos de ejecución
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id, nombre, rol, activo")
      .eq("id", user.id)
      .single();

    if (!perfil || perfil.activo === false) {
      return NextResponse.json({ error: "Cuenta de usuario inactiva o deshabilitada." }, { status: 403 });
    }

    if (!["admin", "auxiliar", "porteria"].includes(perfil.rol)) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere perfil Administrador o Auxiliar de Portería." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      tipo_sujeto,
      deportista_id,
      visitante_id,
      tipo_evento,
      observaciones,
    }: {
      tipo_sujeto: TipoSujetoAcceso;
      deportista_id?: string;
      visitante_id?: string;
      tipo_evento: TipoEventoAcceso;
      observaciones?: string;
    } = body;

    // Validación de parámetros
    if (!tipo_sujeto || !["DEPORTISTA", "VISITANTE"].includes(tipo_sujeto)) {
      return NextResponse.json(
        { error: "Parámetro 'tipo_sujeto' inválido. Debe ser DEPORTISTA o VISITANTE." },
        { status: 400 }
      );
    }

    if (!tipo_evento || !["INGRESO", "SALIDA"].includes(tipo_evento)) {
      return NextResponse.json(
        { error: "Parámetro 'tipo_evento' inválido. Debe ser INGRESO o SALIDA." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    let sujetoNombre = "";
    let sujetoIdentificacion = "";

    // ─── VALIDACIONES SEGÚN TIPO DE SUJETO ───
    if (tipo_sujeto === "DEPORTISTA") {
      if (!deportista_id) {
        return NextResponse.json({ error: "Identificador 'deportista_id' requerido." }, { status: 400 });
      }

      const { data: deportista, error: depError } = await supabaseAdmin
        .from("deportistas")
        .select("id, nombre_completo, cedula")
        .eq("id", deportista_id)
        .single();

      if (depError || !deportista) {
        return NextResponse.json({ error: "Deportista no encontrado en el padrón oficial." }, { status: 404 });
      }

      sujetoNombre = deportista.nombre_completo;
      sujetoIdentificacion = deportista.cedula;
    } else {
      if (!visitante_id) {
        return NextResponse.json({ error: "Identificador 'visitante_id' requerido." }, { status: 400 });
      }

      const { data: visitante, error: visError } = await supabaseAdmin
        .from("visitantes")
        .select("id, nombre, numero_documento, fecha_desde, fecha_hasta, estado")
        .eq("id", visitante_id)
        .single();

      if (visError || !visitante) {
        return NextResponse.json({ error: "Visitante no encontrado en el sistema." }, { status: 404 });
      }

      sujetoNombre = visitante.nombre;
      sujetoIdentificacion = visitante.numero_documento;

      // RN-02: Condición de vigencia y aprobación administrativa
      if (visitante.estado !== "Aprobado") {
        return NextResponse.json(
          {
            error: `Acceso No Autorizado: El visitante se encuentra en estado '${visitante.estado}'. Solo se permite acceso a solicitudes Aprobadas.`,
          },
          { status: 422 }
        );
      }

      // La condición de vigencia aplica para el evento de INGRESO
      if (tipo_evento === "INGRESO") {
        const evaluacion = evaluarVigenciaVisitante(visitante.fecha_desde, visitante.fecha_hasta);
        if (!evaluacion.enRango) {
          return NextResponse.json(
            {
              error: evaluacion.mensajeAlerta || "Acceso Vencido / No Autorizado",
              vigencia_desde: visitante.fecha_desde,
              vigencia_hasta: visitante.fecha_hasta,
            },
            { status: 422 }
          );
        }
      }
    }

    // ─── RN-01: CONSISTENCIA DE ESTADOS ───
    // Consultar el último evento transaccional registrado para este sujeto
    let queryUltimo = supabaseAdmin
      .from("registros_acceso")
      .select("id, tipo_evento, creado_en")
      .order("creado_en", { ascending: false })
      .limit(1);

    if (tipo_sujeto === "DEPORTISTA") {
      queryUltimo = queryUltimo.eq("deportista_id", deportista_id);
    } else {
      queryUltimo = queryUltimo.eq("visitante_id", visitante_id);
    }

    const { data: ultimosRegistros, error: ultError } = await queryUltimo;

    // Si la tabla no existe o error
    if (ultError) {
      console.error("Error consultando registros_acceso:", ultError);
      return NextResponse.json(
        { error: "Error de consistencia en base de datos. Verifique la migración de registros_acceso." },
        { status: 500 }
      );
    }

    const ultimoEvento = ultimosRegistros && ultimosRegistros.length > 0 ? ultimosRegistros[0] : null;
    // Estado por defecto: Si no tiene eventos previos es SIN_REGISTRO
    const estadoActual: EstadoPresencia =
      !ultimoEvento
        ? "SIN_REGISTRO"
        : ultimoEvento.tipo_evento === "SALIDA"
        ? "FUERA"
        : "DENTRO";

    // RN-01: No permitir dos eventos consecutivos idénticos o salida sin ingreso previo
    if (tipo_evento === "INGRESO" && estadoActual === "DENTRO") {
      return NextResponse.json(
        {
          error: `Consistencia de estados (RN-01): ${sujetoNombre} ya se encuentra DENTRO de las instalaciones. No se puede registrar un Ingreso consecutivo.`,
          estado_actual: estadoActual,
        },
        { status: 422 }
      );
    }

    if (tipo_evento === "SALIDA" && estadoActual !== "DENTRO") {
      return NextResponse.json(
        {
          error: `Consistencia de estados (RN-01): ${sujetoNombre} ${
            estadoActual === "SIN_REGISTRO"
              ? "no cuenta con registro previo de ingreso a las instalaciones"
              : "ya se encuentra FUERA de las instalaciones"
          }. Debe registrar su Ingreso primero.`,
          estado_actual: estadoActual,
        },
        { status: 422 }
      );
    }

    // ─── REGISTRO DE AUDITORÍA (RF-02 & Timestamp exacto) ───
    const fechaAhora = new Date().toISOString();

    const nuevoRegistroData = {
      tipo_sujeto,
      deportista_id: tipo_sujeto === "DEPORTISTA" ? deportista_id : null,
      visitante_id: tipo_sujeto === "VISITANTE" ? visitante_id : null,
      tipo_evento,
      creado_en: fechaAhora,
      operador_id: user.id,
      observaciones: observaciones || null,
    };

    const { data: registroInsertado, error: insertError } = await supabaseAdmin
      .from("registros_acceso")
      .insert([nuevoRegistroData])
      .select("id, tipo_evento, creado_en")
      .single();

    if (insertError) {
      console.error("Error insertando registro_acceso:", insertError);
      return NextResponse.json(
        { error: "No fue posible registrar la transacción de acceso en base de datos." },
        { status: 500 }
      );
    }

    // Registrar en tabla general de auditoría
    await supabaseAdmin.from("auditoria").insert([
      {
        usuario_id: user.id,
        accion: tipo_evento === "INGRESO" ? "REGISTRO_INGRESO" : "REGISTRO_SALIDA",
        entidad: "ACCESO",
        entidad_id: registroInsertado.id,
        detalle: {
          tipo_sujeto,
          sujeto_id: tipo_sujeto === "DEPORTISTA" ? deportista_id : visitante_id,
          sujeto_nombre: sujetoNombre,
          sujeto_identificacion: sujetoIdentificacion,
          tipo_evento,
          operador_nombre: perfil.nombre,
          operador_rol: perfil.rol,
        },
      },
    ]);

    const nuevoEstado: EstadoPresencia = tipo_evento === "INGRESO" ? "DENTRO" : "FUERA";
    const timestampFormateado = formatearTimestampAuditoria(registroInsertado.creado_en);

    return NextResponse.json({
      ok: true,
      mensaje: `Registro de ${tipo_evento} completado exitosamente para ${sujetoNombre}.`,
      registro: {
        id: registroInsertado.id,
        tipo_evento: registroInsertado.tipo_evento,
        estado_presencia: nuevoEstado,
        timestamp_formateado: timestampFormateado,
        creado_en: registroInsertado.creado_en,
        operador_nombre: perfil.nombre,
        sujeto_nombre: sujetoNombre,
      },
    });
  } catch (err: any) {
    console.error("Error en POST /api/porteria/transaccion:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor al procesar acceso." },
      { status: 500 }
    );
  }
}
