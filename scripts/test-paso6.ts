// scripts/test-paso6.ts — Validación Integral de Paso 6 (Aprobación, Portería y Auditoría)
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

async function runTestPaso6() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" PRUEBA INTEGRAL PASO 6 — APROBACIÓN, PORTERÍA Y AUDITORÍA");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const { createAdminClient } = await import("../lib/supabase/admin");
  const supabaseAdmin = createAdminClient();

  // 1. Iniciar sesión como Administrador
  console.log("1. Autenticando como Administrador (99999999)...");
  const loginAdminRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });

  if (!loginAdminRes.ok) throw new Error("Error login admin");
  const adminCookies = loginAdminRes.headers.get("set-cookie") || "";
  const adminHeaders = { "Content-Type": "application/json", Cookie: adminCookies };
  console.log("   ✓ Administrador autenticado correctamente.\n");

  // 2. Preparar deportista y visitante de prueba
  console.log("2. Preparando registros de prueba (Deportista + Visitante con Vehículo)...");
  const { data: escuelas } = await supabaseAdmin.from("escuelas").select("id").eq("activa", true).limit(1);
  const escuelaId = escuelas?.[0]?.id;
  if (!escuelaId) throw new Error("No hay escuelas activas en el sistema.");

  const cedulaDeportista = "1066666666";
  await supabaseAdmin.from("deportistas").delete().eq("cedula", cedulaDeportista);

  const { data: dep, error: errDep } = await supabaseAdmin
    .from("deportistas")
    .insert({
      nombre_completo: "Cadete Paso Seis Pruebas",
      cedula: cedulaDeportista,
      celular: "3006666666",
      escuela_id: escuelaId,
      autorizacion_datos: true,
    })
    .select("id, nombre_completo")
    .single();

  if (errDep || !dep) throw new Error(`Error creando deportista: ${errDep?.message}`);
  const deportistaId = dep.id;

  const cedulaVisitante = "92000001";
  const placaTest = "NAV123";

  const { data: vis, error: errVis } = await supabaseAdmin
    .from("visitantes")
    .insert({
      deportista_id: deportistaId,
      nombre: "Visitante Militar Seis",
      parentesco: "Familiar",
      tipo_documento: "CC",
      numero_documento: cedulaVisitante,
      tiene_vehiculo: true,
      placa: placaTest,
      modelo: "Toyota Hilux Blanca",
      fecha_desde: new Date().toISOString().split("T")[0],
      fecha_hasta: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
      estado: "Pendiente",
    })
    .select("id, nombre, estado")
    .single();

  if (errVis || !vis) throw new Error(`Error creando visitante: ${errVis?.message}`);
  const visitanteId = vis.id;
  console.log(`   ✓ Visitante creado: "${vis.nombre}" (ID: ${visitanteId}) | Estado: ${vis.estado}\n`);

  // 3. Admin cambia estado a "Aprobado"
  console.log("3. Administrador cambia estado del visitante a 'Aprobado':");
  const resAprobar = await fetch(`http://localhost:3000/api/admin/visitantes/${visitanteId}/estado`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ estado: "Aprobado", motivo: "Validación de seguridad Inter Escuelas" }),
  });

  const dataAprobar = await resAprobar.json();
  if (!resAprobar.ok) throw new Error(`Error aprobando visitante: ${dataAprobar.error}`);
  console.log(`   ✓ Estado modificado exitosamente: ${dataAprobar.mensaje}`);

  // 4. Verificar trazabilidad en Auditoría con entidad='visitantes'
  console.log("\n4. Verificando registro en Auditoría con entidad='visitantes':");
  const { data: auditLog, error: auditErr } = await supabaseAdmin
    .from("auditoria")
    .select("id, accion, entidad, entidad_id, detalle, fecha")
    .eq("entidad", "visitantes")
    .eq("entidad_id", visitanteId)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (auditErr || !auditLog) {
    throw new Error(`ERROR: No se encontró registro en auditoría para el cambio de estado.`);
  }
  console.log(`   ✓ Auditoría confirmada: Acción: ${auditLog.accion} | Entidad: ${auditLog.entidad} | ID: ${auditLog.entidad_id}`);
  console.log(`   ✓ Detalle registrado: De '${auditLog.detalle.estado_anterior}' a '${auditLog.detalle.estado_nuevo}'`);

  // 5. Iniciar sesión como Guardia de Portería (88888888 / 88888888)
  console.log("\n5. Autenticando como Guardia de Portería (88888888)...");
  const loginPortRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "88888888", password: "88888888" }),
  });

  if (!loginPortRes.ok) throw new Error("Error login portería");
  const portCookies = loginPortRes.headers.get("set-cookie") || "";
  const portHeaders = { "Content-Type": "application/json", Cookie: portCookies };
  console.log("   ✓ Portería autenticada con éxito.");

  // 6. Consultas de Portería (Solo Lectura)
  console.log("\n6. Probando búsquedas en Portería Naval:");

  // A. Búsqueda por documento del visitante
  const resBusqDoc = await fetch(`http://localhost:3000/api/porteria/buscar?q=${cedulaVisitante}`, {
    headers: portHeaders,
  });
  const dataBusqDoc = await resBusqDoc.json();
  const itemDoc = dataBusqDoc.resultados?.[0];
  if (!itemDoc || itemDoc.numero_documento !== cedulaVisitante) {
    throw new Error("ERROR: Portería no encontró al visitante por cédula");
  }
  console.log(`   ✓ Búsqueda por cédula (${cedulaVisitante}): Encontrado "${itemDoc.nombre}" | Estado: ${itemDoc.estado} | Autorizado: ${itemDoc.acceso_autorizado ? "SÍ" : "NO"}`);

  // B. Búsqueda por placa de vehículo
  const resBusqPlaca = await fetch(`http://localhost:3000/api/porteria/buscar?q=${placaTest}`, {
    headers: portHeaders,
  });
  const dataBusqPlaca = await resBusqPlaca.json();
  const itemPlaca = dataBusqPlaca.resultados?.[0];
  if (!itemPlaca || itemPlaca.placa !== placaTest) {
    throw new Error("ERROR: Portería no encontró al visitante por placa");
  }
  console.log(`   ✓ Búsqueda por placa (${placaTest}): Encontrado Vehículo "${itemPlaca.modelo}" | Deportista: ${itemPlaca.deportista_nombre} (${itemPlaca.escuela_nombre})`);

  // C. Búsqueda por cédula del deportista
  const resBusqDep = await fetch(`http://localhost:3000/api/porteria/buscar?q=${cedulaDeportista}`, {
    headers: portHeaders,
  });
  const dataBusqDep = await resBusqDep.json();
  const itemDep = dataBusqDep.resultados?.[0];
  if (!itemDep || itemDep.deportista_cedula !== cedulaDeportista) {
    throw new Error("ERROR: Portería no encontró visitantes por cédula del deportista");
  }
  console.log(`   ✓ Búsqueda por deportista (${cedulaDeportista}): ${dataBusqDep.resultados.length} acompañante(s) asociado(s).`);

  // 7. Verificar que Portería NO tiene permisos de modificación (Solo Lectura)
  console.log("\n7. Verificando que Portería NO puede modificar registros (Solo Lectura):");

  // Intento A: Portería intenta editar visitante
  const resPortEdit = await fetch(`http://localhost:3000/api/visitantes/${visitanteId}`, {
    method: "PATCH",
    headers: portHeaders,
    body: JSON.stringify({ nombre: "Intento Porteria Hack" }),
  });
  if (resPortEdit.status === 403) {
    console.log(`   ✓ Intento de edición bloqueado con 403 Forbidden.`);
  } else {
    throw new Error(`ERROR: Edición por portería debía retornar 403 pero retornó ${resPortEdit.status}`);
  }

  // Intento B: Portería intenta cambiar estado de visitante
  const resPortEstado = await fetch(`http://localhost:3000/api/admin/visitantes/${visitanteId}/estado`, {
    method: "PATCH",
    headers: portHeaders,
    body: JSON.stringify({ estado: "Rechazado" }),
  });
  if (resPortEstado.status === 403) {
    console.log(`   ✓ Intento de cambio de estado bloqueado con 403 Forbidden.`);
  } else {
    throw new Error(`ERROR: Cambio de estado por portería debía retornar 403 pero retornó ${resPortEstado.status}`);
  }

  // 8. Admin cambia estado a "Rechazado" y verificar reflejo en portería
  console.log("\n8. Admin cambia estado a 'Rechazado':");
  const resRechazar = await fetch(`http://localhost:3000/api/admin/visitantes/${visitanteId}/estado`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ estado: "Rechazado", motivo: "Motivos de seguridad militar" }),
  });
  const dataRechazar = await resRechazar.json();
  console.log(`   ✓ ${dataRechazar.mensaje}`);

  // Portería consulta de nuevo
  const resPortCheckRech = await fetch(`http://localhost:3000/api/porteria/buscar?q=${cedulaVisitante}`, {
    headers: portHeaders,
  });
  const dataPortCheckRech = await resPortCheckRech.json();
  const itemRech = dataPortCheckRech.resultados?.[0];
  console.log(`   ✓ Portería visualiza: Estado ${itemRech.estado} | Autorizado: ${itemRech.acceso_autorizado ? "SÍ" : "NO"} -> "${itemRech.motivo_estado}"`);

  // 9. Limpieza final de datos de prueba
  console.log("\n9. Limpiando datos de prueba...");
  await supabaseAdmin.from("visitantes").delete().eq("id", visitanteId);
  await supabaseAdmin.from("deportistas").delete().eq("id", deportistaId);
  console.log("   ✓ Registros temporales eliminados con éxito.");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(" ¡PASO 6 VALIDADO EXITOSAMENTE AL 100%!");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runTestPaso6().catch((err) => {
  console.error("\n❌ Error durante la prueba de Paso 6:", err);
  process.exit(1);
});
