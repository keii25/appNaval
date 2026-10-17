// middleware.ts — Protección de rutas por rol con Supabase SSR (Fase 2 Ajustada)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Rol } from "@/types/database";

// Rutas públicas que no requieren sesión
const PUBLIC_ROUTES = ["/login", "/api/auth", "/design-system"];

// Mapa de prefijo de ruta -> roles autorizados
const ROLE_MAP: Record<string, Rol[]> = {
  "/admin": ["admin"],
  "/auxiliar": ["auxiliar", "admin"],
  "/porteria": ["porteria", "admin"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pasar rutas públicas, estáticos y assets de Next.js
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/manifest")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Obtener sesión activa de Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión -> si es API retornar 401, si es página redirigir a /login
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Obtener perfil con rol y estado activo
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, debe_cambiar_clave, activo")
    .eq("id", user.id)
    .single();

  // Si no tiene perfil o la cuenta está desactivada
  if (!perfil || perfil.activo === false) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: perfil?.activo === false ? "Cuenta desactivada." : "Perfil no encontrado." },
        { status: 403 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (perfil?.activo === false) {
      loginUrl.searchParams.set("error", "inactivo");
    }
    return NextResponse.redirect(loginUrl);
  }

  const rol: Rol = perfil.rol;

  // Forzar cambio obligatorio de clave (ej. Auxiliares en primer ingreso)
  if (
    perfil.debe_cambiar_clave &&
    !pathname.startsWith("/cambiar-clave") &&
    !pathname.startsWith("/api/auth")
  ) {
    const claveUrl = request.nextUrl.clone();
    claveUrl.pathname = "/cambiar-clave";
    return NextResponse.redirect(claveUrl);
  }

  // Helper de panel por rol
  const getPanelUrl = (r: Rol) => {
    switch (r) {
      case "admin":
        return "/admin";
      case "porteria":
        return "/porteria";
      case "auxiliar":
      default:
        return "/auxiliar";
    }
  };

  // Verificar autorización por rol a la ruta solicitada
  for (const [prefix, roles] of Object.entries(ROLE_MAP)) {
    if (pathname.startsWith(prefix) && !roles.includes(rol)) {
      const panelUrl = request.nextUrl.clone();
      panelUrl.pathname = getPanelUrl(rol);
      return NextResponse.redirect(panelUrl);
    }
  }

  // Redirigir la raíz "/" al panel asignado del rol
  if (pathname === "/") {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = getPanelUrl(rol);
    return NextResponse.redirect(panelUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)",
  ],
};
