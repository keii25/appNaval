// scripts/seed-staff.ts — Asegura la existencia de cuentas de Administrador y Portería para pruebas
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

async function crearOActualizarStaff(cedula: string, nombre: string, unidad: string, rol: "admin" | "porteria") {
  const email = `${cedula}@naval.local`;
  console.log(`Verificando usuario ${rol}: ${cedula} (${nombre})...`);

  // 1. Verificar si existe en perfiles
  const { data: perfilExistente } = await supabase
    .from("perfiles")
    .select("id, rol")
    .eq("cedula", cedula)
    .maybeSingle();

  let userId = perfilExistente?.id;

  if (!userId) {
    // Crear en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: cedula,
      email_confirm: true,
      user_metadata: { nombre, cedula, unidad },
    });

    if (authError) {
      if (authError.message.includes("already") || authError.code === "email_exists") {
        // Buscar el usuario en Auth
        const { data: listData } = await supabase.auth.admin.listUsers();
        const found = listData.users.find((u) => u.email === email);
        if (found) userId = found.id;
      } else {
        console.error(`Error creando auth para ${cedula}:`, authError.message);
        return;
      }
    } else {
      userId = authData.user?.id;
    }
  }

  if (userId) {
    const { error: perfilError } = await supabase.from("perfiles").upsert({
      id: userId,
      nombre,
      cedula,
      unidad,
      rol,
      debe_cambiar_clave: false,
      acepto_datos: true,
    });

    if (perfilError) {
      console.error(`Error actualizando perfil para ${cedula}:`, perfilError.message);
    } else {
      console.log(`✓ Usuario ${rol} listo: Cédula ${cedula} / Clave ${cedula}`);
    }
  }
}

async function main() {
  console.log("Creando usuarios staff para Fase 5...\n");
  // Admin: cédula 99999999
  await crearOActualizarStaff("99999999", "Administrador Naval", "Comando General", "admin");
  // Portería: cédula 88888888
  await crearOActualizarStaff("88888888", "Guardia de Portería", "Batallón de Seguridad", "porteria");
  console.log("\nProceso finalizado.");
}

main().catch(console.error);
