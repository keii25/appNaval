// app/api/auth/login/route.ts — Inicio de sesión con rate limiting y nuevo modelo de roles
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarRateLimit, registrarIntento } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  cedula: z.string().trim().min(3, "La cédula o usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { cedula, password } = parsed.data;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const cedulaNormalizada = cedula.trim();
    let emailAuth = "";
    let esAdmin = false;

    const adminSupabase = createAdminClient();

    // 1. Caso alias "admin"
    if (cedulaNormalizada.toLowerCase() === "admin") {
      const { data: adminPerfil } = await adminSupabase
        .from("perfiles")
        .select("id, cedula, rol")
        .eq("rol", "admin")
        .limit(1)
        .maybeSingle();

      if (adminPerfil) {
        esAdmin = true;
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(adminPerfil.id);
        emailAuth = authUser?.user?.email || `${adminPerfil.cedula}@naval.local`;
      }
    } else {
      // 2. Buscar por número de documento o cédula en perfiles
      const { data: perfilCheck } = await adminSupabase
        .from("perfiles")
        .select("id, cedula, rol")
        .eq("cedula", cedulaNormalizada)
        .maybeSingle();

      if (perfilCheck) {
        if (perfilCheck.rol === "admin") {
          esAdmin = true;
        }
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(perfilCheck.id);
        if (authUser?.user?.email) {
          emailAuth = authUser.user.email;
        }
      } else {
        // Cédula o identificador directo de auth (ej. 99999999)
        const emailCandidato = cedulaNormalizada.includes("@")
          ? cedulaNormalizada.toLowerCase()
          : `${cedulaNormalizada}@naval.local`;

        if (cedulaNormalizada === "99999999" || emailCandidato === "99999999@naval.local") {
          esAdmin = true;
        }
        emailAuth = emailCandidato;
      }
    }

    if (!emailAuth) {
      emailAuth = cedulaNormalizada.includes("@")
        ? cedulaNormalizada.toLowerCase()
        : `${cedulaNormalizada}@naval.local`;
    }

    // 1. Validar rate limit (exento completamente para administradores)
    if (!esAdmin) {
      const estadoLimit = await verificarRateLimit(cedulaNormalizada, ip);
      if (estadoLimit.bloqueado) {
        return NextResponse.json(
          {
            error: `Has superado el número de intentos permitidos. Cuenta bloqueada temporalmente. Por favor, reintenta en ${estadoLimit.minutosRestantes} minuto(s).`,
            bloqueado: true,
            minutosRestantes: estadoLimit.minutosRestantes,
          },
          { status: 429 }
        );
      }
    }

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: emailAuth,
        password,
      });

    if (authError || !authData.user) {
      if (!esAdmin) {
        await registrarIntento(cedulaNormalizada, ip, false);
        const limitActualizado = await verificarRateLimit(cedulaNormalizada, ip);

        if (limitActualizado.bloqueado) {
          return NextResponse.json(
            {
              error: `Credenciales incorrectas. Has alcanzado el límite máximo de intentos. Cuenta bloqueada por ${limitActualizado.minutosRestantes} minutos.`,
              bloqueado: true,
              minutosRestantes: limitActualizado.minutosRestantes,
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: `Usuario o contraseña incorrecta. Intentos restantes: ${limitActualizado.intentosRestantes}.`,
            intentosRestantes: limitActualizado.intentosRestantes,
          },
          { status: 401 }
        );
      }

      // Respuesta limpia para admin: sin intentos restantes ni advertencia de bloqueo
      return NextResponse.json(
        {
          error: "Usuario o contraseña incorrecta.",
        },
        { status: 401 }
      );
    }

    // 3. Login exitoso -> resetear contador de intentos si no es admin
    if (!esAdmin) {
      await registrarIntento(cedulaNormalizada, ip, true);
    }

    // 4. Obtener información de perfil y validar si está activo
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("id, nombre, cedula, rol, debe_cambiar_clave, activo")
      .eq("id", authData.user.id)
      .single();

    if (perfilError || !perfil) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "No se encontró el perfil de usuario asociado." },
        { status: 404 }
      );
    }

    if (perfil.activo === false) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Esta cuenta se encuentra desactivada por el administrador." },
        { status: 403 }
      );
    }

    // 5. Determinar siguiente pantalla según rol y estado de contraseña
    let redireccion = "/auxiliar";
    if (perfil.debe_cambiar_clave) {
      redireccion = "/cambiar-clave";
    } else if (perfil.rol === "admin") {
      redireccion = "/admin";
    } else if (perfil.rol === "porteria") {
      redireccion = "/porteria";
    } else if (perfil.rol === "auxiliar") {
      redireccion = "/auxiliar";
    }

    return NextResponse.json({
      ok: true,
      perfil,
      redireccion,
    });
  } catch (err) {
    console.error("Error en /api/auth/login:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al procesar la solicitud." },
      { status: 500 }
    );
  }
}
