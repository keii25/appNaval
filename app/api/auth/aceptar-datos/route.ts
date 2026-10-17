// app/api/auth/aceptar-datos/route.ts — Aceptación de política de tratamiento de datos (Ley 1581 de 2012)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Verificar sesión activa
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No hay una sesión activa. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body.acepto) {
      return NextResponse.json(
        { error: "Debes autorizar el tratamiento de datos personales para continuar." },
        { status: 400 }
      );
    }

    // 2. Actualizar estado en el perfil
    const { error: perfilError } = await supabase
      .from("perfiles")
      .update({ acepto_datos: true })
      .eq("id", user.id);

    if (perfilError) {
      return NextResponse.json(
        { error: `Error al registrar aceptación: ${perfilError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Tratamiento de datos personales aceptado.",
      redireccion: "/deportista",
    });
  } catch (err) {
    console.error("Error en /api/auth/aceptar-datos:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al procesar la aceptación." },
      { status: 500 }
    );
  }
}
