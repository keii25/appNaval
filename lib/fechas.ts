// ============================================================
// lib/fechas.ts — Formateo y validación de vigencias y marcas temporales (ENAP)
// Formatos estándar requeridos:
// - Fecha: [Día de la semana], DD/MM/AAAA (ej: Lunes, 12/03/2026)
// - Timestamp: [Día de la semana], DD/MM/AAAA - HH:mm:ss (ej: Viernes, 16/10/2026 - 17:45:12)
// ============================================================

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/**
 * Parsea una cadena YYYY-MM-DD o ISO a Date local sin desfase de zona horaria UTC.
 */
export function parsearFechaLocal(fechaStr: string): Date {
  if (!fechaStr) return new Date();
  
  // Si viene en formato YYYY-MM-DD simple
  const partes = fechaStr.split("T")[0].split("-");
  if (partes.length === 3) {
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    return new Date(anio, mes, dia, 12, 0, 0); // Mediodía local para evitar saltos de día
  }

  return new Date(fechaStr);
}

/**
 * Formatea una fecha según RF-01: [Día de la semana], DD/MM/AAAA
 * Ejemplo: Lunes, 12/03/2026
 */
export function formatearFechaVigencia(fechaStr: string | null | undefined): string {
  if (!fechaStr) return "—";
  try {
    const d = parsearFechaLocal(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;

    const diaSemana = DIAS_SEMANA[d.getDay()];
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();

    return `${diaSemana}, ${dia}/${mes}/${anio}`;
  } catch {
    return fechaStr;
  }
}

/**
 * Formatea un timestamp según RF-02: [Día de la semana], DD/MM/AAAA - HH:mm:ss
 * Ejemplo: Viernes, 16/10/2026 - 17:45:12
 */
export function formatearTimestampAuditoria(fecha: string | Date | null | undefined): string {
  if (!fecha) return "—";
  try {
    const d = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (isNaN(d.getTime())) return String(fecha);

    // Ajuste a hora de Colombia / ENAP (UTC-5)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "America/Bogota",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat("es-CO", options);
    const parts = formatter.formatToParts(d);
    
    let diaSemana = "";
    let dia = "";
    let mes = "";
    let anio = "";
    let hora = "";
    let minuto = "";
    let segundo = "";

    for (const p of parts) {
      if (p.type === "weekday") diaSemana = p.value;
      if (p.type === "day") dia = p.value;
      if (p.type === "month") mes = p.value;
      if (p.type === "year") anio = p.value;
      if (p.type === "hour") hora = p.value;
      if (p.type === "minute") minuto = p.value;
      if (p.type === "second") segundo = p.value;
    }

    // Capitalizar primera letra del día
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    return `${diaSemanaCap}, ${dia}/${mes}/${anio} - ${hora}:${minuto}:${segundo}`;
  } catch {
    return String(fecha);
  }
}

export interface EvaluacionVigencia {
  enRango: boolean;
  esPrematuro: boolean;
  esVencido: boolean;
  mensajeAlerta?: string;
}

/**
 * Evalúa si una fecha de referencia (o hoy) se encuentra dentro de la ventana de vigencia.
 * RN-02: Condición de vigencia para visitantes.
 */
export function evaluarVigenciaVisitante(
  fechaDesdeStr: string,
  fechaHastaStr: string,
  fechaReferenciaYYYYMMDD?: string
): EvaluacionVigencia {
  const hoyYYYYMMDD =
    fechaReferenciaYYYYMMDD ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

  const desde = fechaDesdeStr.split("T")[0];
  const hasta = fechaHastaStr.split("T")[0];

  const esPrematuro = hoyYYYYMMDD < desde;
  const esVencido = hoyYYYYMMDD > hasta;
  const enRango = !esPrematuro && !esVencido;

  let mensajeAlerta: string | undefined;
  if (esPrematuro) {
    mensajeAlerta = `Acceso No Autorizado (Válido a partir de: ${formatearFechaVigencia(desde)})`;
  } else if (esVencido) {
    mensajeAlerta = "Acceso Vencido / No Autorizado";
  }

  return {
    enRango,
    esPrematuro,
    esVencido,
    mensajeAlerta,
  };
}
