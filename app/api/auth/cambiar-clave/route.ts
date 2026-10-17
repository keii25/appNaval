// app/api/auth/cambiar-clave/route.ts — Cambio de contraseña obligatorio (Fase 2 Ajustada)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cambiarClaveSchema } from "@/lib/validations/visitante";

export const dynamic = "force-dynamic";

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

    // 2. Obtener perfil actual para validar contra la cédula
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("id, cedula, rol, debe_cambiar_clave, activo")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json(
        { error: "No se encontró el perfil de usuario." },
        { status: 404 }
      );
    }

    if (perfil.activo === false) {
      return NextResponse.json(
        { error: "Esta cuenta se encuentra desactivada." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 3. Validar con zod (incluyendo validación contra la cédula)
    const validation = cambiarClaveSchema.safeParse({
      clave_nueva: body.clave_nueva,
      confirmar_clave: body.confirmar_clave,
      cedula: perfil.cedula,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { clave_nueva } = validation.data;

    // 4. Actualizar contraseña en Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: clave_nueva,
    });

    if (updateAuthError) {
      return NextResponse.json(
        { error: `Error al actualizar contraseña: ${updateAuthError.message}` },
        { status: 500 }
      );
    }

    // 5. Marcar debe_cambiar_clave = false en perfiles
    const { error: updatePerfilError } = await supabase
      .from("perfiles")
      .update({ debe_cambiar_clave: false })
      .eq("id", user.id);

    if (updatePerfilError) {
      return NextResponse.json(
        { error: `Error al actualizar perfil: ${updatePerfilError.message}` },
        { status: 500 }
      );
    }

    // 6. Determinar siguiente pantalla según rol
    let redireccion = "/auxiliar";
    if (perfil.rol === "admin") {
      redireccion = "/admin";
    } else if (perfil.rol === "porteria") {
      redireccion = "/porteria";
    } else if (perfil.rol === "auxiliar") {
      redireccion = "/auxiliar";
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Contraseña actualizada exitosamente.",
      redireccion,
    });
  } catch (err) {
    console.error("Error en /api/auth/cambiar-clave:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al cambiar la contraseña." },
      { status: 500 }
    );
  }
}
