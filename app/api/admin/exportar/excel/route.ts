// app/api/admin/exportar/excel/route.ts — Descarga de Libro Excel Oficial
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerDatosParaExportar } from "@/lib/export/fetchData";
import { generarExcelIngresoNaval } from "@/lib/export/excel";

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

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!perfil || !["admin", "auxiliar"].includes(perfil.rol)) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol Administrador o Auxiliar." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const escuelaId = searchParams.get("escuela_id") || undefined;
    const estado = searchParams.get("estado") || undefined;
    const vehiculo = searchParams.get("vehiculo") || undefined;

    const { visitantes, nombreEscuelaFiltro, tituloFiltro } = await obtenerDatosParaExportar({
      escuela_id: escuelaId,
      estado,
      vehiculo,
    });

    const buffer = await generarExcelIngresoNaval(visitantes, {
      tituloFiltro,
      nombreEscuelaFiltro,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `Ingreso_Naval_Interescuelas_2026_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error generando Excel:", error);
    return NextResponse.json(
      { error: "Error al generar archivo Excel: " + (error?.message || "Error desconocido") },
      { status: 500 }
    );
  }
}
