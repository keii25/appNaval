// app/api/porteria/buscar/route.ts — Consulta de Ingreso en Portería Naval (Solo Lectura)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const [visitantesRes, deportistasRes] = await Promise.all([
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
        `
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
        `
        )
        .order("creado_en", { ascending: false }),
    ]);

    if (visitantesRes.error) {
      console.error("Error consultando visitantes en portería:", visitantesRes.error);
    }
    if (deportistasRes.error) {
      console.error("Error consultando deportistas en portería:", deportistasRes.error);
    }

    const hoy = new Date().toISOString().split("T")[0];

    // 1. Mapear visitantes / acompañantes y vehículos
    const listaVisitantes = (visitantesRes.data || []).map((v: any) => {
      const dep = Array.isArray(v.deportista) ? v.deportista[0] : v.deportista;
      const esc = dep?.escuela;
      const escuelaObj = Array.isArray(esc) ? esc[0] : esc;

      const fechaValida = hoy >= v.fecha_desde && hoy <= v.fecha_hasta;
      const esAprobado = v.estado === "Aprobado";
      const accesoAutorizado = esAprobado && fechaValida;

      let motivoEstado = "";
      if (v.estado === "Pendiente") {
        motivoEstado = "Pendiente de validación de seguridad";
      } else if (v.estado === "Rechazado") {
        motivoEstado = "Ingreso DENEGADO por el Comando de Seguridad";
      } else if (!fechaValida) {
        if (hoy < v.fecha_desde) {
          motivoEstado = `Ingreso anticipado: Válido a partir del ${v.fecha_desde}`;
        } else {
          motivoEstado = `Vigencia expirada: Caducó el ${v.fecha_hasta}`;
        }
      } else {
        motivoEstado = "Autorización vigente y habilitada";
      }

      return {
        id: v.id,
        categoria_registro: "visitante" as const,
        deportista_id: v.deportista_id,
        nombre: v.nombre,
        parentesco: v.parentesco,
        tipo_documento: v.tipo_documento,
        numero_documento: v.numero_documento,
        tiene_vehiculo: Boolean(v.tiene_vehiculo),
        placa: v.placa,
        modelo: v.modelo,
        fecha_desde: v.fecha_desde,
        fecha_hasta: v.fecha_hasta,
        estado: v.estado,
        acceso_autorizado: accesoAutorizado,
        fecha_valida_hoy: fechaValida,
        motivo_estado: motivoEstado,
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
        const fechaValidaVis = hoy >= vis.fecha_desde && hoy <= vis.fecha_hasta;
        const esAprobadoVis = vis.estado === "Aprobado";
        const accesoAutorizadoVis = esAprobadoVis && fechaValidaVis;

        let motivoVis = "";
        if (vis.estado === "Pendiente") {
          motivoVis = "Pendiente de validación de seguridad";
        } else if (vis.estado === "Rechazado") {
          motivoVis = "Ingreso DENEGADO";
        } else if (!fechaValidaVis) {
          motivoVis = `Fuera de vigencia (${vis.fecha_desde} al ${vis.fecha_hasta})`;
        } else {
          motivoVis = "Autorizado";
        }

        return {
          id: vis.id,
          nombre: vis.nombre,
          parentesco: vis.parentesco || "Acompañante",
          tipo_documento: vis.tipo_documento || "CC",
          numero_documento: vis.numero_documento,
          tiene_vehiculo: Boolean(vis.tiene_vehiculo),
          placa: vis.placa,
          modelo: vis.modelo,
          fecha_desde: vis.fecha_desde,
          fecha_hasta: vis.fecha_hasta,
          estado: vis.estado,
          acceso_autorizado: accesoAutorizadoVis,
          motivo_estado: motivoVis,
        };
      });

      return {
        id: dep.id,
        categoria_registro: "deportista" as const,
        deportista_id: dep.id,
        nombre: dep.nombre_completo,
        parentesco: "Atleta / Cadete Oficial",
        tipo_documento: "CC",
        numero_documento: dep.cedula,
        tiene_vehiculo: false,
        placa: null,
        modelo: null,
        fecha_desde: hoy,
        fecha_hasta: "2026-12-31",
        estado: "Aprobado" as const,
        acceso_autorizado: true,
        fecha_valida_hoy: true,
        motivo_estado: "Acreditación deportiva oficial - XXX Juegos Interescuelas 2026",
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
        const placa = (item.placa || "").toLowerCase();
        const nom = (item.nombre || "").toLowerCase();
        const depCed = (item.deportista_cedula || "").toLowerCase();
        const depNom = (item.deportista_nombre || "").toLowerCase();
        const escNom = (item.escuela_nombre || "").toLowerCase();

        return (
          numDoc.includes(term) ||
          placa.includes(term) ||
          nom.includes(term) ||
          depCed.includes(term) ||
          depNom.includes(term) ||
          escNom.includes(term)
        );
      });
    } else {
      // Si no hay filtro, mostrar los últimos 50 registros
      resultados = resultados.slice(0, 50);
    }

    return NextResponse.json({
      ok: true,
      fecha_consulta: hoy,
      resultados,
      total: resultados.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error del servidor.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
