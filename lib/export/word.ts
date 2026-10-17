// lib/export/word.ts — Generación de Minuta Oficial de Word para Control de Ingreso (docx v9)
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
} from "docx";
import type { VisitanteExportItem } from "./excel";
import type { ConfiguracionMarca } from "@/types/database";

export async function generarWordMinutaNaval(
  visitantes: VisitanteExportItem[],
  opciones?: {
    tituloFiltro?: string;
    nombreEscuelaFiltro?: string;
    marca?: ConfiguracionMarca;
  }
): Promise<Buffer> {
  const isDynamic = Boolean(opciones?.marca?.flag_marca_dinamica);
  const marca = opciones?.marca;

  const parseColor = (hex?: string) => {
    if (!hex) return "0A2540";
    const clean = hex.replace("#", "").trim();
    return clean.length === 6 ? clean : "0A2540";
  };

  const colorPrimario = isDynamic && marca?.color_acento ? parseColor(marca.color_acento) : "0A2540";

  const labelEntidadSingular = isDynamic && marca?.vocabulario?.entidad?.titulo
    ? marca.vocabulario.entidad.titulo
    : "Escuela Militar";
  const labelParticipanteSingular = isDynamic && marca?.vocabulario?.participante?.titulo
    ? marca.vocabulario.participante.titulo
    : "Deportista";
  const labelVisitanteSingular = isDynamic && marca?.vocabulario?.visitante?.titulo
    ? marca.vocabulario.visitante.titulo
    : "Visitante";

  const fechaGeneracion = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalAprobados = visitantes.filter((v) => v.estado === "Aprobado").length;
  const totalVehiculos = visitantes.filter((v) => v.tiene_vehiculo).length;

  // Bordes finos de tabla
  const borderCell = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
  };

  // Encabezados de columna de la tabla
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "N°", bold: true, color: "FFFFFF", size: 16 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 11, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "ESTADO", bold: true, color: "FFFFFF", size: 16 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: isDynamic ? `${labelVisitanteSingular.toUpperCase()} / FAMILIAR` : "VISITANTE / FAMILIAR",
                bold: true,
                color: "FFFFFF",
                size: 16,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 13, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "DOCUMENTO", bold: true, color: "FFFFFF", size: 16 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 11, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "PARENTESCO", bold: true, color: "FFFFFF", size: 16 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: isDynamic ? labelEntidadSingular.toUpperCase() : "ESCUELA MILITAR",
                bold: true,
                color: "FFFFFF",
                size: 16,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: isDynamic ? `${labelParticipanteSingular.toUpperCase()} ANFITRIÓN` : "DEPORTISTA ANFITRIÓN",
                bold: true,
                color: "FFFFFF",
                size: 16,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        shading: { fill: colorPrimario },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "VEHÍCULO / PLACA", bold: true, color: "FFFFFF", size: 16 })],
          }),
        ],
      }),
    ],
  });

  // Filas de datos
  const dataRows = visitantes.map((v, idx) => {
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? "FFFFFF" : "F9FAFB";

    // Color del estado
    let estadoColor = "166534"; // Verde
    let estadoBg = "DCFCE7";
    if (v.estado === "Pendiente") {
      estadoColor = "92400E";
      estadoBg = "FEF3C7";
    } else if (v.estado === "Rechazado") {
      estadoColor = "991B1B";
      estadoBg = "FEE2E2";
    }

    const vehiculoTxt = v.tiene_vehiculo && v.placa ? `${v.placa} (${v.modelo || "Vehículo"})` : "Sin Vehículo";

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 5, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(idx + 1), size: 15, color: "374151" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: estadoBg },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: v.estado.toUpperCase(), bold: true, size: 14, color: estadoColor })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: v.nombre, bold: true, size: 15, color: "111827" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 13, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${v.tipo_documento} ${v.numero_documento}`, size: 15, color: "374151" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 11, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: v.parentesco, size: 15, color: "374151" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: v.escuela_nombre || "—", size: 14, color: "374151" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: v.deportista_nombre, bold: true, size: 14, color: "111827" }),
                new TextRun({ text: ` (CC ${v.deportista_cedula})`, size: 13, color: "6B7280" }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: borderCell,
          shading: { fill: bgColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: vehiculoTxt, size: 14, color: v.tiene_vehiculo ? "0A2540" : "6B7280", bold: v.tiene_vehiculo })],
            }),
          ],
        }),
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 720, // 0.5 pulgada
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: isDynamic && marca?.organizacion
                      ? marca.organizacion.toUpperCase()
                      : 'ARMADA NACIONAL DE COLOMBIA — ESCUELA NAVAL DE CADETES "ALMIRANTE PADILLA"',
                    size: 15,
                    bold: true,
                    color: colorPrimario,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isDynamic && marca?.nombre_actividad
                      ? `Documento oficial de control de ingreso emitido por el sistema ${marca.nombre_actividad}. Conforme a la Ley 1581 de 2012.  |  Página `
                      : "Documento oficial de control de ingreso emitido por el Sistema Naval Interescuelas 2026. Conforme a la Ley 1581 de 2012.  |  Página ",
                    size: 14,
                    color: "6B7280",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    color: "6B7280",
                    bold: true,
                  }),
                  new TextRun({
                    text: " de ",
                    size: 14,
                    color: "6B7280",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 14,
                    color: "6B7280",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Título y Membrete
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: isDynamic && marca?.organizacion
                  ? marca.organizacion.toUpperCase()
                  : "REPUBLICA DE COLOMBIA — MINISTERIO DE DEFENSA NACIONAL",
                size: 18,
                bold: true,
                color: colorPrimario,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: isDynamic && marca?.nombre_actividad
                  ? marca.nombre_actividad.toUpperCase()
                  : "JUEGOS INTERESCUELAS MILITARES 2026",
                size: 20,
                bold: true,
                color: colorPrimario,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: "MINUTA OFICIAL DE CONTROL DE ACCESO — GUARDIA PRINCIPAL",
                size: 24,
                bold: true,
                color: "059669",
              }),
            ],
          }),

          // Ficha de metadatos
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: "Fecha de Expedición: ", bold: true, size: 16 }),
              new TextRun({ text: fechaGeneracion, size: 16 }),
              new TextRun({ text: "   |   Filtro: ", bold: true, size: 16 }),
              new TextRun({ text: opciones?.tituloFiltro || "Consolidado General", size: 16, color: colorPrimario, bold: true }),
              new TextRun({ text: "   |   Total Registros: ", bold: true, size: 16 }),
              new TextRun({ text: `${visitantes.length} (Aprobados: ${totalAprobados})`, size: 16, bold: true, color: "059669" }),
              new TextRun({ text: "   |   Vehículos Autorizados: ", bold: true, size: 16 }),
              new TextRun({ text: `${totalVehiculos}`, size: 16, bold: true, color: "4F46E5" }),
            ],
          }),

          // Espaciado antes de tabla
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: "LISTADO NOMINAL PARA VERIFICACIÓN EN PORTERÍAS Y PUESTOS DE CONTROL",
                bold: true,
                size: 16,
                color: "374151",
              }),
            ],
          }),

          // Tabla
          table,

          // Espaciado para firmas
          new Paragraph({
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: isDynamic ? "AUTORIZACIÓN Y AVAL DE SEGURIDAD Y CONTROL:" : "AUTORIZACIÓN Y AVAL DE SEGURIDAD MILITAR:",
                bold: true,
                size: 16,
                color: colorPrimario,
              }),
            ],
          }),

          // Bloque de Firmas
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 40 },
                        children: [new TextRun({ text: "____________________________________________", size: 16 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: isDynamic ? "RESPONSABLE DE SEGURIDAD Y CONTROL" : "OFICIAL DE SERVICIO Y SEGURIDAD",
                            bold: true,
                            size: 16,
                            color: colorPrimario,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: isDynamic && marca?.organizacion
                              ? marca.organizacion
                              : 'Escuela Naval de Cadetes "Almirante Padilla"',
                            size: 15,
                            color: "4B5563",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 40 },
                        children: [new TextRun({ text: "____________________________________________", size: 16 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "COORDINADOR GENERAL DE ACCESOS",
                            bold: true,
                            size: 16,
                            color: colorPrimario,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: isDynamic && marca?.nombre_actividad
                              ? `Comité Organizador — ${marca.nombre_actividad}`
                              : "Comité Organizador Interescuelas 2026",
                            size: 15,
                            color: "4B5563",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
