// app/api/admin/importar/route.ts — Carga masiva de deportistas desde CSV (Nuevo Modelo)
import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface CsvFila {
  nombre?: string;
  nombre_completo?: string;
  cedula?: string;
  documento?: string;
  celular?: string;
  telefono?: string;
  escuela?: string;
  unidad?: string;
  observaciones?: string;
}

interface ErrorFila {
  fila: number;
  cedula: string;
  nombre: string;
  error: string;
}

const CEDULA_REGEX = /^\d{6,12}$/;
const CELULAR_REGEX = /^3\d{9}$/;

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

    // Verificar rol admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfil?.rol !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de administrador." },
        { status: 403 }
      );
    }

    // Leer contenido CSV desde FormData o Body de texto
    let csvContenido = "";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No se seleccionó ningún archivo CSV." },
          { status: 400 }
        );
      }
      csvContenido = await file.text();
    } else {
      csvContenido = await request.text();
    }

    if (!csvContenido.trim()) {
      return NextResponse.json(
        { error: "El archivo o contenido CSV está vacío." },
        { status: 400 }
      );
    }

    // Parsear CSV con csv-parse
    let filas: CsvFila[];
    try {
      filas = parse(csvContenido, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as CsvFila[];
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: `Error al procesar el formato CSV: ${(parseErr as Error).message}. Encabezados soportados: nombre,cedula,celular,escuela,observaciones`,
        },
        { status: 400 }
      );
    }

    if (filas.length === 0) {
      return NextResponse.json(
        { error: "El CSV no contiene registros de datos válidos." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Cargar catálogo de escuelas en memoria para mapeo rápido
    const { data: escuelasExistentes } = await adminClient
      .from("escuelas")
      .select("id, nombre");

    const mapaEscuelas: Map<string, string> = new Map();
    (escuelasExistentes || []).forEach((e) => {
      mapaEscuelas.set(e.nombre.toLowerCase().trim(), e.id);
    });

    let creados = 0;
    let omitidos = 0;
    const errores: ErrorFila[] = [];

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const numeroFila = i + 2;

      const nombre = (fila.nombre_completo || fila.nombre || "").trim();
      const cedula = (fila.documento || fila.cedula || "").replace(/[^0-9]/g, "").trim();
      let celular = (fila.celular || fila.telefono || "").replace(/[^0-9]/g, "").trim();
      const nombreEscuelaRaw = (fila.escuela || fila.unidad || "Escuela Naval de Cadetes \"Almirante Padilla\"").trim();
      const observaciones = (fila.observaciones || "").trim();

      // Si no se proporcionó celular válido, asignar celular institucional predeterminado
      if (!celular || !CELULAR_REGEX.test(celular)) {
        celular = "3000000000";
      }

      // Validaciones
      if (!nombre) {
        errores.push({
          fila: numeroFila,
          cedula: cedula || "—",
          nombre: "—",
          error: "El campo de nombre está vacío.",
        });
        continue;
      }

      if (!cedula) {
        errores.push({
          fila: numeroFila,
          cedula: "—",
          nombre,
          error: "El campo de documento/cédula está vacío.",
        });
        continue;
      }

      if (!CEDULA_REGEX.test(cedula)) {
        errores.push({
          fila: numeroFila,
          cedula,
          nombre,
          error: `Cédula inválida '${cedula}' (debe contener entre 6 y 12 dígitos numéricos).`,
        });
        continue;
      }

      try {
        // 2. Mapear o crear la Escuela
        const keyEscuela = nombreEscuelaRaw.toLowerCase();
        let escuelaId = mapaEscuelas.get(keyEscuela);

        if (!escuelaId) {
          // Crear la escuela en el catálogo si no existía
          const { data: nuevaEscuela, error: errNuevaEscuela } = await adminClient
            .from("escuelas")
            .insert({ nombre: nombreEscuelaRaw, activa: true })
            .select("id, nombre")
            .single();

          if (errNuevaEscuela || !nuevaEscuela) {
            errores.push({
              fila: numeroFila,
              cedula,
              nombre,
              error: `Error creando escuela '${nombreEscuelaRaw}': ${errNuevaEscuela?.message}`,
            });
            continue;
          }

          escuelaId = nuevaEscuela.id;
          mapaEscuelas.set(keyEscuela, nuevaEscuela.id);
        }

        if (!escuelaId) {
          errores.push({
            fila: numeroFila,
            cedula,
            nombre,
            error: `No se pudo determinar el ID de la escuela '${nombreEscuelaRaw}'.`,
          });
          continue;
        }

        // 3. Verificar si el deportista ya existe por documento
        const { data: existente } = await adminClient
          .from("deportistas")
          .select("id")
          .eq("cedula", cedula)
          .maybeSingle();

        if (existente) {
          // Ya existe: omitir o actualizar datos
          await adminClient
            .from("deportistas")
            .update({
              nombre_completo: nombre,
              celular,
              escuela_id: escuelaId,
              observaciones: observaciones || null,
            })
            .eq("id", existente.id);

          omitidos++;
          continue;
        }

        // 4. Insertar nuevo deportista (con autorización Ley 1581 explícita)
        const { error: insertError } = await adminClient.from("deportistas").insert({
          nombre_completo: nombre,
          cedula,
          celular,
          escuela_id: escuelaId,
          observaciones: observaciones || null,
          autorizacion_datos: true,
          autorizado_por: user.id,
          creado_por: user.id,
        });

        if (insertError) {
          errores.push({
            fila: numeroFila,
            cedula,
            nombre,
            error: `Error guardando deportista: ${insertError.message}`,
          });
          continue;
        }

        creados++;
      } catch (errFila) {
        errores.push({
          fila: numeroFila,
          cedula,
          nombre,
          error: `Excepción: ${(errFila as Error).message}`,
        });
      }
    }

    // Registrar en auditoría
    await supabase.from("auditoria").insert({
      usuario_id: user.id,
      accion: "IMPORTAR_DEPORTISTAS",
      entidad: "deportistas",
      detalle: {
        total_filas: filas.length,
        creados,
        omitidos,
        errores_cantidad: errores.length,
      },
      fecha: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      reporte: {
        total: filas.length,
        creados,
        omitidos,
        errores_cantidad: errores.length,
        errores,
      },
      mensaje: `Importación completada: ${creados} deportistas registrados, ${omitidos} actualizados, ${errores.length} con error.`,
    });
  } catch (err) {
    console.error("Error en POST /api/admin/importar:", err);
    return NextResponse.json(
      { error: "Error en el servidor al procesar la importación CSV." },
      { status: 500 }
    );
  }
}
