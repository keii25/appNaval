// app/api/porteria/buscar/route.ts — Consulta de Ingreso en Portería Naval (Solo Lectura)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EstadoPresencia } from "@/types/database";
import {
  formatearFechaVigencia,
  evaluarVigenciaVisitante,
  formatearTimestampAuditoria,
} from "@/lib/fechas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
      .select("rol, activo")
      .eq("id", user.id)
      .single();

    if (!perfil || perfil.activo === false) {
      return NextResponse.json({ error: "Cuenta inactiva o bloqueada." }, { status: 403 });
    }

    if (!["porteria", "admin", "auxiliar"].includes(perfil.rol)) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol autorizado para control de ingreso." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() || "";

    const supabaseAdmin = createAdminClient();

    // Consultar en paralelo tanto visitantes/acompañantes como deportistas acreditados
    // Consultar en paralelo tanto visitantes/acompañantes como deportistas acreditados
    // Se utiliza consulta resiliente por si la columna numero_escarapela aún no ha sido aplicada en Supabase
    let [visitantesRes, deportistasRes]: [any, any] = await Promise.all([
      supabaseAdmin
        .from("visitantes")
        .select(
          `
          id,
          deportista_id,
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
          estado,
          creado_en,
          deportista:deportistas!visitantes_deportista_id_fkey (
            id,
            nombre_completo,
            cedula,
            celular,
            escuela_id,
            escuela:escuelas!deportistas_escuela_id_fkey (
              id,
              nombre
            )
          )
        `,
          { count: "exact" }
        )
        .order("creado_en", { ascending: false }),

      supabaseAdmin
        .from("deportistas")
        .select(
          `
          id,
          nombre_completo,
          cedula,
          celular,
          numero_escarapela,
          observaciones,
          autorizacion_datos,
          creado_en,
          escuela:escuelas!deportistas_escuela_id_fkey (
            id,
            nombre
          ),
          visitantes (
            id,
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
            estado
          )
        `,
          { count: "exact" }
        )
        .order("creado_en", { ascending: false }),
    ]);

    // Si la columna numero_escarapela no existe aún en la base de datos (código 42703), reintentar sin ella
    if (visitantesRes.error?.code === "42703" || deportistasRes.error?.code === "42703") {
      [visitantesRes, deportistasRes] = await Promise.all([
        supabaseAdmin
          .from("visitantes")
          .select(
            `
            id,
            deportista_id,
            nombre,
            parentesco,
            tipo_documento,
            numero_documento,
            tiene_vehiculo,
            placa,
            modelo,
            fecha_desde,
            fecha_hasta,
            estado,
            creado_en,
            deportista:deportistas!visitantes_deportista_id_fkey (
              id,
              nombre_completo,
              cedula,
              celular,
              escuela_id,
              escuela:escuelas!deportistas_escuela_id_fkey (
                id,
                nombre
              )
            )
          `,
            { count: "exact" }
          )
          .order("creado_en", { ascending: false }),

        supabaseAdmin
          .from("deportistas")
          .select(
            `
            id,
            nombre_completo,
            cedula,
            celular,
            observaciones,
            autorizacion_datos,
            creado_en,
            escuela:escuelas!deportistas_escuela_id_fkey (
              id,
              nombre
            ),
            visitantes (
              id,
              nombre,
              parentesco,
              tipo_documento,
              numero_documento,
              tiene_vehiculo,
              placa,
              modelo,
              fecha_desde,
              fecha_hasta,
              estado
            )
          `,
            { count: "exact" }
          )
          .order("creado_en", { ascending: false }),
      ]);
    }

    if (visitantesRes.error) {
      console.error("Error consultando visitantes en portería:", visitantesRes.error);
    }
    if (deportistasRes.error) {
      console.error("Error consultando deportistas en portería:", deportistasRes.error);
    }

    // 3. Consultar últimos registros de acceso para determinar estado de presencia en tiempo real
    const { data: eventosAcceso } = await supabaseAdmin
      .from("registros_acceso")
      .select("id, tipo_sujeto, deportista_id, visitante_id, tipo_evento, creado_en")
      .order("creado_en", { ascending: false });

    const ultimoEstadoDeportista: Record<string, any> = {};
    const ultimoEstadoVisitante: Record<string, any> = {};

    if (Array.isArray(eventosAcceso)) {
      for (const ev of eventosAcceso) {
        if (ev.deportista_id && !ultimoEstadoDeportista[ev.deportista_id]) {
          ultimoEstadoDeportista[ev.deportista_id] = {
            id: ev.id,
            tipo_evento: ev.tipo_evento,
            creado_en: ev.creado_en,
            timestamp_formateado: formatearTimestampAuditoria(ev.creado_en),
          };
        }
        if (ev.visitante_id && !ultimoEstadoVisitante[ev.visitante_id]) {
          ultimoEstadoVisitante[ev.visitante_id] = {
            id: ev.id,
            tipo_evento: ev.tipo_evento,
            creado_en: ev.creado_en,
            timestamp_formateado: formatearTimestampAuditoria(ev.creado_en),
          };
        }
      }
    }

    const hoy = new Date().toISOString().split("T")[0];

    // 1. Mapear visitantes / acompañantes y vehículos
    const listaVisitantes = (visitantesRes.data || []).map((v: any) => {
      const dep = Array.isArray(v.deportista) ? v.deportista[0] : v.deportista;
      const esc = dep?.escuela;
      const escuelaObj = Array.isArray(esc) ? esc[0] : esc;

      const evaluacion = evaluarVigenciaVisitante(v.fecha_desde, v.fecha_hasta);
      const fechaValida = evaluacion.enRango;
      const esAprobado = v.estado === "Aprobado";
      const esRechazado = v.estado === "Rechazado";
      const accesoAutorizado = esAprobado && fechaValida;

      let motivoEstado = "";
      if (v.estado === "Pendiente") {
        motivoEstado = "Pendiente de validación de seguridad";
      } else if (esRechazado) {
        motivoEstado = "Ingreso DENEGADO por el Comando de Seguridad";
      } else if (evaluacion.esPrematuro) {
        motivoEstado = `Acreditación aprobada — Habilitada a partir del ${formatearFechaVigencia(v.fecha_desde)}`;
      } else if (evaluacion.esVencido) {
        motivoEstado = "Acreditación Vencida — Fuera del período autorizado";
      } else {
        motivoEstado = "Autorización vigente y habilitada para ingreso";
      }

      const ultEv = ultimoEstadoVisitante[v.id] || null;
      // Por defecto el estado de presencia es SIN_REGISTRO
      const estadoPresencia: EstadoPresencia = !ultEv ? "SIN_REGISTRO" : ultEv.tipo_evento === "SALIDA" ? "FUERA" : "DENTRO";

      return {
        id: v.id,
        categoria_registro: "visitante" as const,
        deportista_id: v.deportista_id,
        nombre: v.nombre,
        parentesco: v.parentesco,
        tipo_documento: v.tipo_documento,
        numero_documento: v.numero_documento,
        numero_escarapela: v.numero_escarapela || null,
        tiene_vehiculo: Boolean(v.tiene_vehiculo),
        placa: v.placa,
        modelo: v.modelo,
        fecha_desde: v.fecha_desde,
        fecha_hasta: v.fecha_hasta,
        fecha_desde_formateada: formatearFechaVigencia(v.fecha_desde),
        fecha_hasta_formateada: formatearFechaVigencia(v.fecha_hasta),
        estado: v.estado,
        acceso_autorizado: accesoAutorizado,
        fecha_valida_hoy: fechaValida,
        es_prematuro: evaluacion.esPrematuro,
        es_vencido: evaluacion.esVencido,
        alerta_vigencia: evaluacion.esVencido
          ? "Acreditación Vencida"
          : evaluacion.esPrematuro
          ? `Vigencia Próxima (Habilitada a partir de: ${formatearFechaVigencia(v.fecha_desde)})`
          : null,
        motivo_estado: motivoEstado,
        estado_presencia: estadoPresencia,
        ultimo_evento: ultEv,
        deportista_nombre: dep?.nombre_completo || "—",
        deportista_cedula: dep?.cedula || "—",
        deportista_celular: dep?.celular || "—",
        escuela_nombre: escuelaObj?.nombre || "—",
        creado_en: v.creado_en,
      };
    });

    // 2. Mapear deportistas / atletas / cadetes acreditados en el padrón
    const listaDeportistas = (deportistasRes.data || []).map((dep: any) => {
      const esc = dep?.escuela;
      const escuelaObj = Array.isArray(esc) ? esc[0] : esc;
      const visitantesList = Array.isArray(dep?.visitantes) ? dep.visitantes : [];
      const totalVis = visitantesList.length;

      const visitantesAsociados = visitantesList.map((vis: any) => {
        const evaluacionVis = evaluarVigenciaVisitante(vis.fecha_desde, vis.fecha_hasta);
        const fechaValidaVis = evaluacionVis.enRango;
        const esAprobadoVis = vis.estado === "Aprobado";
        const esRechazadoVis = vis.estado === "Rechazado";
        const accesoAutorizadoVis = esAprobadoVis && fechaValidaVis;

        let motivoVis = "";
        if (vis.estado === "Pendiente") {
          motivoVis = "Pendiente de validación de seguridad";
        } else if (esRechazadoVis) {
          motivoVis = "Ingreso DENEGADO";
        } else if (evaluacionVis.esPrematuro) {
          motivoVis = `Acreditado — A partir del ${formatearFechaVigencia(vis.fecha_desde)}`;
        } else if (evaluacionVis.esVencido) {
          motivoVis = "Acreditación Vencida";
        } else {
          motivoVis = "Autorizado para ingreso";
        }

        const ultEvVis = ultimoEstadoVisitante[vis.id] || null;
        const estadoPresenciaVis: EstadoPresencia = !ultEvVis ? "SIN_REGISTRO" : ultEvVis.tipo_evento === "SALIDA" ? "FUERA" : "DENTRO";

        return {
          id: vis.id,
          nombre: vis.nombre,
          parentesco: vis.parentesco || "Acompañante",
          tipo_documento: vis.tipo_documento || "CC",
          numero_documento: vis.numero_documento,
          numero_escarapela: vis.numero_escarapela || null,
          tiene_vehiculo: Boolean(vis.tiene_vehiculo),
          placa: vis.placa,
          modelo: vis.modelo,
          fecha_desde: vis.fecha_desde,
          fecha_hasta: vis.fecha_hasta,
          fecha_desde_formateada: formatearFechaVigencia(vis.fecha_desde),
          fecha_hasta_formateada: formatearFechaVigencia(vis.fecha_hasta),
          estado: vis.estado,
          acceso_autorizado: accesoAutorizadoVis,
          es_prematuro: evaluacionVis.esPrematuro,
          es_vencido: evaluacionVis.esVencido,
          alerta_vigencia: evaluacionVis.esVencido
            ? "Acreditación Vencida"
            : evaluacionVis.esPrematuro
            ? `Vigencia Próxima (A partir de: ${formatearFechaVigencia(vis.fecha_desde)})`
            : null,
          motivo_estado: motivoVis,
          estado_presencia: estadoPresenciaVis,
          ultimo_evento: ultEvVis,
        };
      });

      const ultEvDep = ultimoEstadoDeportista[dep.id] || null;
      const estadoPresenciaDep: EstadoPresencia = !ultEvDep ? "SIN_REGISTRO" : ultEvDep.tipo_evento === "SALIDA" ? "FUERA" : "DENTRO";

      return {
        id: dep.id,
        categoria_registro: "deportista" as const,
        deportista_id: dep.id,
        nombre: dep.nombre_completo,
        parentesco: "Atleta / Cadete Oficial",
        tipo_documento: "CC",
        numero_documento: dep.cedula,
        numero_escarapela: dep.numero_escarapela || null,
        tiene_vehiculo: false,
        placa: null,
        modelo: null,
        fecha_desde: hoy,
        fecha_hasta: "2026-12-31",
        fecha_desde_formateada: formatearFechaVigencia(hoy),
        fecha_hasta_formateada: formatearFechaVigencia("2026-12-31"),
        estado: "Aprobado" as const,
        acceso_autorizado: true,
        fecha_valida_hoy: true,
        alerta_vigencia: null,
        motivo_estado: "Acreditación deportiva oficial - XXX Juegos Interescuelas 2026",
        estado_presencia: estadoPresenciaDep,
        ultimo_evento: ultEvDep,
        deportista_nombre: dep.nombre_completo,
        deportista_cedula: dep.cedula,
        deportista_celular: dep.celular || "—",
        escuela_nombre: escuelaObj?.nombre || "Escuela Naval de Cadetes",
        total_visitantes_inscritos: totalVis,
        visitantes_asociados: visitantesAsociados,
        creado_en: dep.creado_en,
      };
    });

    // Unir ambas fuentes: Acompañantes y Deportistas
    let resultados = [...listaVisitantes, ...listaDeportistas];

    // Ordenar por fecha de creación descendente
    resultados.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());

    // Filtrar por término de búsqueda de manera 100% segura contra nulos
    if (q) {
      const term = q.toLowerCase();
      resultados = resultados.filter((item) => {
        const numDoc = (item.numero_documento || "").toLowerCase();
        const escNum = (item.numero_escarapela || "").toLowerCase();
        const placa = (item.placa || "").toLowerCase();
        const nom = (item.nombre || "").toLowerCase();
        const depCed = (item.deportista_cedula || "").toLowerCase();
        const depNom = (item.deportista_nombre || "").toLowerCase();
        const escNom = (item.escuela_nombre || "").toLowerCase();

        return (
          numDoc.includes(term) ||
          escNum.includes(term) ||
          placa.includes(term) ||
          nom.includes(term) ||
          depCed.includes(term) ||
          depNom.includes(term) ||
          escNom.includes(term)
        );
      });
    }

    const totalVisitantes = visitantesRes.count ?? listaVisitantes.length;
    const totalDeportistas = deportistasRes.count ?? listaDeportistas.length;
    const totalVehiculos = (visitantesRes.data || []).filter((v: any) => Boolean(v.tiene_vehiculo)).length;

    return NextResponse.json({
      ok: true,
      fecha_consulta: hoy,
      stats: {
        total_visitantes: totalVisitantes,
        total_deportistas: totalDeportistas,
        total_vehiculos: totalVehiculos,
      },
      resultados,
      total: resultados.length,
      total_encontrados: resultados.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
