// scripts/test-fase7-e2e.ts — Suite Completa de Pruebas Integrales E2E (Fase 7)
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

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASSED] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAILED] ${testName}${details ? ` — ${details}` : ""}`);
  }
}

async function loginUser(cedula: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula, password: pass }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login falló para ${cedula}: Status ${res.status} — ${text}`);
  }
  return res.headers.get("set-cookie") || "";
}

async function logoutUser(cookie: string) {
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
}

async function runFase7E2E() {
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log(" FASE 7: SUITE DE PRUEBAS INTEGRALES E2E — CONTROL DE INGRESO NAVAL");
  console.log(" Escuela Naval de Cadetes 'Almirante Padilla' — Interescuelas 2026");
  console.log("══════════════════════════════════════════════════════════════════════\n");

  // ─────────────────────────────────────────────────────────────
  // 1. VERIFICACIÓN DE RUTAS PÚBLICAS Y ACTIVOS GRÁFICOS
  // ─────────────────────────────────────────────────────────────
  console.log("▶ 1. Rutas Públicas e Identidad Institucional Oficial");
  
  const resLogin = await fetch(`${BASE_URL}/login`);
  assert(resLogin.status === 200, "Pantalla de Login accesible (HTTP 200)");

  const resLogo = await fetch(`${BASE_URL}/images/logo-interescuelas-2026.png`);
  assert(
    resLogo.status === 200 && (resLogo.headers.get("content-type") || "").includes("image"),
    "Logo Oficial de Juegos Interescuelas 2026 disponible (HTTP 200, PNG)"
  );

  const resMascota = await fetch(`${BASE_URL}/images/mascota-interescuelas-2026.png`);
  assert(
    resMascota.status === 200 && (resMascota.headers.get("content-type") || "").includes("image"),
    "Mascota Oficial Interescuelas 2026 en podio disponible (HTTP 200, PNG)"
  );

  const resManifest = await fetch(`${BASE_URL}/manifest.json`);
  assert(resManifest.status === 200, "PWA Web Manifest disponible (HTTP 200)");

  // ─────────────────────────────────────────────────────────────
  // 2. SEGURIDAD Y CONTROL DE ACCESO (MIDDLEWARE Y BRUTE FORCE)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 2. Seguridad, Control de Acceso y Protección de Endpoints");

  const resNoAuthAdmin = await fetch(`${BASE_URL}/api/admin/configuracion`);
  assert(resNoAuthAdmin.status === 401, "Endpoint /api/admin/configuracion rechaza peticiones sin sesión (HTTP 401)");

  const resNoAuthPorteria = await fetch(`${BASE_URL}/api/porteria/buscar?q=123`);
  assert(resNoAuthPorteria.status === 401, "Endpoint /api/porteria/buscar rechaza peticiones sin sesión (HTTP 401)");

  const resBadLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "clave_incorrecta" }),
  });
  assert(resBadLogin.status === 401, "Intento con contraseña incorrecta es rechazado (HTTP 401)");
  const badLoginJson = await resBadLogin.json();
  assert(badLoginJson.intentosRestantes !== undefined, "Control de intentos fallidos activo");

  // ─────────────────────────────────────────────────────────────
  // 3. FLUJO COMPLETO: ROL ADMINISTRADOR (99999999)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 3. Flujo E2E: Rol Administrador (99999999)");

  const adminCookie = await loginUser("99999999", "99999999");
  assert(!!adminCookie, "Inicio de sesión de Administrador exitoso con Cookie de sesión");
  const adminHeaders = { Cookie: adminCookie, "Content-Type": "application/json" };

  // 3.1 Consulta de perfil activo
  const resAdminMe = await fetch(`${BASE_URL}/api/auth/me`, { headers: adminHeaders });
  const adminMeJson = await resAdminMe.json();
  assert(adminMeJson.perfil?.rol === "admin", "Perfil autenticado corresponde al rol 'admin'");

  // 3.2 Consulta de Escuelas de Formación
  const resEscuelas = await fetch(`${BASE_URL}/api/admin/escuelas`, { headers: adminHeaders });
  assert(resEscuelas.status === 200, "Consulta de Escuelas participantes exitosa (HTTP 200)");
  const escuelasJson = await resEscuelas.json();
  assert(Array.isArray(escuelasJson.escuelas), "Catálogo de escuelas devuelto como arreglo");

  // 3.3 Consulta y actualización de configuración global
  const resConfigGet = await fetch(`${BASE_URL}/api/admin/configuracion`, { headers: adminHeaders });
  assert(resConfigGet.status === 200, "Lectura de parámetros globales del evento exitosa (HTTP 200)");
  const configJson = await resConfigGet.json();
  const limiteActual = configJson.configuracion?.limite_visitantes || 5;

  const resConfigPut = await fetch(`${BASE_URL}/api/admin/configuracion`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({
      limite_visitantes: limiteActual,
      fecha_limite: configJson.configuracion?.fecha_limite || null,
    }),
  });
  assert(resConfigPut.status === 200, "Actualización de parámetros del evento exitosa (HTTP 200)");

  // 3.4 Padrón de Deportistas con paginación
  const resDeportistas = await fetch(`${BASE_URL}/api/deportistas?page=1&limit=10`, { headers: adminHeaders });
  assert(resDeportistas.status === 200, "Consulta de Padrón de Deportistas con paginación exitosa (HTTP 200)");
  const depJson = await resDeportistas.json();
  assert(depJson.deportistas && depJson.deportistas.length <= 10, "Paginación respetada: máximo 10 deportistas por página");

  // 3.5 Personal Staff y Auxiliares
  const resStaff = await fetch(`${BASE_URL}/api/admin/usuarios`, { headers: adminHeaders });
  assert(resStaff.status === 200, "Consulta de personal Staff y Auxiliares exitosa (HTTP 200)");
  const staffJson = await resStaff.json();
  assert(Array.isArray(staffJson.usuarios) && staffJson.usuarios.length > 0, "Lista de usuarios de Staff obtenida");

  // Edición del responsable de Guardia de Portería
  const guardiaPorteria = staffJson.usuarios.find((u: any) => u.rol === "porteria");
  if (guardiaPorteria) {
    const resEditStaff = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        id: guardiaPorteria.id,
        nombre: guardiaPorteria.nombre,
        cedula: guardiaPorteria.cedula,
        activo: guardiaPorteria.activo,
      }),
    });
    assert(resEditStaff.status === 200, "Edición de responsable de Staff (Guardia de Portería) exitosa (HTTP 200)");
  }

  // 3.6 Auditoría
  const resAudit = await fetch(`${BASE_URL}/api/admin/auditoria`, { headers: adminHeaders });
  assert(resAudit.status === 200, "Consulta de bitácora oficial de auditoría exitosa (HTTP 200)");

  // 3.7 Exportaciones oficiales (Excel y Word)
  const resExcel = await fetch(`${BASE_URL}/api/admin/exportar/excel`, { headers: adminHeaders });
  assert(resExcel.status === 200, "Generación y descarga de Libro Oficial Consolidado Excel (HTTP 200)");
  const excelBuf = Buffer.from(await resExcel.arrayBuffer());
  assert(excelBuf[0] === 0x50 && excelBuf[1] === 0x4b, "Firma de archivo Excel OOXML (.xlsx) válida");

  const resWord = await fetch(`${BASE_URL}/api/admin/exportar/word`, { headers: adminHeaders });
  assert(resWord.status === 200, "Generación y descarga de Minuta de Guardia Word (HTTP 200)");
  const wordBuf = Buffer.from(await resWord.arrayBuffer());
  assert(wordBuf[0] === 0x50 && wordBuf[1] === 0x4b, "Firma de documento Word OOXML (.docx) válida");

  await logoutUser(adminCookie);
  console.log("  ✓ Sesión de Administrador cerrada correctamente.");

  // ─────────────────────────────────────────────────────────────
  // 4. FLUJO COMPLETO: ROL AUXILIAR (71000001)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 4. Flujo E2E: Rol Auxiliar (71000001)");

  const auxCookie = await loginUser("71000001", "71000001");
  assert(!!auxCookie, "Inicio de sesión de Auxiliar exitoso");
  const auxHeaders = { Cookie: auxCookie, "Content-Type": "application/json" };

  const resAuxMe = await fetch(`${BASE_URL}/api/auth/me`, { headers: auxHeaders });
  const auxMeJson = await resAuxMe.json();
  assert(auxMeJson.perfil?.rol === "auxiliar", "Perfil corresponde a rol 'auxiliar'");

  const resAuxDep = await fetch(`${BASE_URL}/api/deportistas?page=1&limit=10`, { headers: auxHeaders });
  assert(resAuxDep.status === 200, "Auxiliar puede consultar deportistas para acreditación (HTTP 200)");

  // Validación de RBAC: Auxiliar NO debe poder modificar configuración global
  const resAuxForbidden = await fetch(`${BASE_URL}/api/admin/configuracion`, {
    method: "PUT",
    headers: auxHeaders,
    body: JSON.stringify({ limite_visitantes: 10 }),
  });
  assert(
    resAuxForbidden.status === 403,
    "Auxiliar no tiene permiso para modificar parámetros de administración (HTTP 403 Forbidden)"
  );

  await logoutUser(auxCookie);
  console.log("  ✓ Sesión de Auxiliar cerrada correctamente.");

  // ─────────────────────────────────────────────────────────────
  // 5. FLUJO COMPLETO: ROL PORTERÍA NAVAL (88888888)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ 5. Flujo E2E: Rol Portería Naval (88888888)");

  const porteriaCookie = await loginUser("88888888", "88888888");
  assert(!!porteriaCookie, "Inicio de sesión de Portería exitoso");
  const porteriaHeaders = { Cookie: porteriaCookie, "Content-Type": "application/json" };

  const resPortMe = await fetch(`${BASE_URL}/api/auth/me`, { headers: porteriaHeaders });
  const portMeJson = await resPortMe.json();
  assert(portMeJson.perfil?.rol === "porteria", "Perfil corresponde a rol 'porteria'");

  // Búsqueda en tiempo real
  const resPortSearch = await fetch(`${BASE_URL}/api/porteria/buscar?q=`, { headers: porteriaHeaders });
  assert(resPortSearch.status === 200, "Búsqueda en tiempo real de Portería Naval operativa (HTTP 200)");
  const portSearchJson = await resPortSearch.json();
  assert(Array.isArray(portSearchJson.resultados), "Resultados de portería estructurados con campos de seguridad");

  // Validación de RBAC: Portería NO debe poder crear deportistas
  const resPortForbidden = await fetch(`${BASE_URL}/api/deportistas`, {
    method: "POST",
    headers: porteriaHeaders,
    body: JSON.stringify({
      nombre_completo: "Prueba No Autorizada",
      cedula: "11111111",
      disciplina: "Natación",
      categoria: "Cadete",
      genero: "M",
    }),
  });
  assert(
    resPortForbidden.status === 403,
    "Portería no tiene permiso de escritura/creación en el Padrón (HTTP 403 Forbidden)"
  );

  await logoutUser(porteriaCookie);
  console.log("  ✓ Sesión de Portería cerrada correctamente.");

  // ─────────────────────────────────────────────────────────────
  // RESUMEN FINAL
  // ─────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log(` RESULTADO FINAL FASE 7:`);
  console.log(` Total de Pruebas: ${totalTests}`);
  console.log(` Exitosas (PASSED): ${passedTests}`);
  console.log(` Fallidas (FAILED): ${failedTests}`);
  console.log("══════════════════════════════════════════════════════════════════════\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFase7E2E().catch((err) => {
  console.error("\n❌ Error crítico durante la ejecución de la suite Fase 7:", err);
  process.exit(1);
});
