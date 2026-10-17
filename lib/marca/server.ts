// lib/marca/server.ts — Punto único de acceso a la marca en el servidor (con caché y fallback)
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_MARCA } from "./defaults";
import type { ConfiguracionMarca } from "@/types/database";

/**
 * Obtiene la configuración de marca activa en el servidor.
 * - Si flag_marca_dinamica está apagado (false), retorna DEFAULT_MARCA garantizando el estado actual.
 * - Si flag_marca_dinamica está encendido (true), retorna los valores de la BD fusionados con defaults.
 * - En caso de error de red o BD, retorna DEFAULT_MARCA (nunca pantalla en blanco ni undefined).
 */
export async function getMarca(): Promise<ConfiguracionMarca> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("configuracion_marca")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return DEFAULT_MARCA;
    }

    const row = data as ConfiguracionMarca;

    // Si la bandera está apagada, se respeta estrictamente la configuración original
    if (!row.flag_marca_dinamica) {
      return {
        ...DEFAULT_MARCA,
        flag_marca_dinamica: false,
      };
    }

    // Fusión defensiva con los defaults para evitar claves nulas o indefinidas
    return {
      id: 1,
      nombre_actividad: row.nombre_actividad || DEFAULT_MARCA.nombre_actividad,
      nombre_corto: row.nombre_corto || DEFAULT_MARCA.nombre_corto,
      lema: row.lema ?? DEFAULT_MARCA.lema,
      organizacion: row.organizacion || DEFAULT_MARCA.organizacion,
      lugar: row.lugar || DEFAULT_MARCA.lugar,
      logo_claro_url: row.logo_claro_url || DEFAULT_MARCA.logo_claro_url,
      logo_oscuro_url: row.logo_oscuro_url ?? DEFAULT_MARCA.logo_oscuro_url,
      icono_url: row.icono_url || DEFAULT_MARCA.icono_url,
      mascota_url: row.mascota_url ?? DEFAULT_MARCA.mascota_url,
      color_acento: row.color_acento || DEFAULT_MARCA.color_acento,
      textos_login: {
        ...DEFAULT_MARCA.textos_login,
        ...(row.textos_login || {}),
      },
      aviso_datos: row.aviso_datos || DEFAULT_MARCA.aviso_datos,
      aviso_actualizado_en: row.aviso_actualizado_en || DEFAULT_MARCA.aviso_actualizado_en,
      vocabulario: {
        participante: {
          ...DEFAULT_MARCA.vocabulario.participante,
          ...(row.vocabulario?.participante || {}),
        },
        entidad: {
          ...DEFAULT_MARCA.vocabulario.entidad,
          ...(row.vocabulario?.entidad || {}),
        },
        visitante: {
          ...DEFAULT_MARCA.vocabulario.visitante,
          ...(row.vocabulario?.visitante || {}),
        },
        parentescos:
          Array.isArray(row.vocabulario?.parentescos) &&
          row.vocabulario.parentescos.length > 0
            ? row.vocabulario.parentescos
            : DEFAULT_MARCA.vocabulario.parentescos,
      },
      flag_marca_dinamica: true,
      actualizado_por: row.actualizado_por ?? null,
      actualizado_en: row.actualizado_en || DEFAULT_MARCA.actualizado_en,
    };
  } catch (err) {
    console.error("Error al obtener configuracion_marca en servidor:", err);
    return DEFAULT_MARCA;
  }
}
