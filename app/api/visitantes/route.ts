// app/api/visitantes/route.ts — Listar y Registrar Visitantes del Deportista
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visitanteSchema } from "@/lib/validations/visitante";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    // 1. Obtener configuración global (límite y fecha límite)
    const { data: config } = await supabase
      .from("configuracion")
      .select("limite_visitantes, fecha_limite")
      .eq("id", 1)
      .single();

    const limiteMaximo = config?.limite_visitantes ?? 5;
    const fechaLimite = config?.fecha_limite ?? null;

    // 2. Obtener lista de visitantes del deportista (RLS filtra automáticamente)
    const { data: visitantes, error: visitantesError } = await supabase
      .from("visitantes")
      .select("*")
      .order("creado_en", { ascending: false });

    if (visitantesError) {
      console.error("Error al consultar visitantes:", visitantesError);
      return NextResponse.json(
        { error: "Error al consultar visitantes registrados." },
        { status: 500 }
      );
    }

    const total = visitantes?.length ?? 0;
    const hoy = new Date().toISOString().split("T")[0];
    const fechaLimiteVencida = Boolean(fechaLimite && hoy > fechaLimite);
    const limiteAlcanzado = total >= limiteMaximo;

    return NextResponse.json({
      ok: true,
      visitantes: visitantes || [],
      configuracion: {
        limite_visitantes: limiteMaximo,
        fecha_limite: fechaLimite,
        total_registrados: total,
        cupos_disponibles: Math.max(0, limiteMaximo - total),
        limite_alcanzado: limiteAlcanzado,
        fecha_limite_vencida: fechaLimiteVencida,
      },
    });
  } catch (err) {
    console.error("Error en GET /api/visitantes:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al consultar los visitantes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    // 1. Validar fecha límite de registro
    const { data: config } = await supabase
      .from("configuracion")
      .select("limite_visitantes, fecha_limite")
      .eq("id", 1)
      .single();

    const hoy = new Date().toISOString().split("T")[0];
    if (config?.fecha_limite && hoy > config.fecha_limite) {
      return NextResponse.json(
        {
          error: `El plazo para registrar visitantes finalizó el ${config.fecha_limite}. No es posible registrar más visitantes.`,
        },
        { status: 400 }
      );
    }

    // 2. Validar cupo máximo permitido
    const { count, error: countError } = await supabase
      .from("visitantes")
      .select("*", { count: "exact", head: true })
      .eq("perfil_id", user.id);

    if (countError) {
      return NextResponse.json(
        { error: "Error al validar cupos disponibles." },
        { status: 500 }
      );
    }

    const limiteMaximo = config?.limite_visitantes ?? 5;
    if ((count ?? 0) >= limiteMaximo) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite máximo de ${limiteMaximo} visitantes permitidos.`,
        },
        { status: 400 }
      );
    }

    // 3. Validar cuerpo con Zod
    const body = await request.json();
    const validation = visitanteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Datos inválidos" },
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

    // 4. Validar documento duplicado en los registros propios del deportista
    const { data: existente } = await supabase
      .from("visitantes")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("numero_documento", numero_documento)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          error: `Ya tienes registrado un visitante con el documento ${numero_documento}. No se permiten duplicados.`,
        },
        { status: 400 }
      );
    }

    // 5. Insertar visitante
    const { data: nuevoVisitante, error: insertError } = await supabase
      .from("visitantes")
      .insert({
        perfil_id: user.id,
        nombre,
        parentesco,
        tipo_documento,
        numero_documento,
        tiene_vehiculo,
        placa: tiene_vehiculo ? placa?.toUpperCase() : null,
        modelo: tiene_vehiculo ? modelo : null,
        fecha_desde,
        fecha_hasta,
        estado: "Pendiente",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al insertar visitante:", insertError);
      return NextResponse.json(
        { error: `Error al guardar visitante: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 6. Registrar en auditoría (service_role para saltar RLS si aplica)
    try {
      const admin = createAdminClient();
      await admin.from("auditoria").insert({
        usuario_id: user.id,
        accion: "CREAR_VISITANTE",
        detalle: {
          visitante_id: nuevoVisitante.id,
          nombre,
          numero_documento,
          tiene_vehiculo,
          placa: nuevoVisitante.placa,
        },
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar auditoría:", auditErr);
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje: "Visitante registrado exitosamente.",
        visitante: nuevoVisitante,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error en POST /api/visitantes:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al registrar el visitante." },
      { status: 500 }
    );
  }
}
