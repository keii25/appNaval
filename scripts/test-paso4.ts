// scripts/test-paso4.ts — Prueba Integral de Paso 4 (Registro y Gestión de Deportistas)
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

async function runTestPaso4() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" PRUEBA INTEGRAL PASO 4 — REGISTRO Y GESTIÓN DE DEPORTISTAS");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // 1. Iniciar sesión como Auxiliar de Mesa (71000001 / 71000001)
  console.log("1. Autenticando como Auxiliar de Registro (71000001)...");
  const loginAuxRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "71000001", password: "71000001" }),
  });

  if (!loginAuxRes.ok) {
    throw new Error(`Error login auxiliar: ${loginAuxRes.status} ${await loginAuxRes.text()}`);
  }

  const auxCookies = loginAuxRes.headers.get("set-cookie") || "";
  console.log("   ✓ Auxiliar autenticado exitosamente (acceso directo a panel).\n");

  const auxHeaders = {
    "Content-Type": "application/json",
    Cookie: auxCookies,
  };

  // 2. Obtener una escuela activa
  console.log("2. Consultando escuelas disponibles...");
  const escRes = await fetch("http://localhost:3000/api/admin/escuelas?activas=true", {
    headers: auxHeaders,
  });
  const escData = await escRes.json();
  const escuelaPrueba = escData.escuelas?.[0];

  if (!escuelaPrueba) {
    throw new Error("No hay escuelas activas para realizar la prueba.");
  }
  console.log(`   ✓ Escuela seleccionada: "${escuelaPrueba.nombre}" (ID: ${escuelaPrueba.id})\n`);

  const cedulaPrueba = `1099887766`;
  let idDeportistaCreado = "";

  const { createAdminClient } = await import("../lib/supabase/admin");
  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("deportistas").delete().eq("cedula", cedulaPrueba);

  // 3. Probar validación obligatoria de Ley 1581 (debe fallar si autorizacion_datos es false)
  console.log("3. Probando validación obligatoria Ley 1581 de 2012:");
  const resSinLey = await fetch("http://localhost:3000/api/deportistas", {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre_completo: "Cadete Sin Autorizacion",
      cedula: cedulaPrueba,
      celular: "3001112233",
      escuela_id: escuelaPrueba.id,
      autorizacion_datos: false, // Intencionalmente false
    }),
  });

  const dataSinLey = await resSinLey.json();
  if (resSinLey.status === 400) {
    console.log(`   ✓ Validación exitosa: Rechazado con 400 -> "${dataSinLey.error}"`);
  } else {
    throw new Error(`ERROR: Debió fallar con 400 por Ley 1581 pero respondió ${resSinLey.status}`);
  }

  // 4. Crear deportista válido con autorización Ley 1581
  console.log("\n4. Registrando deportista válido (con autorización Ley 1581):");
  const resValido = await fetch("http://localhost:3000/api/deportistas", {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre_completo: "Cadete Pedro Picapiedra",
      cedula: cedulaPrueba,
      celular: "3001234567",
      escuela_id: escuelaPrueba.id,
      observaciones: "Prueba automatizada Paso 4",
      autorizacion_datos: true,
    }),
  });

  const dataValido = await resValido.json();
  if (!resValido.ok) {
    throw new Error(`Error creando deportista: ${dataValido.error}`);
  }
  idDeportistaCreado = dataValido.deportista.id;
  console.log(`   ✓ Creado exitosamente: "${dataValido.deportista.nombre_completo}" (ID: ${idDeportistaCreado})`);

  // 5. Probar detección de documento duplicado
  console.log("\n5. Probando detección de documento duplicado:");
  const resDuplicado = await fetch("http://localhost:3000/api/deportistas", {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre_completo: "Otro Deportista Misma Cédula",
      cedula: cedulaPrueba, // Misma cédula
      celular: "3009998877",
      escuela_id: escuelaPrueba.id,
      autorizacion_datos: true,
    }),
  });

  const dataDuplicado = await resDuplicado.json();
  if (resDuplicado.status === 409) {
    console.log(`   ✓ Detección exitosa: Rechazado con 409 -> "${dataDuplicado.error}"`);
  } else {
    throw new Error(`ERROR: Debió fallar con 409 pero respondió ${resDuplicado.status}`);
  }

  // 6. Editar deportista
  console.log("\n6. Editando datos del deportista:");
  const resEdit = await fetch(`http://localhost:3000/api/deportistas/${idDeportistaCreado}`, {
    method: "PATCH",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre_completo: "Cadete Pedro Picapiedra Modificado",
      celular: "3109876543",
    }),
  });

  const dataEdit = await resEdit.json();
  if (!resEdit.ok) throw new Error(`Error editando: ${dataEdit.error}`);
  console.log(`   ✓ Actualizado exitosamente: "${dataEdit.deportista.nombre_completo}" | Celular: ${dataEdit.deportista.celular}`);

  // 7. Probar protección de eliminación con visitantes asociados
  console.log("\n7. Probando protección de eliminación si tiene visitantes asociados:");

  // Insertar un visitante vinculado a este deportista
  const { data: visCreado, error: errVis } = await supabaseAdmin
    .from("visitantes")
    .insert({
      deportista_id: idDeportistaCreado,
      nombre: "Familiar del Cadete",
      parentesco: "Familiar",
      tipo_documento: "CC",
      numero_documento: "45678912",
      tiene_vehiculo: false,
      fecha_desde: new Date().toISOString().split("T")[0],
      fecha_hasta: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      estado: "Pendiente",
    })
    .select("id")
    .single();

  if (errVis || !visCreado) {
    throw new Error(`Error vinculando visitante temporal: ${errVis?.message}`);
  }
  console.log(`   ✓ Visitante temporal vinculado al deportista (ID: ${visCreado.id}).`);

  // Intentar eliminar el deportista (debe ser bloqueado)
  const resDelBloqueado = await fetch(`http://localhost:3000/api/deportistas/${idDeportistaCreado}`, {
    method: "DELETE",
    headers: auxHeaders,
  });

  const dataDelBloqueado = await resDelBloqueado.json();
  if (resDelBloqueado.status === 400) {
    console.log(`   ✓ Protección validada: Rechazado con 400 -> "${dataDelBloqueado.error}"`);
  } else {
    throw new Error(`ERROR: Debió fallar con 400 por tener visitantes pero respondió ${resDelBloqueado.status}`);
  }

  // Ahora remover el visitante y reintentar la eliminación
  console.log("\n8. Removiendo visitante y eliminando deportista limpiamente:");
  await supabaseAdmin.from("visitantes").delete().eq("id", visCreado.id);
  console.log("   ✓ Visitante temporal desvinculado.");

  const resDelLimpio = await fetch(`http://localhost:3000/api/deportistas/${idDeportistaCreado}`, {
    method: "DELETE",
    headers: auxHeaders,
  });

  const dataDelLimpio = await resDelLimpio.json();
  if (!resDelLimpio.ok) {
    throw new Error(`Error eliminando deportista sin visitantes: ${dataDelLimpio.error}`);
  }
  console.log(`   ✓ Eliminación exitosa: ${dataDelLimpio.mensaje}`);

  // 9. Probar Importación masiva CSV adaptada (asociada a escuela, sin Auth)
  console.log("\n9. Probando importación CSV adaptada para Deportistas (como Admin):");
  const loginAdminRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });
  const adminCookies = loginAdminRes.headers.get("set-cookie") || "";
  const adminHeaders = { "Content-Type": "text/csv", Cookie: adminCookies };

  const csvTest = `nombre,cedula,celular,escuela,observaciones
"Cadete Importado Test 1","1088776601","3001234567","Escuela Naval de Cadetes Almirante Padilla","Prueba CSV 1"
"Cadete Importado Test 2","1088776602","3109876543","Escuela de Prueba Nueva Creada Auto","Prueba CSV 2"`;

  const importRes = await fetch("http://localhost:3000/api/admin/importar", {
    method: "POST",
    headers: adminHeaders,
    body: csvTest,
  });

  const importData = await importRes.json();
  if (!importRes.ok) {
    throw new Error(`Error en importación CSV: ${importData.error}`);
  }
  console.log(`   ✓ ${importData.mensaje}`);

  // Limpieza de los registros importados de prueba
  await supabaseAdmin.from("deportistas").delete().in("cedula", ["1088776601", "1088776602"]);
  await supabaseAdmin.from("escuelas").delete().eq("nombre", "Escuela de Prueba Nueva Creada Auto");
  console.log("   ✓ Limpieza de datos de prueba completada.");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(" ¡PASO 4 VALIDADO EXITOSAMENTE AL 100%!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runTestPaso4().catch((err) => {
  console.error("\n❌ Error durante la prueba de Paso 4:", err);
  process.exit(1);
});
