// app/api/porteria/escarapela/route.ts — Asignación y Actualización de Escarapelas en Portería Naval
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarEscarapelaUnica } from "@/lib/validations/escarapela";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Verificar rol de portería, auxiliar o admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id, nombre, rol, activo")
      .eq("id", user.id)
      .single();

    if (!perfil || perfil.activo === false) {
      return NextResponse.json({ error: "Cuenta inactiva o bloqueada." }, { status: 403 });
    }

    if (!["porteria", "admin", "auxiliar"].includes(perfil.rol)) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol autorizado para asignar escarapelas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, tipo_sujeto, numero_escarapela } = body as {
      id?: string;
      tipo_sujeto?: "deportista" | "visitante";
      numero_escarapela?: string | null;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Falta el identificador del registro (id)." },
        { status: 400 }
      );
    }

    if (!tipo_sujeto || !["deportista", "visitante"].includes(tipo_sujeto)) {
      return NextResponse.json(
        { error: "Parámetro 'tipo_sujeto' inválido. Debe ser 'deportista' o 'visitante'." },
        { status: 400 }
      );
    }

    // Normalizar número de escarapela: solo dígitos, admite ceros a la izquierda, o null si está vacío
    const escarapelaLimpia =
      typeof numero_escarapela === "string"
        ? numero_escarapela.replace(/[^0-9]/g, "").trim()
        : null;
    const escarapelaFinal = escarapelaLimpia && escarapelaLimpia.length > 0 ? escarapelaLimpia : null;

    const supabaseAdmin = createAdminClient();

    // 1. Obtener registro previo y validar existencia
    let anteriorEscarapela: string | null = null;
    let nombreSujeto = "";

    if (tipo_sujeto === "deportista") {
      const { data: dep, error: depError } = await supabaseAdmin
        .from("deportistas")
        .select("id, nombre_completo, cedula, numero_escarapela")
        .eq("id", id)
        .single();

      if (depError || !dep) {
        return NextResponse.json({ error: "Participante no encontrado en el padrón." }, { status: 404 });
      }
      anteriorEscarapela = dep.numero_escarapela || null;
      nombreSujeto = dep.nombre_completo;
    } else {
      const { data: vis, error: visError } = await supabaseAdmin
        .from("visitantes")
        .select("id, nombre, numero_documento, numero_escarapela")
        .eq("id", id)
        .single();

      if (visError || !vis) {
        return NextResponse.json({ error: "Visitante no encontrado en el padrón." }, { status: 404 });
      }
      anteriorEscarapela = vis.numero_escarapela || null;
      nombreSujeto = vis.nombre;
    }

    // 2. Si se asigna un valor, validar unicidad global reutilizando validarEscarapelaUnica
    if (escarapelaFinal) {
      const valEscarapela = await validarEscarapelaUnica(supabaseAdmin, escarapelaFinal, {
        excludeDeportistaId: tipo_sujeto === "deportista" ? id : undefined,
        excludeVisitanteId: tipo_sujeto === "visitante" ? id : undefined,
      });

      if (!valEscarapela.esValido) {
        return NextResponse.json({ error: valEscarapela.mensajeError }, { status: 409 });
      }
    }

    // 3. Actualizar ÚNICAMENTE el campo numero_escarapela (principio de mínimo privilegio)
    if (tipo_sujeto === "deportista") {
      const { error: updateError } = await supabaseAdmin
        .from("deportistas")
        .update({ numero_escarapela: escarapelaFinal })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Error al actualizar escarapela: " + updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("visitantes")
        .update({
          numero_escarapela: escarapelaFinal,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Error al actualizar escarapela: " + updateError.message },
          { status: 500 }
        );
      }
    }

    // 4. Registro de auditoría
    try {
      await supabaseAdmin.from("auditoria").insert({
        usuario_id: user.id,
        accion: tipo_sujeto === "deportista" ? "EDITAR_DEPORTISTA" : "EDITAR_VISITANTE",
        entidad: tipo_sujeto === "deportista" ? "deportistas" : "visitantes",
        entidad_id: id,
        detalle: {
          tipo_sujeto,
          operacion: "ASIGNAR_ESCARAPELA",
          nombre_sujeto: nombreSujeto,
          anterior_escarapela: anteriorEscarapela,
          nueva_escarapela: escarapelaFinal,
          asignado_por: perfil.nombre,
          rol_asignador: perfil.rol,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.error("Error al registrar auditoría de escarapela:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      mensaje: escarapelaFinal
        ? `Escarapela #${escarapelaFinal} asignada a ${nombreSujeto}.`
        : `Escarapela retirada / liberada de ${nombreSujeto}.`,
      registro: {
        id,
        tipo_sujeto,
        numero_escarapela: escarapelaFinal,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
