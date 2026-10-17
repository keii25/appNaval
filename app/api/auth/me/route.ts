// app/api/auth/me/route.ts — Consulta del usuario y perfil autenticado
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("id, nombre, cedula, unidad, rol, debe_cambiar_clave, acepto_datos")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json(
        { autenticado: true, user, perfil: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      autenticado: true,
      user,
      perfil,
    });
  } catch (err) {
    console.error("Error en /api/auth/me:", err);
    return NextResponse.json(
      { error: "Error al consultar usuario actual" },
      { status: 500 }
    );
  }
}
