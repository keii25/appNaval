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

// ─── CONFIGURACIÓN DE MARCA Y TEXTOS DINÁMICOS ───────────────

export interface TerminoVocabulario {
  singular: string;
  plural: string;
  genero: "m" | "f";
  titulo?: string;
  titulo_plural?: string;
  sinonimo?: string;
  sinonimo_plural?: string;
}

export interface VocabularioConfig {
  participante: TerminoVocabulario;
  entidad: TerminoVocabulario;
  visitante: TerminoVocabulario;
  parentescos: string[];
}

export interface TextosLoginConfig {
  badge?: string;
  titulo_hero?: string;
  subtitulo_hero?: string;
  lema?: string;
  seguridad?: string;
  ubicacion_pie?: string;
  titulo_formulario?: string;
  subtitulo_formulario?: string;
  label_usuario?: string;
  placeholder_usuario?: string;
  label_password?: string;
  ayuda_password?: string;
  placeholder_password?: string;
  boton_login?: string;
  aviso_legal_corto?: string;
  pie_pagina?: string;
}

export interface ConfiguracionMarca {
  id: number;
  nombre_actividad: string;
  nombre_corto: string;
  lema: string;
  organizacion: string;
  lugar: string;
  logo_claro_url: string;
  logo_oscuro_url: string | null;
  icono_url: string;
  mascota_url: string | null;
  color_acento: string;
  textos_login: TextosLoginConfig;
  aviso_datos: string;
  aviso_actualizado_en: string;
  vocabulario: VocabularioConfig;
  flag_marca_dinamica: boolean;
  actualizado_por?: string | null;
  actualizado_en: string;
}

