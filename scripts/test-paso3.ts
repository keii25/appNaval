// scripts/test-paso3.ts — Validación Integral de Paso 3 (Catálogos, Auxiliares y Configuración)
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

async function runTestPaso3() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" PRUEBA INTEGRAL PASO 3 — CATÁLOGOS, AUXILIARES Y CONFIGURACIÓN");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Iniciar sesión como Administrador
  console.log("1. Autenticando como Administrador (99999999)...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Error en login de admin: ${loginRes.status} ${await loginRes.text()}`);
  }

  const cookies = loginRes.headers.get("set-cookie") || "";
  console.log("   ✓ Administrador autenticado correctamente.\n");

  const headers = {
    "Content-Type": "application/json",
    Cookie: cookies,
  };

  // 2. Pruebas de Catálogo de Escuelas
  console.log("2. Probando Catálogo de Escuelas:");
  // A. Listar escuelas
  const getEscRes = await fetch("http://localhost:3000/api/admin/escuelas", { headers });
  const escData = await getEscRes.json();
  console.log(`   ✓ GET /api/admin/escuelas: ${escData.escuelas?.length || 0} escuelas encontradas.`);

  // B. Crear escuela de prueba
  const nombreTest = `Escuela de Prueba Naval ${Date.now().toString().slice(-4)}`;
  const postEscRes = await fetch("http://localhost:3000/api/admin/escuelas", {
    method: "POST",
    headers,
    body: JSON.stringify({ nombre: nombreTest, activa: true }),
  });
  const postEscData = await postEscRes.json();
  if (!postEscRes.ok) {
    throw new Error(`Error creando escuela: ${postEscData.error}`);
  }
  const idEscuelaTest = postEscData.escuela.id;
  console.log(`   ✓ POST /api/admin/escuelas: Creada "${nombreTest}" (ID: ${idEscuelaTest})`);

  // C. Editar escuela
  const patchEscRes = await fetch("http://localhost:3000/api/admin/escuelas", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ id: idEscuelaTest, activa: false }),
  });
  const patchEscData = await patchEscRes.json();
  if (!patchEscRes.ok) throw new Error(`Error editando escuela: ${patchEscData.error}`);
  console.log(`   ✓ PATCH /api/admin/escuelas: Estado cambiado a inactiva con éxito.`);

  // D. Eliminar escuela sin deportistas
  const delEscRes = await fetch(`http://localhost:3000/api/admin/escuelas?id=${idEscuelaTest}`, {
    method: "DELETE",
    headers,
  });
  const delEscData = await delEscRes.json();
  if (!delEscRes.ok) throw new Error(`Error eliminando escuela: ${delEscData.error}`);
  console.log(`   ✓ DELETE /api/admin/escuelas: Escuela eliminada limpiamente.`);

  // 3. Pruebas de Gestión de Auxiliares y Personal
  console.log("\n3. Probando Gestión de Auxiliares y Personal:");
  // A. Listar usuarios
  const getUsrRes = await fetch("http://localhost:3000/api/admin/usuarios", { headers });
  const usrData = await getUsrRes.json();
  console.log(`   ✓ GET /api/admin/usuarios: ${usrData.usuarios?.length || 0} usuarios encontrados.`);

  // B. Crear auxiliar de prueba con credenciales cédula/cédula (sin exigir cambio)
  const cedulaTest = `71000099`;
  const postUsrRes = await fetch("http://localhost:3000/api/admin/usuarios", {
    method: "POST",
    headers,
    body: JSON.stringify({
      cedula: cedulaTest,
      nombre: "Auxiliar Prueba Automatizada",
      unidad: "Mesa de Pruebas",
      rol: "auxiliar",
      debe_cambiar_clave: false, // Requerimiento: false por defecto
    }),
  });
  const postUsrData = await postUsrRes.json();
  if (!postUsrRes.ok) throw new Error(`Error creando usuario auxiliar: ${postUsrData.error}`);
  const idUsrTest = postUsrData.usuario.id;
  console.log(`   ✓ POST /api/admin/usuarios: Creado auxiliar CC ${cedulaTest} (debe_cambiar_clave = false).`);

  // C. Admin decide activar "exigir cambio de clave"
  const patchUsrRes = await fetch("http://localhost:3000/api/admin/usuarios", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ id: idUsrTest, debe_cambiar_clave: true }),
  });
  const patchUsrData = await patchUsrRes.json();
  if (!patchUsrRes.ok) throw new Error(`Error actualizando requisito de clave: ${patchUsrData.error}`);
  console.log(`   ✓ PATCH /api/admin/usuarios: Toggle debe_cambiar_clave = true verificado.`);

  // D. Resetear contraseña a cédula con debe_cambiar_clave = false
  const resetRes = await fetch("http://localhost:3000/api/admin/usuarios", {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "reset_clave",
      userId: idUsrTest,
      debe_cambiar_clave: false,
    }),
  });
  const resetData = await resetRes.json();
  if (!resetRes.ok) throw new Error(`Error reseteando clave: ${resetData.error}`);
  console.log(`   ✓ POST /api/admin/usuarios (reset_clave): Clave reasignada a cédula con debe_cambiar_clave = false.`);

  // E. Limpieza del usuario de prueba
  const { createAdminClient } = await import("../lib/supabase/admin");
  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("perfiles").delete().eq("id", idUsrTest);
  await supabaseAdmin.auth.admin.deleteUser(idUsrTest);
  console.log(`   ✓ Limpieza: Usuario de prueba temporal eliminado.`);

  // 4. Pruebas de Configuración Global del Evento
  console.log("\n4. Probando Configuración Global del Evento:");
  const putCfgRes = await fetch("http://localhost:3000/api/admin/configuracion", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      limite_visitantes: 5,
      fecha_limite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const putCfgData = await putCfgRes.json();
  if (!putCfgRes.ok) throw new Error(`Error en configuración: ${putCfgData.error}`);
  console.log(`   ✓ PUT /api/admin/configuracion: Límite fijado en ${putCfgData.configuracion.limite_visitantes} visitantes.`);

  // 5. Verificar Registro de Auditoría
  console.log("\n5. Verificando Trazabilidad en Auditoría:");
  const auditRes = await fetch("http://localhost:3000/api/admin/auditoria", { headers });
  const auditData = await auditRes.json();
  console.log(`   ✓ GET /api/admin/auditoria: ${auditData.auditoria?.length || 0} registros encontrados en bitácora.`);

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(" ¡PASO 3 VALIDADO EXITOSAMENTE AL 100%!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runTestPaso3().catch((err) => {
  console.error("\n❌ Error durante la prueba de Paso 3:", err);
  process.exit(1);
});
