// scripts/seed-auxiliares.ts — Creación y gestión de las 3 cuentas de Auxiliar
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const AUXILIARES_PREDETERMINADOS = [
  {
    cedula: "71000001",
    nombre: "Auxiliar Mesa Uno",
    unidad: "Atención y Registro",
  },
  {
    cedula: "71000002",
    nombre: "Auxiliar Mesa Dos",
    unidad: "Atención y Registro",
  },
  {
    cedula: "71000003",
    nombre: "Auxiliar Mesa Tres",
    unidad: "Atención y Registro",
  },
];

export async function crearOActualizarAuxiliar(
  cedula: string,
  nombre: string,
  unidad: string,
  debeCambiarClave: boolean = false
) {
  const email = `${cedula}@naval.local`;
  console.log(`Configurando auxiliar: ${cedula} — ${nombre}...`);

  // 1. Verificar si existe en perfiles
  const { data: perfilExistente } = await supabase
    .from("perfiles")
    .select("id, rol")
    .eq("cedula", cedula)
    .maybeSingle();

  let userId = perfilExistente?.id;

  if (!userId) {
    // Crear en Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: cedula,
        email_confirm: true,
        user_metadata: { nombre, cedula, unidad },
      });

    if (authError) {
      if (
        authError.message.includes("already") ||
        authError.code === "email_exists"
      ) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const found = listData.users.find((u) => u.email === email);
        if (found) userId = found.id;
      } else {
        console.error(`  ❌ Error creando auth para ${cedula}:`, authError.message);
        return false;
      }
    } else {
      userId = authData.user?.id;
    }
  }

  if (userId) {
    // Asegurar que la contraseña en Auth sea la cédula
    await supabase.auth.admin.updateUserById(userId, {
      password: cedula,
      user_metadata: { nombre, cedula, unidad },
    });

    // Establecer rol auxiliar, debe_cambiar_clave (false por defecto) y activo = true
    const { error: perfilError } = await supabase.from("perfiles").upsert({
      id: userId,
      nombre,
      cedula,
      unidad,
      rol: "auxiliar",
      debe_cambiar_clave: debeCambiarClave,
      activo: true,
      acepto_datos: true,
    });

    if (perfilError) {
      console.error(`  ❌ Error actualizando perfil de ${cedula}:`, perfilError.message);
      return false;
    }

    console.log(
      `  ✓ Auxiliar listo: Cédula ${cedula} | Clave ${cedula} | Cambio obligatorio: ${debeCambiarClave ? "SÍ" : "NO (Cédula fija)"}`
    );
    return true;
  }

  return false;
}

async function main() {
  console.log("════════════════════════════════════════════════════════════");
  console.log(" CREACIÓN DE LAS 3 CUENTAS DE AUXILIAR — FASE 1 AJUSTADA");
  console.log("════════════════════════════════════════════════════════════\n");

  for (const aux of AUXILIARES_PREDETERMINADOS) {
    await crearOActualizarAuxiliar(aux.cedula, aux.nombre, aux.unidad);
  }

  console.log("\nProceso finalizado con éxito.");
}

if (require.main === module) {
  main().catch(console.error);
}
