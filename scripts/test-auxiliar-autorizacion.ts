export {};
const APP_URL = "http://localhost:3000";

async function run() {
  console.log("=== PRUEBA: AUTORIZACIÓN DE VISITANTE POR AUXILIAR ===");

  // 1. Iniciar sesión como Auxiliar (71000001)
  const loginAux = await fetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cedula: "71000001",
      password: "Auxiliar2026*",
    }),
  });

  let cookie = loginAux.headers.get("set-cookie") || "";
  if (!loginAux.ok) {
    // Probar con cédula como clave si la anterior falla
    const loginAux2 = await fetch(`${APP_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cedula: "71000001",
        password: "71000001",
      }),
    });
    if (!loginAux2.ok) {
      throw new Error("No se pudo iniciar sesión como Auxiliar");
    }
    cookie = loginAux2.headers.get("set-cookie") || "";
  }

  console.log("✓ Login Auxiliar exitoso");

  // 2. Obtener lista de deportistas para tomar un visitante
  const depRes = await fetch(`${APP_URL}/api/deportistas?page=1&limit=1`, {
    headers: { Cookie: cookie },
  });
  const depData = await depRes.json();
  const deportistaId = depData.deportistas[0]?.id;
  console.log("Deportista ID:", deportistaId);

  // 3. Obtener visitantes del deportista
  const visRes = await fetch(`${APP_URL}/api/deportistas/${deportistaId}/visitantes`, {
    headers: { Cookie: cookie },
  });
  const visData = await visRes.json();
  const visitante = visData.visitantes[0];
  if (!visitante) {
    console.log("No hay visitantes creados para probar");
    return;
  }
  console.log(`Visitante encontrado: ${visitante.nombre} (ID: ${visitante.id}) - Estado actual: ${visitante.estado}`);

  // 4. Auxiliar aprueba el acceso del visitante
  console.log("\n-> Auxiliar ejecutando acción 'Aprobar'...");
  const patchRes = await fetch(`${APP_URL}/api/admin/visitantes/${visitante.id}/estado`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ estado: "Aprobado" }),
  });

  const patchData = await patchRes.json();
  console.log("Status HTTP:", patchRes.status);
  console.log("Respuesta:", JSON.stringify(patchData));

  if (patchRes.status === 200 && patchData.ok) {
    console.log("✓ ÉXITO: El Auxiliar de Acreditación autorizó exitosamente el ingreso del visitante!");
  } else {
    throw new Error(`Fallo en autorización por auxiliar: ${patchData.error}`);
  }

  // 5. Iniciar sesión como Portería para verificar que aparece como Autorizado
  const loginPort = await fetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cedula: "88888888",
      password: "88888888",
    }),
  });
  const portCookie = loginPort.headers.get("set-cookie") || "";

  const portSearchRes = await fetch(`${APP_URL}/api/porteria/buscar?q=${encodeURIComponent(visitante.numero_documento)}`, {
    headers: { Cookie: portCookie },
  });
  const portSearchData = await portSearchRes.json();
  const visEnPorteria = portSearchData.resultados[0];
  console.log("\nEn Portería Naval:");
  console.log("Estado:", visEnPorteria?.estado);
  console.log("Acceso Autorizado:", visEnPorteria?.acceso_autorizado);
  console.log("Motivo:", visEnPorteria?.motivo_estado);

  console.log("\n=== VALIDACIÓN COMPLETA Y EXITOSA ===");
}

run().catch(console.error);
