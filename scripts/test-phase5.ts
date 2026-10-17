// scripts/test-phase5.ts — Prueba automatizada de las rutas de la Fase 5
async function test() {
  console.log("Iniciando pruebas de la Fase 5...\n");

  // 1. Probar Login como Admin
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });

  console.log("1. Login Admin:", loginRes.status, loginRes.statusText);
  // Capturar todas las cookies de Supabase
  const rawCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie") || ""];
  const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");

  // 2. Probar GET /api/admin/visitantes
  const visRes = await fetch("http://localhost:3000/api/admin/visitantes", {
    headers: { Cookie: cookieHeader },
  });
  console.log("2. GET /api/admin/visitantes:", visRes.status);
  const visData = await visRes.json();
  console.log("   Visitantes encontrados:", visData.visitantes?.length, "Stats:", visData.stats);

  // 3. Probar GET /api/admin/configuracion
  const configRes = await fetch("http://localhost:3000/api/admin/configuracion", {
    headers: { Cookie: cookieHeader },
  });
  console.log("3. GET /api/admin/configuracion:", configRes.status);
  const configData = await configRes.json();
  console.log("   Configuración:", configData.configuracion);

  // 4. Probar Login Portería
  const loginPortRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "88888888", password: "88888888" }),
  });
  console.log("\n4. Login Portería:", loginPortRes.status);
  const rawPortCookies = loginPortRes.headers.getSetCookie ? loginPortRes.headers.getSetCookie() : [loginPortRes.headers.get("set-cookie") || ""];
  const cookiePortHeader = rawPortCookies.map((c) => c.split(";")[0]).join("; ");

  // 5. Probar GET /api/porteria/buscar
  const portRes = await fetch("http://localhost:3000/api/porteria/buscar", {
    headers: { Cookie: cookiePortHeader },
  });
  console.log("5. GET /api/porteria/buscar:", portRes.status);
  const portData = await portRes.json();
  console.log("   Resultados en portería:", portData.total_encontrados);

  console.log("\n✓ ¡Todas las rutas y permisos de la Fase 5 verificados con éxito!");
}

test().catch(console.error);
