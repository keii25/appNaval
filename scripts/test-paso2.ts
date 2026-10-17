// scripts/test-paso2.ts — Prueba del flujo de autenticación, roles y cambio de clave para Auxiliar
async function testPaso2() {
  console.log("Probando Paso 2: Flujo de Roles y Autenticación de Auxiliar...\n");

  // 1. Iniciar sesión con Auxiliar 1 (clave inicial = cédula)
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "71000001", password: "71000001" }),
  });

  const loginData = await loginRes.json();
  console.log("1. Login Auxiliar:", loginRes.status);
  console.log("   Perfil:", loginData.perfil?.nombre, "| Rol:", loginData.perfil?.rol);
  console.log("   Debe cambiar clave:", loginData.perfil?.debe_cambiar_clave);
  console.log("   Redirección directa esperada (/auxiliar):", loginData.redireccion);

  if (loginData.redireccion !== "/auxiliar") {
    throw new Error(`ERROR: El auxiliar debía ser redirigido a /auxiliar pero fue a ${loginData.redireccion}`);
  }

  // 2. Probar acceso como Admin
  const adminRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "99999999", password: "99999999" }),
  });
  const adminData = await adminRes.json();
  console.log("\n2. Login Admin:", adminRes.status);
  console.log("   Rol:", adminData.perfil?.rol, "| Redirección:", adminData.redireccion);

  // 3. Probar acceso como Portería
  const portRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula: "88888888", password: "88888888" }),
  });
  const portData = await portRes.json();
  console.log("\n3. Login Portería:", portRes.status);
  console.log("   Rol:", portData.perfil?.rol, "| Redirección:", portData.redireccion);

  console.log("\n✓ ¡Paso 2 validado exitosamente!");
}

testPaso2().catch(console.error);
