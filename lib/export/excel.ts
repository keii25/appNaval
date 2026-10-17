// lib/export/excel.ts — Generación de Libro Oficial de Excel para Ingreso
import ExcelJS from "exceljs";
import type { ConfiguracionMarca } from "@/types/database";

export interface VisitanteExportItem {
  id: string;
  nombre: string;
  parentesco: string;
  tipo_documento: string;
  numero_documento: string;
  tiene_vehiculo: boolean;
  placa: string | null;
  modelo: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  estado: string;
  creado_en: string;
  deportista_nombre: string;
  deportista_cedula: string;
  escuela_id: string;
  escuela_nombre: string;
}

export interface StatsExport {
  totalVisitantes: number;
  totalAprobados: number;
  totalPendientes: number;
  totalRechazados: number;
  totalVehiculos: number;
  escuelasCount: number;
}

export async function generarExcelIngresoNaval(
  visitantes: VisitanteExportItem[],
  opciones?: {
    tituloFiltro?: string;
    nombreEscuelaFiltro?: string;
    marca?: ConfiguracionMarca;
  }
): Promise<Buffer> {
  const isDynamic = Boolean(opciones?.marca?.flag_marca_dinamica);
  const marca = opciones?.marca;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = isDynamic && marca?.organizacion
    ? marca.organizacion
    : "Escuela Naval de Cadetes Almirante Padilla";
  workbook.lastModifiedBy = isDynamic && marca?.nombre_actividad
    ? `${marca.nombre_actividad} — Sistema de Acreditación`
    : "Sistema Control de Ingreso Naval";
  workbook.created = new Date();
  workbook.modified = new Date();

  const parseColor = (hex?: string) => {
    if (!hex) return "0A2540";
    const clean = hex.replace("#", "").trim();
    return clean.length === 6 ? clean : "0A2540";
  };

  const colorAzulNaval = isDynamic && marca?.color_acento ? parseColor(marca.color_acento) : "0A2540";
  const colorAzulSecundario = "1E3A8A";
  const colorBordeGris = "E5E7EB";

  const labelEntidadSingular = isDynamic && marca?.vocabulario?.entidad?.titulo
    ? marca.vocabulario.entidad.titulo
    : "Escuela Militar";
  const labelEntidadPlural = isDynamic && marca?.vocabulario?.entidad?.titulo_plural
    ? marca.vocabulario.entidad.titulo_plural
    : "Escuelas";
  const labelParticipanteSingular = isDynamic && marca?.vocabulario?.participante?.titulo
    ? marca.vocabulario.participante.titulo
    : "Deportista";
  const labelVisitanteSingular = isDynamic && marca?.vocabulario?.visitante?.titulo
    ? marca.vocabulario.visitante.titulo
    : "Visitante";

  // ─────────────────────────────────────────────────────────────
  // HOJA 1: RESUMEN EJECUTIVO / DASHBOARD
  // ─────────────────────────────────────────────────────────────
  const wsResumen = workbook.addWorksheet("Resumen Ejecutivo", {
    views: [{ showGridLines: true }],
  });

  // Título Institucional
  wsResumen.mergeCells("B2:G2");
  const cellTitulo1 = wsResumen.getCell("B2");
  cellTitulo1.value = isDynamic && marca?.organizacion
    ? marca.organizacion.toUpperCase()
    : 'ARMADA NACIONAL DE COLOMBIA — ESCUELA NAVAL DE CADETES "ALMIRANTE PADILLA"';
  cellTitulo1.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFF" } };
  cellTitulo1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAzulNaval } };
  cellTitulo1.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(2).height = 28;

  wsResumen.mergeCells("B3:G3");
  const cellTitulo2 = wsResumen.getCell("B3");
  cellTitulo2.value = isDynamic && marca?.nombre_actividad
    ? `${marca.nombre_actividad.toUpperCase()} — CONTROL DE ACCESO Y ACREDITACIONES`
    : "JUEGOS INTERESCUELAS MILITARES 2026 — CONTROL DE ACCESO Y ACREDITACIONES";
  cellTitulo2.font = { name: "Arial", size: 11, bold: true, color: { argb: colorAzulNaval } };
  cellTitulo2.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(3).height = 24;

  // Subtítulo con fecha
  wsResumen.mergeCells("B4:G4");
  const cellFecha = wsResumen.getCell("B4");
  const fechaGeneracion = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
  cellFecha.value = `Reporte generado: ${fechaGeneracion} | Filtro: ${opciones?.tituloFiltro || "Consolidado General"}`;
  cellFecha.font = { name: "Arial", size: 9, italic: true, color: { argb: "4B5563" } };
  cellFecha.alignment = { horizontal: "center", vertical: "middle" };

  // KPIs
  const total = visitantes.length;
  const aprobados = visitantes.filter((v) => v.estado === "Aprobado").length;
  const pendientes = visitantes.filter((v) => v.estado === "Pendiente").length;
  const rechazados = visitantes.filter((v) => v.estado === "Rechazado").length;
  const conVehiculo = visitantes.filter((v) => v.tiene_vehiculo).length;

  wsResumen.getRow(6).values = ["", "Total Solicitudes", "Aprobados (Acceso)", "Pendientes", "Rechazados", "Vehículos Registrados"];
  wsResumen.getRow(7).values = ["", total, aprobados, pendientes, rechazados, conVehiculo];

  const rowKpiHeader = wsResumen.getRow(6);
  rowKpiHeader.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  rowKpiHeader.alignment = { horizontal: "center", vertical: "middle" };
  rowKpiHeader.height = 24;

  const rowKpiVal = wsResumen.getRow(7);
  rowKpiVal.font = { name: "Arial", size: 16, bold: true };
  rowKpiVal.alignment = { horizontal: "center", vertical: "middle" };
  rowKpiVal.height = 36;

  // Colores para KPIs
  wsResumen.getCell("B6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAzulSecundario } };
  wsResumen.getCell("B7").font = { name: "Arial", size: 16, bold: true, color: { argb: colorAzulSecundario } };

  wsResumen.getCell("C6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "059669" } };
  wsResumen.getCell("C7").font = { name: "Arial", size: 16, bold: true, color: { argb: "059669" } };

  wsResumen.getCell("D6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D97706" } };
  wsResumen.getCell("D7").font = { name: "Arial", size: 16, bold: true, color: { argb: "D97706" } };

  wsResumen.getCell("E6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DC2626" } };
  wsResumen.getCell("E7").font = { name: "Arial", size: 16, bold: true, color: { argb: "DC2626" } };

  wsResumen.getCell("F6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
  wsResumen.getCell("F7").font = { name: "Arial", size: 16, bold: true, color: { argb: "4F46E5" } };

  // Bordes para celdas KPI
  ["B6", "B7", "C6", "C7", "D6", "D7", "E6", "E7", "F6", "F7"].forEach((ref) => {
    wsResumen.getCell(ref).border = {
      top: { style: "thin", color: { argb: "D1D5DB" } },
      bottom: { style: "thin", color: { argb: "D1D5DB" } },
      left: { style: "thin", color: { argb: "D1D5DB" } },
      right: { style: "thin", color: { argb: "D1D5DB" } },
    };
  });

  // Tabla resumen por Escuelas / Entidades
  wsResumen.mergeCells("B10:G10");
  const cellSubEscuelas = wsResumen.getCell("B10");
  cellSubEscuelas.value = isDynamic
    ? `DISTRIBUCIÓN POR ${labelEntidadPlural.toUpperCase()}`
    : "DISTRIBUCIÓN POR ESCUELA DE FORMACIÓN";
  cellSubEscuelas.font = { name: "Arial", size: 11, bold: true, color: { argb: colorAzulNaval } };
  cellSubEscuelas.alignment = { horizontal: "left", vertical: "middle" };

  const sinEntidadLabel = isDynamic ? `Sin ${labelEntidadSingular} Asignada` : "Sin Escuela Asignada";
  const escuelasMap = new Map<string, { total: number; aprobados: number; pendientes: number; rechazados: number; vehiculos: number }>();
  visitantes.forEach((v) => {
    const esc = v.escuela_nombre || sinEntidadLabel;
    const curr = escuelasMap.get(esc) || { total: 0, aprobados: 0, pendientes: 0, rechazados: 0, vehiculos: 0 };
    curr.total++;
    if (v.estado === "Aprobado") curr.aprobados++;
    else if (v.estado === "Pendiente") curr.pendientes++;
    else if (v.estado === "Rechazado") curr.rechazados++;
    if (v.tiene_vehiculo) curr.vehiculos++;
    escuelasMap.set(esc, curr);
  });

  const rowEscHeader = wsResumen.getRow(11);
  rowEscHeader.values = ["", labelEntidadSingular, "Total Solicitudes", "Aprobados", "Pendientes", "Rechazados", "Vehículos"];
  rowEscHeader.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFF" } };
  rowEscHeader.height = 22;

  ["B11", "C11", "D11", "E11", "F11", "G11"].forEach((ref) => {
    wsResumen.getCell(ref).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAzulNaval } };
    wsResumen.getCell(ref).alignment = { horizontal: ref === "B11" ? "left" : "center", vertical: "middle" };
  });

  let rowIdx = 12;
  escuelasMap.forEach((datos, escNombre) => {
    const row = wsResumen.getRow(rowIdx);
    row.values = ["", escNombre, datos.total, datos.aprobados, datos.pendientes, datos.rechazados, datos.vehiculos];
    row.font = { name: "Arial", size: 9 };
    row.height = 20;

    ["B", "C", "D", "E", "F", "G"].forEach((col) => {
      const cell = wsResumen.getCell(`${col}${rowIdx}`);
      cell.border = {
        top: { style: "thin", color: { argb: colorBordeGris } },
        bottom: { style: "thin", color: { argb: colorBordeGris } },
        left: { style: "thin", color: { argb: colorBordeGris } },
        right: { style: "thin", color: { argb: colorBordeGris } },
      };
      if (col !== "B") cell.alignment = { horizontal: "center", vertical: "middle" };
      if (rowIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
      }
    });
    rowIdx++;
  });

  // Ajuste de columnas en Hoja 1
  wsResumen.getColumn(1).width = 4;
  wsResumen.getColumn(2).width = 44;
  wsResumen.getColumn(3).width = 18;
  wsResumen.getColumn(4).width = 18;
  wsResumen.getColumn(5).width = 16;
  wsResumen.getColumn(6).width = 16;
  wsResumen.getColumn(7).width = 16;

  // ─────────────────────────────────────────────────────────────
  // HOJA 2: LISTADO OFICIAL DE VISITANTES Y ACOMPAÑANTES
  // ─────────────────────────────────────────────────────────────
  const wsVisitantes = workbook.addWorksheet("Listado de Acreditaciones", {
    views: [{ showGridLines: true }],
  });

  // Encabezados
  const headersVisitantes = [
    "N°",
    "ESTADO",
    "NOMBRE COMPLETO",
    "TIPO DOC",
    "N° DOCUMENTO",
    "PARENTESCO",
    labelEntidadSingular.toUpperCase(),
    `${labelParticipanteSingular.toUpperCase()} ANFITRIÓN`,
    `DOC ${labelParticipanteSingular.toUpperCase()}`,
    "FECHA DESDE",
    "FECHA HASTA",
    "VEHÍCULO",
    "PLACA",
    "MODELO / COLOR",
    "FECHA REGISTRO",
  ];

  wsVisitantes.getRow(1).values = headersVisitantes;
  const headerRowV = wsVisitantes.getRow(1);
  headerRowV.height = 26;
  headerRowV.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFF" } };

  headersVisitantes.forEach((_, idx) => {
    const cell = headerRowV.getCell(idx + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAzulNaval } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FFFFFF" } },
    };
  });

  visitantes.forEach((v, index) => {
    const row = wsVisitantes.getRow(index + 2);
    row.values = [
      index + 1,
      v.estado.toUpperCase(),
      v.nombre,
      v.tipo_documento,
      v.numero_documento,
      v.parentesco,
      v.escuela_nombre || "—",
      v.deportista_nombre || "—",
      v.deportista_cedula || "—",
      v.fecha_desde || "—",
      v.fecha_hasta || "—",
      v.tiene_vehiculo ? "SÍ" : "NO",
      v.placa ? v.placa.toUpperCase() : "—",
      v.modelo || "—",
      v.creado_en ? new Date(v.creado_en).toLocaleDateString("es-CO") : "—",
    ];

    row.height = 20;
    row.font = { name: "Arial", size: 9 };

    // Formato condicional de celda de estado
    const estadoCell = row.getCell(2);
    estadoCell.alignment = { horizontal: "center", vertical: "middle" };
    estadoCell.font = { name: "Arial", size: 9, bold: true };

    if (v.estado === "Aprobado") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "166534" } };
    } else if (v.estado === "Pendiente") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "92400E" } };
    } else if (v.estado === "Rechazado") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "991B1B" } };
    }

    // Alineaciones de datos
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(15).alignment = { horizontal: "center", vertical: "middle" };

    // Bordes y alternancia
    for (let c = 1; c <= headersVisitantes.length; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "thin", color: { argb: colorBordeGris } },
        bottom: { style: "thin", color: { argb: colorBordeGris } },
        left: { style: "thin", color: { argb: colorBordeGris } },
        right: { style: "thin", color: { argb: colorBordeGris } },
      };
      if (index % 2 === 1 && c !== 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
      }
    }
  });

  // Habilitar autofiltro en hoja 2
  wsVisitantes.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: visitantes.length + 1, column: headersVisitantes.length },
  };

  // Anchos automáticos de columnas para Hoja 2
  const colWidthsV = [6, 14, 28, 10, 16, 14, 34, 28, 16, 14, 14, 12, 12, 22, 14];
  colWidthsV.forEach((w, i) => {
    wsVisitantes.getColumn(i + 1).width = w;
  });

  // ─────────────────────────────────────────────────────────────
  // HOJA 3: PADRÓN DE VEHÍCULOS AUTORIZADOS
  // ─────────────────────────────────────────────────────────────
  const vehiculosList = visitantes.filter((v) => v.tiene_vehiculo && v.placa);
  const wsVehiculos = workbook.addWorksheet("Control Vehicular", {
    views: [{ showGridLines: true }],
  });

  const headersVehiculos = [
    "N°",
    "PLACA",
    "MODELO / COLOR",
    "ESTADO ACREDITACIÓN",
    `CONDUCTOR / ${labelVisitanteSingular.toUpperCase()}`,
    "DOCUMENTO",
    labelEntidadSingular.toUpperCase(),
    `${labelParticipanteSingular.toUpperCase()} VINCULADO`,
    "VIGENCIA INGRESO",
  ];

  wsVehiculos.getRow(1).values = headersVehiculos;
  const headerRowVeh = wsVehiculos.getRow(1);
  headerRowVeh.height = 26;
  headerRowVeh.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFF" } };

  headersVehiculos.forEach((_, idx) => {
    const cell = headerRowVeh.getCell(idx + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorAzulNaval } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  vehiculosList.forEach((v, index) => {
    const row = wsVehiculos.getRow(index + 2);
    row.values = [
      index + 1,
      v.placa ? v.placa.toUpperCase() : "—",
      v.modelo || "—",
      v.estado.toUpperCase(),
      v.nombre,
      `${v.tipo_documento} ${v.numero_documento}`,
      v.escuela_nombre || "—",
      `${v.deportista_nombre} (${v.deportista_cedula})`,
      `${v.fecha_desde} al ${v.fecha_hasta}`,
    ];

    row.height = 20;
    row.font = { name: "Arial", size: 9 };

    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: colorAzulNaval } };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

    const estadoCell = row.getCell(4);
    if (v.estado === "Aprobado") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "166534" } };
    } else if (v.estado === "Pendiente") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "92400E" } };
    } else {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
      estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "991B1B" } };
    }

    for (let c = 1; c <= headersVehiculos.length; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "thin", color: { argb: colorBordeGris } },
        bottom: { style: "thin", color: { argb: colorBordeGris } },
        left: { style: "thin", color: { argb: colorBordeGris } },
        right: { style: "thin", color: { argb: colorBordeGris } },
      };
      if (index % 2 === 1 && c !== 4) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
      }
    }
  });

  wsVehiculos.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: vehiculosList.length + 1, column: headersVehiculos.length },
  };

  const colWidthsVeh = [6, 14, 24, 18, 28, 18, 32, 30, 24];
  colWidthsVeh.forEach((w, i) => {
    wsVehiculos.getColumn(i + 1).width = w;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
