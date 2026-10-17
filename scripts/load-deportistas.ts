#!/usr/bin/env node
/**
 * scripts/load-deportistas.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Carga masiva de deportistas desde un archivo CSV.
 *
 * Uso:
 *   npx tsx scripts/load-deportistas.ts <ruta-al-csv> [--dry-run]
 *
 * Formato esperado del CSV (con encabezado):
 *   nombre,cedula,unidad
 *   "Juan Pérez","12345678","Armada Nacional"
 *
 * Comportamiento:
 *  - Crea el usuario en Supabase Auth (email = cedula@naval.local, pass = cedula)
 *  - Inserta el perfil en la tabla `perfiles` con debe_cambiar_clave = false (usuario = cédula, contraseña = cédula)
 *  - Si el usuario ya existe lo omite (idempotente)
 *  - Al finalizar muestra un reporte: total, creados, omitidos, errores
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

// ─── 1. Variables de entorno ──────────────────────────────────────────────────

// Cargar .env.local manualmente (sin dotenv para no añadir dependencia)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠  No se encontró .env.local; usando variables del entorno del sistema.");
    return;
  }
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !SUPABASE_URL ||
  !SERVICE_ROLE ||
  SUPABASE_URL.includes("TU_PROYECTO") ||
  SERVICE_ROLE.includes("TU_SERVICE_ROLE_KEY")
) {
  console.error("\n❌ ERROR DE CONFIGURACIÓN:");
  console.error("El archivo .env.local aún tiene los valores de plantilla por defecto.");
  console.error("Por favor completa tus credenciales de Supabase en .env.local:");
  console.error("  1. NEXT_PUBLIC_SUPABASE_URL = URL de tu proyecto en Supabase (ej: https://xyz.supabase.co)");
  console.error("  2. NEXT_PUBLIC_SUPABASE_ANON_KEY = Clave anon / public");
  console.error("  3. SUPABASE_SERVICE_ROLE_KEY = Clave service_role (secreta, en Project Settings -> API)\n");
  process.exit(1);
}

// ─── 2. Argumnetos CLI ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!csvPath) {
  console.error("❌ Debes indicar la ruta al CSV: npx tsx scripts/load-deportistas.ts archivo.csv");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Archivo no encontrado: ${csvPath}`);
  process.exit(1);
}

if (dryRun) {
  console.log("🔍 Modo DRY-RUN: no se guardarán cambios en Supabase.\n");
}

// ─── 3. Cliente admin (service_role) ─────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── 4. Tipos ─────────────────────────────────────────────────────────────────

interface CsvRow {
  nombre: string;
  cedula: string;
  unidad: string;
}

interface Resultado {
  cedula: string;
  nombre: string;
  estado: "CREADO" | "OMITIDO" | "ERROR";
  motivo?: string;
}

// ─── 5. Validación de fila CSV ────────────────────────────────────────────────

const CEDULA_RE = /^\d{6,12}$/;

function validarFila(row: CsvRow, linea: number): string | null {
  if (!row.nombre?.trim()) return `Línea ${linea}: nombre vacío`;
  if (!row.cedula?.trim()) return `Línea ${linea}: cédula vacía`;
  if (!CEDULA_RE.test(row.cedula.trim()))
    return `Línea ${linea}: cédula inválida "${row.cedula}" (debe tener 6-12 dígitos)`;
  if (!row.unidad?.trim()) return `Línea ${linea}: unidad vacía`;
  return null;
}

// ─── 6. Función principal ─────────────────────────────────────────────────────

async function cargarDeportistas() {
  const csv = fs.readFileSync(csvPath!, "utf-8");

  // Parsear con csv-parse (acepta encabezados en primera línea)
  let rows: CsvRow[];
  try {
    rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as CsvRow[];
  } catch (err) {
    console.error("❌ Error al parsear CSV:", (err as Error).message);
    process.exit(1);
  }

  console.log(`📄 Registros en CSV: ${rows.length}\n`);

  const resultados: Resultado[] = [];
  let creados = 0;
  let omitidos = 0;
  let errores = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const linea = i + 2; // +1 encabezado, +1 base-1

    // Normalizar
    const nombre = row.nombre.trim();
    const cedula = row.cedula.trim();
    const unidad = row.unidad.trim();
    const email = `${cedula}@naval.local`;

    // Validar
    const error = validarFila({ nombre, cedula, unidad }, linea);
    if (error) {
      resultados.push({ cedula, nombre, estado: "ERROR", motivo: error });
      errores++;
      console.error(`  ✗ ${error}`);
      continue;
    }

    if (dryRun) {
      console.log(`  ✓ [DRY-RUN] ${nombre} (${cedula}) — ${unidad}`);
      resultados.push({ cedula, nombre, estado: "CREADO" });
      creados++;
      continue;
    }

    try {
      // Intentar crear usuario en Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: cedula,
          email_confirm: true,   // confirmar directamente (no requiere email)
          user_metadata: { nombre, cedula, unidad },
        });

      if (authError) {
        // Usuario duplicado → omitir sin error
        if (
          authError.message.toLowerCase().includes("already") ||
          authError.message.toLowerCase().includes("duplicate") ||
          authError.code === "email_exists"
        ) {
          console.log(`  ⟳ Omitido (ya existe): ${cedula} — ${nombre}`);
          resultados.push({ cedula, nombre, estado: "OMITIDO", motivo: "Ya existe en Auth" });
          omitidos++;
          continue;
        }
        throw new Error(`Auth: ${authError.message}`);
      }

      const userId = authData.user?.id;
      if (!userId) throw new Error("Auth no devolvió ID de usuario");

      // Insertar perfil (upsert para ser idempotente)
      const { error: perfilError } = await supabase
        .from("perfiles")
        .upsert(
          {
            id: userId,
            nombre,
            cedula,
            unidad,
            rol: "deportista",
            debe_cambiar_clave: false,
            acepto_datos: false,
          },
          { onConflict: "id" }
        );

      if (perfilError) throw new Error(`Perfil: ${perfilError.message}`);

      console.log(`  ✓ Creado: ${nombre} (${cedula}) — ${unidad}`);
      resultados.push({ cedula, nombre, estado: "CREADO" });
      creados++;
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`  ✗ Error en ${cedula} — ${nombre}: ${msg}`);
      resultados.push({ cedula, nombre, estado: "ERROR", motivo: msg });
      errores++;
    }
  }

  // ─── 7. Reporte final ───────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("REPORTE FINAL");
  console.log("─".repeat(60));
  console.log(`  Total en CSV : ${rows.length}`);
  console.log(`  ✓ Creados    : ${creados}`);
  console.log(`  ⟳ Omitidos   : ${omitidos}`);
  console.log(`  ✗ Errores    : ${errores}`);
  console.log("─".repeat(60) + "\n");

  if (errores > 0) {
    console.log("Detalle de errores:");
    resultados
      .filter((r) => r.estado === "ERROR")
      .forEach((r) => console.log(`  • ${r.cedula} — ${r.nombre}: ${r.motivo}`));
    console.log();
  }

  // Guardar reporte JSON
  const reportePath = `load-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(reportePath, JSON.stringify(resultados, null, 2), "utf-8");
  console.log(`📋 Reporte guardado en: ${reportePath}\n`);

  process.exit(errores > 0 ? 1 : 0);
}

cargarDeportistas().catch((err) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
