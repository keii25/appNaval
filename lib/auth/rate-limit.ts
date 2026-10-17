// lib/auth/rate-limit.ts — Control de intentos fallidos y bloqueo temporal
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

// Almacenamiento en memoria como fallback o protección rápida
interface IntentoLocal {
  conteo: number;
  bloqueadoHasta?: number;
}
const cacheLocal = new Map<string, IntentoLocal>();

export interface EstadoRateLimit {
  bloqueado: boolean;
  intentosRestantes: number;
  minutosRestantes?: number;
}

export async function verificarRateLimit(
  cedula: string,
  ip: string = ""
): Promise<EstadoRateLimit> {
  const ahora = Date.now();
  const clave = `${cedula.trim()}_${ip}`;

  // 1. Revisar memoria local primero
  const local = cacheLocal.get(clave);
  if (local?.bloqueadoHasta && local.bloqueadoHasta > ahora) {
    const minutosRestantes = Math.ceil((local.bloqueadoHasta - ahora) / 60000);
    return {
      bloqueado: true,
      intentosRestantes: 0,
      minutosRestantes: Math.max(1, minutosRestantes),
    };
  }

  // 2. Revisar base de datos si las variables están disponibles
  try {
    const supabase = createAdminClient();
    const tiempoVentana = new Date(ahora - VENTANA_MINUTOS * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("intentos_login")
      .select("id, exitoso, fecha")
      .eq("cedula", cedula.trim())
      .gte("fecha", tiempoVentana)
      .order("fecha", { ascending: false });

    if (!error && data) {
      // Contar fallos consecutivos recientes
      let fallos = 0;
      for (const intento of data) {
        if (intento.exitoso) break; // Un éxito corta la racha de fallos
        fallos++;
      }

      if (fallos >= MAX_INTENTOS) {
        const masReciente = new Date(data[0].fecha).getTime();
        const tiempoDesbloqueo = masReciente + VENTANA_MINUTOS * 60 * 1000;
        const restanteMs = tiempoDesbloqueo - ahora;

        if (restanteMs > 0) {
          const minutos = Math.ceil(restanteMs / 60000);
          cacheLocal.set(clave, { conteo: fallos, bloqueadoHasta: tiempoDesbloqueo });
          return {
            bloqueado: true,
            intentosRestantes: 0,
            minutosRestantes: Math.max(1, minutos),
          };
        }
      }

      return {
        bloqueado: false,
        intentosRestantes: Math.max(0, MAX_INTENTOS - fallos),
      };
    }
  } catch {
    // Si falla la consulta a BD, nos basamos en el contador local
  }

  const intentosActuales = local?.conteo || 0;
  if (intentosActuales >= MAX_INTENTOS) {
    return {
      bloqueado: true,
      intentosRestantes: 0,
      minutosRestantes: VENTANA_MINUTOS,
    };
  }

  return {
    bloqueado: false,
    intentosRestantes: Math.max(0, MAX_INTENTOS - intentosActuales),
  };
}

export async function registrarIntento(
  cedula: string,
  ip: string = "",
  exitoso: boolean
): Promise<void> {
  const clave = `${cedula.trim()}_${ip}`;
  const ahora = Date.now();

  if (exitoso) {
    cacheLocal.delete(clave);
  } else {
    const previo = cacheLocal.get(clave);
    const nuevoConteo = (previo?.conteo || 0) + 1;
    let bloqueadoHasta: number | undefined;

    if (nuevoConteo >= MAX_INTENTOS) {
      bloqueadoHasta = ahora + VENTANA_MINUTOS * 60 * 1000;
    }

    cacheLocal.set(clave, { conteo: nuevoConteo, bloqueadoHasta });
  }

  // Guardar en tabla de BD si es posible
  try {
    const supabase = createAdminClient();
    await supabase.from("intentos_login").insert({
      cedula: cedula.trim(),
      ip: ip || "desconocida",
      exitoso,
    });
  } catch {
    // Si no está la tabla aún, no rompe el flujo
  }
}
