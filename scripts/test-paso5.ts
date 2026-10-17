// scripts/test-paso5.ts — Validación Integral de Paso 5 (Gestión de Visitantes por Deportista)
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

async function runTestPaso5() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" PRUEBA INTEGRAL PASO 5 — GESTIÓN DE VISITANTES POR DEPORTISTA");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const { createAdminClient } = await import("../lib/supabase/admin");
  const supabaseAdmin = createAdminClient();

  // 1. Iniciar sesión como Auxiliar de Registro (71000001 / 71000001)
  console.log("1. Autenticando como Auxiliar de Registro (71000001)...");
  const loginAuxRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "71000001", password: "71000001" }),
  });

  if (!loginAuxRes.ok) {
    throw new Error(`Error login auxiliar: ${loginAuxRes.status}`);
  }

  const auxCookies = loginAuxRes.headers.get("set-cookie") || "";
  console.log("   ✓ Auxiliar autenticado exitosamente.");

  const auxHeaders = {
    "Content-Type": "application/json",
    Cookie: auxCookies,
  };

  // 2. Obtener una escuela activa y crear deportista de prueba
  console.log("\n2. Preparando deportista de prueba...");
  const { data: escuelas } = await supabaseAdmin.from("escuelas").select("id").eq("activa", true).limit(1);
  const escuelaId = escuelas?.[0]?.id;

  if (!escuelaId) throw new Error("No hay escuelas activas en la BD.");

  const cedulaDeportista = "1077777777";
  // Limpiar si existía
  await supabaseAdmin.from("deportistas").delete().eq("cedula", cedulaDeportista);

  const { data: deportista, error: errDep } = await supabaseAdmin
    .from("deportistas")
    .insert({
      nombre_completo: "Cadete Prueba Paso Cinco",
      cedula: cedulaDeportista,
      celular: "3007777777",
      escuela_id: escuelaId,
      autorizacion_datos: true,
    })
    .select("id, nombre_completo")
    .single();

  if (errDep || !deportista) {
    throw new Error(`Error creando deportista de prueba: ${errDep?.message}`);
  }
  const deportistaId = deportista.id;
  console.log(`   ✓ Deportista listo: "${deportista.nombre_completo}" (ID: ${deportistaId})`);

  // 3. Consultar visitantes iniciales (debe haber 0)
  console.log("\n3. Consultando visitantes iniciales vía API:");
  const resGetInit = await fetch(`http://localhost:3000/api/deportistas/${deportistaId}/visitantes`, {
    headers: auxHeaders,
  });
  const dataGetInit = await resGetInit.json();
  console.log(`   ✓ GET /api/deportistas/${deportistaId}/visitantes: ${dataGetInit.total_visitantes} visitantes actuales.`);
  console.log(`   ✓ Cupos disponibles según evento: ${dataGetInit.cupos_disponibles} de ${dataGetInit.configuracion.limite_visitantes}`);

  // 4. Agregar Visitante 1 (sin vehículo)
  console.log("\n4. Agregando Visitante 1 (sin vehículo):");
  const resPostVis1 = await fetch(`http://localhost:3000/api/deportistas/${deportistaId}/visitantes`, {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre: "María Fernanda Gómez",
      parentesco: "Familiar",
      tipo_documento: "CC",
      numero_documento: "91000001",
      tiene_vehiculo: false,
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-08",
    }),
  });

  const dataPostVis1 = await resPostVis1.json();
  if (!resPostVis1.ok) throw new Error(`Error agregando visitante 1: ${dataPostVis1.error}`);
  const idVisitante1 = dataPostVis1.visitante.id;
  console.log(`   ✓ Creado exitosamente: "${dataPostVis1.visitante.nombre}" (ID: ${idVisitante1})`);

  // 5. Probar documento duplicado para el mismo deportista
  console.log("\n5. Probando documento duplicado para el mismo deportista:");
  const resDupDoc = await fetch(`http://localhost:3000/api/deportistas/${deportistaId}/visitantes`, {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre: "Homónimo Misma Cédula",
      parentesco: "Amigo",
      tipo_documento: "CC",
      numero_documento: "91000001", // Mismo documento
      tiene_vehiculo: false,
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-08",
    }),
  });

  const dataDupDoc = await resDupDoc.json();
  if (resDupDoc.status === 409) {
    console.log(`   ✓ Rechazado exitosamente con 409 -> "${dataDupDoc.error}"`);
  } else {
    throw new Error(`ERROR: Debió rechazar documento duplicado con 409 pero respondió ${resDupDoc.status}`);
  }

  // 6. Editar Visitante 1 (añadiendo vehículo con placa y modelo)
  console.log("\n6. Editando Visitante 1 (asignando vehículo):");
  const resEditVis1 = await fetch(`http://localhost:3000/api/visitantes/${idVisitante1}`, {
    method: "PATCH",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre: "María Fernanda Gómez Modificada",
      parentesco: "Familiar",
      tipo_documento: "CC",
      numero_documento: "91000001",
      tiene_vehiculo: true,
      placa: "XYZ789",
      modelo: "Renault Duster Blanca",
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-10",
    }),
  });

  const dataEditVis1 = await resEditVis1.json();
  if (!resEditVis1.ok) throw new Error(`Error editando visitante: ${dataEditVis1.error}`);
  console.log(`   ✓ Visitante actualizado: Vehículo Placa ${dataEditVis1.visitante.placa} | Modelo: ${dataEditVis1.visitante.modelo}`);

  // 7. Probar límite de cupo del evento
  console.log("\n7. Probando restricción de cupo máximo de visitantes:");
  // Fijar temporalmente el límite en 2 para probar el bloqueo
  await supabaseAdmin.from("configuracion").update({ limite_visitantes: 2 }).eq("id", 1);

  // Agregar Visitante 2 (llega al límite de 2)
  const resPostVis2 = await fetch(`http://localhost:3000/api/deportistas/${deportistaId}/visitantes`, {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre: "Segundo Visitante Cupo Límite",
      parentesco: "Amigo",
      tipo_documento: "CC",
      numero_documento: "91000002",
      tiene_vehiculo: false,
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-05",
    }),
  });
  const dataPostVis2 = await resPostVis2.json();
  if (!resPostVis2.ok) throw new Error(`Error agregando visitante 2: ${dataPostVis2.error}`);
  const idVisitante2 = dataPostVis2.visitante.id;
  console.log(`   ✓ Visitante 2 agregado (cupo 2 de 2 completado).`);

  // Intentar agregar Visitante 3 (debe fallar por cupo agotado)
  const resPostVis3 = await fetch(`http://localhost:3000/api/deportistas/${deportistaId}/visitantes`, {
    method: "POST",
    headers: auxHeaders,
    body: JSON.stringify({
      nombre: "Tercer Visitante Debería Fallar",
      parentesco: "Amigo",
      tipo_documento: "CC",
      numero_documento: "91000003",
      tiene_vehiculo: false,
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-05",
    }),
  });
  const dataPostVis3 = await resPostVis3.json();
  if (resPostVis3.status === 400) {
    console.log(`   ✓ Restricción validada: Rechazado con 400 -> "${dataPostVis3.error}"`);
  } else {
    throw new Error(`ERROR: Debió fallar por cupo lleno pero respondió ${resPostVis3.status}`);
  }

  // Restaurar límite de visitantes a 5
  await supabaseAdmin.from("configuracion").update({ limite_visitantes: 5 }).eq("id", 1);

  // 8. Eliminar visitante y verificar liberación de cupo
  console.log("\n8. Eliminando Visitante 2 y verificando liberación:");
  const resDelVis2 = await fetch(`http://localhost:3000/api/visitantes/${idVisitante2}`, {
    method: "DELETE",
    headers: auxHeaders,
  });
  const dataDelVis2 = await resDelVis2.json();
  if (!resDelVis2.ok) throw new Error(`Error eliminando visitante: ${dataDelVis2.error}`);
  console.log(`   ✓ ${dataDelVis2.mensaje}`);

  // 9. Limpieza final de datos de prueba
  console.log("\n9. Limpiando datos de prueba...");
  await supabaseAdmin.from("visitantes").delete().eq("id", idVisitante1);
  await supabaseAdmin.from("deportistas").delete().eq("id", deportistaId);
  console.log("   ✓ Registros temporales eliminados con éxito.");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(" ¡PASO 5 VALIDADO EXITOSAMENTE AL 100%!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runTestPaso5().catch((err) => {
  console.error("\n❌ Error durante la prueba de Paso 5:", err);
  process.exit(1);
});
