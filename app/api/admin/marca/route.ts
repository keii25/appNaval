// app/api/admin/marca/route.ts — Gestión de Marca y Textos Dinámicos
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MARCA } from "@/lib/marca/defaults";
import type { ConfiguracionMarca } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // Usar cliente admin para garantizar lectura completa
    const adminSupabase = createAdminClient();
    const { data: marca, error: marcaError } = await adminSupabase
      .from("configuracion_marca")
      .select("*")
      .eq("id", 1)
      .single();

    if (marcaError) {
      console.warn("No se encontró configuracion_marca id=1, usando defaults:", marcaError);
      return NextResponse.json({ ok: true, marca: DEFAULT_MARCA });
    }

    return NextResponse.json({ ok: true, marca });
  } catch (err) {
    console.error("Error en GET /api/admin/marca:", err);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = (await request.json()) as Partial<ConfiguracionMarca>;

    // Validación básica de campos requeridos
    const nombreActividad = body.nombre_actividad?.trim() || DEFAULT_MARCA.nombre_actividad;
    const nombreCorto = body.nombre_corto?.trim() || DEFAULT_MARCA.nombre_corto;
    const lema = body.lema !== undefined ? body.lema.trim() : DEFAULT_MARCA.lema;
    const organizacion = body.organizacion?.trim() || DEFAULT_MARCA.organizacion;
    const lugar = body.lugar !== undefined ? body.lugar.trim() : DEFAULT_MARCA.lugar;
    const logoClaroUrl = body.logo_claro_url?.trim() || DEFAULT_MARCA.logo_claro_url;
    const logoOscuroUrl = body.logo_oscuro_url ? body.logo_oscuro_url.trim() : null;
    const iconoUrl = body.icono_url?.trim() || DEFAULT_MARCA.icono_url;
    const mascotaUrl = body.mascota_url ? body.mascota_url.trim() : null;
    const colorAcento = body.color_acento?.trim() || DEFAULT_MARCA.color_acento;
    const avisoDatos = body.aviso_datos !== undefined ? body.aviso_datos : DEFAULT_MARCA.aviso_datos;
    const flagMarcaDinamica = Boolean(body.flag_marca_dinamica);

    const textosLogin = body.textos_login || DEFAULT_MARCA.textos_login;
    const vocabulario = body.vocabulario || DEFAULT_MARCA.vocabulario;

    const adminSupabase = createAdminClient();

    // Obtener valor previo para auditoría
    const { data: marcaPrevia } = await adminSupabase
      .from("configuracion_marca")
      .select("*")
      .eq("id", 1)
      .single();

    const updatePayload = {
      nombre_actividad: nombreActividad,
      nombre_corto: nombreCorto,
      lema,
      organizacion,
      lugar,
      logo_claro_url: logoClaroUrl,
      logo_oscuro_url: logoOscuroUrl,
      icono_url: iconoUrl,
      mascota_url: mascotaUrl,
      color_acento: colorAcento,
      textos_login: textosLogin,
      aviso_datos: avisoDatos,
      vocabulario,
      flag_marca_dinamica: flagMarcaDinamica,
      actualizado_por: user.id,
      actualizado_en: new Date().toISOString(),
    };

    const { data: marcaActualizada, error: updateError } = await adminSupabase
      .from("configuracion_marca")
      .upsert({ id: 1, ...updatePayload })
      .select()
      .single();

    if (updateError) {
      console.error("Error al actualizar configuracion_marca:", updateError);
      return NextResponse.json(
        { error: `No fue posible actualizar la configuración de marca: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    try {
      await adminSupabase.from("auditoria").insert({
        usuario_id: user.id,
        accion: "CAMBIAR_CONFIGURACION_MARCA",
        detalle: {
          flag_anterior: marcaPrevia?.flag_marca_dinamica,
          nuevo_flag: flagMarcaDinamica,
          nombre_actividad: nombreActividad,
          nombre_corto: nombreCorto,
        },
        fecha: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar en auditoria:", auditErr);
    }

    return NextResponse.json({
      ok: true,
      marca: marcaActualizada,
      mensaje: "Configuración de marca actualizada exitosamente.",
    });
  } catch (err) {
    console.error("Error en PUT /api/admin/marca:", err);
    return NextResponse.json(
      { error: "Error inesperado al guardar la marca." },
      { status: 500 }
    );
  }
}
