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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "88888888", password: "88888888" }),
  });
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("Login Portería HTTP:", loginRes.status);

  // 1. Búsqueda vacía (todo lo activo)
  const resEmpty = await fetch("http://localhost:3000/api/porteria/buscar?q=", {
    headers: { Cookie: cookie },
  });
  const jsonEmpty = await resEmpty.json();
  console.log("Total registros en vista general:", jsonEmpty.total);
  if (jsonEmpty.resultados && jsonEmpty.resultados.length > 0) {
    console.log("Registro 1:", {
      tipo: jsonEmpty.resultados[0].categoria_registro,
      nombre: jsonEmpty.resultados[0].nombre,
      doc: jsonEmpty.resultados[0].numero_documento,
      escuela: jsonEmpty.resultados[0].escuela_nombre,
      estado: jsonEmpty.resultados[0].estado,
      autorizado: jsonEmpty.resultados[0].acceso_autorizado,
    });
  }

  // 3. Búsqueda por documento inexistente
  const resNoExiste = await fetch("http://localhost:3000/api/porteria/buscar?q=9999999999", {
    headers: { Cookie: cookie },
  });
  console.log("Status búsqueda inexistente:", resNoExiste.status);
  const textNoExiste = await resNoExiste.text();
  console.log("Body búsqueda inexistente:", textNoExiste);
}

check().catch(console.error);
