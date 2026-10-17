// app/api/auth/logout/route.ts — Cierre de sesión seguro
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();

    return NextResponse.json({
      ok: true,
      mensaje: "Sesión cerrada correctamente.",
      redireccion: "/login",
    });
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 }
    );
  }
}
