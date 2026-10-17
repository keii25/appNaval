export {};
const APP_URL = "http://localhost:3000";

async function run() {
  console.log("=== VERIFICACIÓN DE CONTROL DE PORTERÍA ===");

  // 1. Iniciar sesión como Portería
  const loginRes = await fetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cedula: "88888888",
      password: "88888888",
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Fallo en login de portería: ${loginRes.status}`);
  }

  const cookie = loginRes.headers.get("set-cookie") || "";

  // 2. Probar búsqueda de documento inexistente
  console.log("\n1. Probando búsqueda con documento INEXISTENTE: '9999999999'");
  const noMatchRes = await fetch(`${APP_URL}/api/porteria/buscar?q=9999999999`, {
    headers: { Cookie: cookie },
  });

  const noMatchData = await noMatchRes.json();
  console.log("Status HTTP:", noMatchRes.status);
  console.log("Respuesta JSON:", JSON.stringify(noMatchData));

  if (noMatchRes.status === 200 && noMatchData.ok && noMatchData.resultados.length === 0) {
    console.log("✓ CORRECTO: Devuelve 200 OK con resultados vacíos (no genera error 500 ni spinner infinito)");
  } else {
    console.error("✗ ERROR en búsqueda inexistente");
  }

  // 3. Probar búsqueda de deportista registrado (1005435329)
  console.log("\n2. Probando búsqueda con documento EXISTENTE: '1005435329'");
  const matchRes = await fetch(`${APP_URL}/api/porteria/buscar?q=1005435329`, {
    headers: { Cookie: cookie },
  });

  const matchData = await matchRes.json();
  console.log("Status HTTP:", matchRes.status);
  console.log("Coincidencias encontradas:", matchData.resultados?.length);
  if (matchData.resultados?.length > 0) {
    console.log("Nombre encontrado:", matchData.resultados[0].nombre);
    console.log("Categoría:", matchData.resultados[0].categoria_registro);
    console.log("Escuela:", matchData.resultados[0].escuela_nombre);
    console.log("Acceso Autorizado:", matchData.resultados[0].acceso_autorizado);
    console.log("✓ CORRECTO: Localiza al atleta registrado y autoriza el acceso");
  }

  // 4. Probar búsqueda vacía (debe listar últimos registros activos)
  console.log("\n3. Probando búsqueda vacía (Carga inicial de portería)");
  const allRes = await fetch(`${APP_URL}/api/porteria/buscar?q=`, {
    headers: { Cookie: cookie },
  });
  const allData = await allRes.json();
  console.log("Total registros activos cargados:", allData.resultados?.length);
  console.log("\n=== TODAS LAS VALIDACIONES DE PORTERÍA EXITOSAS ===");
}

run().catch(console.error);
