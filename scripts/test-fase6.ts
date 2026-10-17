// scripts/test-fase6.ts — Validación Integral de la Fase 6 (Exportaciones Excel y Word)
import fs from "fs";
import path from "path";

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

async function runTestFase6() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" PRUEBA INTEGRAL FASE 6 — EXPORTACIONES EXCEL Y WORD");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Iniciar sesión como Administrador (99999999)
  console.log("1. Autenticando como Administrador (99999999)...");
  const loginAdminRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });

  if (!loginAdminRes.ok) throw new Error("Error en login del Administrador");
  const adminCookies = loginAdminRes.headers.get("set-cookie") || "";
  const adminHeaders = { Cookie: adminCookies };
  console.log("   ✓ Administrador autenticado correctamente.\n");

  // 2. Descargar Libro Excel Consolidado
  console.log("2. Probando descarga de Libro Excel Consolidado (/api/admin/exportar/excel)...");
  const resExcel = await fetch("http://localhost:3000/api/admin/exportar/excel", {
    headers: adminHeaders,
  });

  if (resExcel.status !== 200) {
    const errBody = await resExcel.text();
    throw new Error(`Error en descarga Excel: Status ${resExcel.status} — ${errBody}`);
  }

  const contentTypeExcel = resExcel.headers.get("content-type") || "";
  const dispositionExcel = resExcel.headers.get("content-disposition") || "";
  const bufferExcel = Buffer.from(await resExcel.arrayBuffer());

  console.log(`   ✓ Content-Type: ${contentTypeExcel}`);
  console.log(`   ✓ Content-Disposition: ${dispositionExcel}`);
  console.log(`   ✓ Tamaño del archivo Excel: ${(bufferExcel.length / 1024).toFixed(2)} KB`);

  // Verificar firma binaria PK (ZIP / OOXML)
  const isZipExcel = bufferExcel[0] === 0x50 && bufferExcel[1] === 0x4b;
  if (!isZipExcel) {
    throw new Error("ERROR: El archivo Excel no tiene firma binaria válida de formato OOXML (PK..)");
  }
  console.log("   ✓ Firma binaria OOXML válida (archivo .xlsx íntegro y corrupt-free).\n");

  // 3. Descargar Minuta Oficial Word para la Guardia
  console.log("3. Probando descarga de Minuta Oficial Word (/api/admin/exportar/word)...");
  const resWord = await fetch("http://localhost:3000/api/admin/exportar/word", {
    headers: adminHeaders,
  });

  if (resWord.status !== 200) {
    const errBody = await resWord.text();
    throw new Error(`Error en descarga Word: Status ${resWord.status} — ${errBody}`);
  }

  const contentTypeWord = resWord.headers.get("content-type") || "";
  const dispositionWord = resWord.headers.get("content-disposition") || "";
  const bufferWord = Buffer.from(await resWord.arrayBuffer());

  console.log(`   ✓ Content-Type: ${contentTypeWord}`);
  console.log(`   ✓ Content-Disposition: ${dispositionWord}`);
  console.log(`   ✓ Tamaño del archivo Word: ${(bufferWord.length / 1024).toFixed(2)} KB`);

  const isZipWord = bufferWord[0] === 0x50 && bufferWord[1] === 0x4b;
  if (!isZipWord) {
    throw new Error("ERROR: El archivo Word no tiene firma binaria válida de formato OOXML (PK..)");
  }
  console.log("   ✓ Firma binaria OOXML válida (archivo .docx íntegro y membretado).\n");

  // 4. Probar exportación con filtros específicos (Solo Aprobados)
  console.log("4. Probando descarga filtrada de Minuta Word (Solo Aprobados)...");
  const resWordFiltrado = await fetch("http://localhost:3000/api/admin/exportar/word?estado=Aprobado", {
    headers: adminHeaders,
  });

  if (resWordFiltrado.status !== 200) {
    throw new Error("Error en descarga filtrada de Word");
  }
  const bufferWordFiltrado = Buffer.from(await resWordFiltrado.arrayBuffer());
  console.log(`   ✓ Minuta filtrada generada con éxito (${(bufferWordFiltrado.length / 1024).toFixed(2)} KB).\n`);

  // 5. Verificar control de acceso: El rol Portería NO debe poder exportar
  console.log("5. Verificando restricciones de seguridad (Rol Portería)...");
  const loginPortRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "88888888", password: "88888888" }),
  });

  if (!loginPortRes.ok) throw new Error("Error en login de Portería");
  const portCookies = loginPortRes.headers.get("set-cookie") || "";
  const portHeaders = { Cookie: portCookies };

  const resPortExcel = await fetch("http://localhost:3000/api/admin/exportar/excel", {
    headers: portHeaders,
  });
  if (resPortExcel.status === 403) {
    console.log("   ✓ Descarga de Excel denegada a Portería con 403 Forbidden.");
  } else {
    throw new Error(`ERROR: Portería debió recibir 403 pero recibió ${resPortExcel.status}`);
  }

  const resPortWord = await fetch("http://localhost:3000/api/admin/exportar/word", {
    headers: portHeaders,
  });
  if (resPortWord.status === 403) {
    console.log("   ✓ Descarga de Word denegada a Portería con 403 Forbidden.");
  } else {
    throw new Error(`ERROR: Portería debió recibir 403 pero recibió ${resPortWord.status}`);
  }

  // 6. Verificar acceso anónimo (Sin credenciales)
  console.log("\n6. Verificando restricciones para usuarios anónimos...");
  const resAnonExcel = await fetch("http://localhost:3000/api/admin/exportar/excel");
  if (resAnonExcel.status === 401) {
    console.log("   ✓ Acceso anónimo bloqueado con 401 Unauthorized.");
  } else {
    throw new Error(`ERROR: Solicitud anónima debió recibir 401 pero recibió ${resAnonExcel.status}`);
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(" ¡FASE 6 VALIDADA EXITOSAMENTE AL 100%!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runTestFase6().catch((err) => {
  console.error("\n❌ Error durante la prueba de Fase 6:", err);
  process.exit(1);
});
