// ============================================================
// types/database.ts — Tipos derivados del esquema Supabase (Fase 1 Ajustada)
// ============================================================

export type Rol = "admin" | "auxiliar" | "porteria";

export type Parentesco = "Familiar" | "Amigo";

export type TipoDocumento = "CC" | "TI" | "CE" | "Pasaporte";

export type EstadoVisitante = "Pendiente" | "Aprobado" | "Rechazado";

export type AccionAuditoria =
  | "CREAR_VISITANTE"
  | "EDITAR_VISITANTE"
  | "ELIMINAR_VISITANTE"
  | "CAMBIAR_ESTADO"
  | "IMPORTAR_DEPORTISTAS"
  | "CAMBIAR_CONFIGURACION"
  | "CREAR_DEPORTISTA"
  | "EDITAR_DEPORTISTA"
  | "ELIMINAR_DEPORTISTA"
  | "CREAR_ESCUELA"
  | "EDITAR_ESCUELA"
  | "GESTIONAR_AUXILIAR";

// ─── TABLAS OFICIALES ────────────────────────────────────────

export interface Escuela {
  id: string;                    // UUID
  nombre: string;                // Nombre oficial único
  activa: boolean;               // Catálogo activo/inactivo
  creado_en: string;             // ISO Timestamp
}

export interface Deportista {
  id: string;                    // UUID
  nombre_completo: string;
  cedula: string;                // Cédula única (solo números)
  celular: string;               // 10 dígitos, inicia en 3
  escuela_id: string;            // FK a escuelas(id)
  observaciones?: string | null; // Máx. 500 caracteres
  autorizacion_datos: boolean;   // Ley 1581 de 2012
  autorizado_por?: string | null;// FK a perfiles(id) de quien marcó la casilla
  creado_por?: string | null;    // FK a perfiles(id) del auxiliar o admin
  creado_en: string;             // ISO Timestamp
  escuela?: Escuela;             // Join opcional
}

export interface Visitante {
  id: string;                    // UUID
  deportista_id: string;         // FK a deportistas(id)
  nombre: string;
  parentesco: Parentesco;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  tiene_vehiculo: boolean;
  placa: string | null;
  modelo: string | null;
  celular?: string | null;       // Opcional
  observaciones?: string | null; // Opcional
  fecha_desde: string;           // YYYY-MM-DD
  fecha_hasta: string;           // YYYY-MM-DD
  estado: EstadoVisitante;
  creado_por?: string | null;    // FK a perfiles(id)
  creado_en: string;
  actualizado_en: string;
  deportista?: Deportista;       // Join opcional
}

export interface Perfil {
  id: string;                    // UUID (mismo que auth.users.id)
  nombre: string;
  cedula: string;
  unidad: string;
  rol: Rol;                      // "admin" | "auxiliar" | "porteria"
  activo: boolean;               // Estado activo/inactivo para auxiliares y personal
  debe_cambiar_clave: boolean;   // Obligatorio en primer ingreso
  acepto_datos: boolean;
  creado_en: string;
}

export interface Configuracion {
  id: number;                    // 1 (singleton)
  limite_visitantes: number;
  fecha_limite: string | null;   // YYYY-MM-DD
  actualizado_en: string;
}

export interface Auditoria {
  id: string;
  usuario_id: string;
  accion: AccionAuditoria;
  entidad?: string | null;       // "DEPORTISTA" | "VISITANTE" | "ESCUELA" | "AUXILIAR" | "CONFIGURACION"
  entidad_id?: string | null;    // ID del registro afectado
  detalle: Record<string, unknown>;
  fecha: string;
}

// ─── VISTAS / JOINS ──────────────────────────────────────────

export interface VisitanteCompleto extends Visitante {
  deportista_nombre: string;
  deportista_cedula: string;
  deportista_escuela: string;
  escuela_id: string;
}
