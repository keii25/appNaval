# 🚢 Control de Ingreso Naval — Escuela Naval de Cadetes "Almirante Padilla"

Sistema de control de acceso de visitantes durante los Inter Escuelas.

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (plan gratuito)

---

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Ejecutar migración SQL en Supabase

1. Ve al panel de Supabase → **SQL Editor**.
2. Abre y ejecuta: `supabase/migrations/001_schema_inicial.sql`.
3. Verifica que las tablas `perfiles`, `visitantes`, `configuracion` y `auditoria` se hayan creado.

### 4. Cargar deportistas desde CSV

**Formato del CSV** (con encabezado obligatorio):

```csv
nombre,cedula,unidad
"Carlos Rodríguez","10234567","Infantería de Marina"
```

**Ejecutar carga:**

```bash
# Modo real (crea usuarios en Supabase Auth)
npx tsx scripts/load-deportistas.ts scripts/deportistas-prueba.csv

# Modo simulación (sin guardar cambios)
npx tsx scripts/load-deportistas.ts scripts/deportistas-prueba.csv --dry-run
```

Al terminar se genera un archivo `load-report-<timestamp>.json` con el detalle de cada fila.

### 5. Levantar servidor de desarrollo

```bash
npm run dev
# → http://localhost:3000
```

---

## Roles

| Rol        | Acceso                                     |
|------------|--------------------------------------------|
| deportista | Gestiona solo sus visitantes               |
| admin      | Ve todo, filtra, exporta e importa         |
| porteria   | Solo lectura, búsqueda por doc/placa       |

---

## Fases del proyecto

| Fase | Estado       | Descripción                              |
|------|--------------|------------------------------------------|
| 1    | ✅ Completada | Base, SQL, RLS, script CSV               |
| 2    | ✅ Completada | Autenticación, cambio de clave, Ley 1581 |
| 3    | ✅ Completada | Sistema de diseño Apple HIG              |
| 4    | ✅ Completada | Panel del deportista                     |
| 6    | ✅ Completada | Exportación Excel/Word (Libro oficial y Minuta de guardia) |
| 7    | ✅ Completada | Pruebas integrales E2E, Lint, Tipos y Build de Producción |

### Cuentas de prueba para el sistema (Nuevo Modelo)

| Rol | Cédula | Contraseña Inicial | Destino | Notas |
| --- | --- | --- | --- | --- |
| **Administrador** | `99999999` | `99999999` | `/admin` | Control total, catálogos, parámetros |
| **Auxiliar 1** | `71000001` | `71000001` | `/cambiar-clave` → `/auxiliar` | Primer ingreso: cambio obligatorio |
| **Auxiliar 2** | `71000002` | `71000002` | `/cambiar-clave` → `/auxiliar` | Primer ingreso: cambio obligatorio |
| **Auxiliar 3** | `71000003` | `71000003` | `/cambiar-clave` → `/auxiliar` | Primer ingreso: cambio obligatorio |
| **Portería** | `88888888` | `88888888` | `/porteria` | Solo lectura, búsqueda por doc/placa |
| **Deportistas** | — | — | — | Registros de datos gestionados por Auxiliares y Admin |
| **Cadete Deportista** | `10010001` | `10010001` | `/deportista` | Consulta de acompañantes e inscripción |

---

## Verificación de Calidad y Pruebas (Fase 7)

```bash
# 1. Verificación estricta de TypeScript
npm run type-check

# 2. Análisis estático ESLint (Next.js Core Web Vitals)
npm run lint

# 3. Suite completa de Pruebas Integrales E2E (33/33 pruebas)
npm run test:e2e

# 4. Generación del bundle optimizado para despliegue
npm run build
```


