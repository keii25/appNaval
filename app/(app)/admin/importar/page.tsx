"use client";

// app/(app)/admin/importar/page.tsx — Importación de CSV con reporte de errores
import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import LargeTitleHeader from "@/components/layout/LargeTitleHeader";
import ToastProvider, { useToast } from "@/components/ui/Toast";
import type { Perfil } from "@/types/database";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Users,
  Loader2,
} from "lucide-react";

interface ReporteImportacion {
  total: number;
  creados: number;
  omitidos: number;
  errores_cantidad: number;
  errores: Array<{
    fila: number;
    cedula: string;
    nombre: string;
    error: string;
  }>;
}

function ImportarCsvDashboard() {
  const toast = useToast();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [reporte, setReporte] = useState<ReporteImportacion | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".csv")) {
        toast.error("Formato Inválido", "Por favor selecciona un archivo con extensión .csv");
        return;
      }
      setArchivo(file);
      setReporte(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith(".csv")) {
        toast.error("Formato Inválido", "El archivo debe ser un CSV.");
        return;
      }
      setArchivo(file);
      setReporte(null);
    }
  };

  // Descargar plantilla de ejemplo
  const descargarPlantilla = () => {
    const contenido = `nombre,cedula,celular,escuela,observaciones\n"Carlos Rodríguez Pérez","10234567","3001234567","Escuela Naval de Cadetes \\"Almirante Padilla\\"","Deportista Atletismo"\n"Ana Martínez López","20345678","3109876543","Escuela Militar de Aviación \\"Marco Fidel Suárez\\"","Deportista Natación"\n"Luis García Torres","30456789","3205551234","Escuela Militar de Cadetes \\"General José María Córdova\\"","Deportista Taekwondo"`;
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plantilla-deportistas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enviar archivo al servidor
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) {
      toast.error("Archivo Requerido", "Debes seleccionar o arrastrar un archivo CSV.");
      return;
    }

    setProcesando(true);
    setReporte(null);

    const formData = new FormData();
    formData.append("file", archivo);

    try {
      const res = await fetch("/api/admin/importar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error en Importación", data.error || "Ocurrió un error al procesar el archivo.");
        return;
      }

      setReporte(data.reporte);
      toast.success("Importación Finalizada", data.mensaje);
    } catch {
      toast.error("Error de Red", "No fue posible conectar con el servidor para la carga masiva.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Panel Administrador</span>
        </Link>
      </div>

      <LargeTitleHeader
        title="Carga Masiva de Deportistas"
        subtitle="Importa el listado de atletas desde un archivo CSV con sus cuentas oficiales y perfiles iniciales."
      />

      {/* ─── INSTRUCCIONES Y FORMATO REQUERIDO ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Formato Oficial Requerido</span>
          </h3>

          <button
            type="button"
            onClick={descargarPlantilla}
            className="text-xs font-semibold text-[#0A2540] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Plantilla CSV</span>
          </button>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          El archivo CSV debe tener una fila de encabezado con los nombres exactos:{" "}
          <strong className="text-neutral-800 dark:text-neutral-200">nombre,cedula,unidad</strong>.
          Cada usuario creado tendrá como usuario su cédula y como contraseña inicial su cédula.
        </p>

        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 font-mono text-[11px] text-neutral-600 dark:text-neutral-300 overflow-x-auto">
          <code>
            nombre,cedula,unidad<br />
            &quot;Carlos Rodríguez Pérez&quot;,&quot;10234567&quot;,&quot;Infantería de Marina&quot;<br />
            &quot;Ana Martínez López&quot;,&quot;20345678&quot;,&quot;Armada Nacional&quot;
          </code>
        </div>
      </div>

      {/* ─── ZONA DE CARGA DRAG & DROP ─── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
            dragOver
              ? "border-[#0A2540] bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20"
              : archivo
              ? "border-emerald-400 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1C1C1E] hover:border-neutral-300"
          }`}
          onClick={() => document.getElementById("csv-file-input")?.click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 text-neutral-500">
            {archivo ? (
              <FileSpreadsheet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <UploadCloud className="w-7 h-7 text-[#0A2540] dark:text-blue-400" />
            )}
          </div>

          {archivo ? (
            <div>
              <p className="font-bold text-sm text-neutral-900 dark:text-white">
                {archivo.name}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {(archivo.size / 1024).toFixed(1)} KB • Clic para seleccionar otro archivo
              </p>
            </div>
          ) : (
            <div>
              <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                Arrastra tu archivo CSV aquí, o haz clic para explorar
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Soporta archivos delimitados por coma con codificación UTF-8
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!archivo || procesando}
          className="w-full min-h-[48px] px-6 rounded-2xl bg-[#0A2540] dark:bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {procesando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Procesando e Importando Deportistas...</span>
            </>
          ) : (
            <>
              <Users className="w-4 h-4" />
              <span>Importar {archivo ? `"${archivo.name}"` : "Deportistas"}</span>
            </>
          )}
        </button>
      </form>

      {/* ─── REPORTE DE RESULTADOS ─── */}
      {reporte && (
        <section className="space-y-4 animate-sheet-up">
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
              Reporte de Importación
            </h3>

            {/* Métrica 4 columnas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Total Filas
                </span>
                <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                  {reporte.total}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                  Creados
                </span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {reporte.creados}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-center">
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                  Omitidos
                </span>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {reporte.omitidos}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-center">
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">
                  Errores
                </span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {reporte.errores_cantidad}
                </p>
              </div>
            </div>

            {/* Tabla de Errores Detallados */}
            {reporte.errores && reporte.errores.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Detalle de Filas con Error ({reporte.errores.length})</span>
                </p>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 font-semibold border-b border-neutral-200/60 dark:border-neutral-800">
                        <th className="py-2 px-3">Fila</th>
                        <th className="py-2 px-3">Cédula</th>
                        <th className="py-2 px-3">Nombre</th>
                        <th className="py-2 px-3">Motivo de Rechazo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-[11px]">
                      {reporte.errores.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/30">
                          <td className="py-2 px-3 font-bold text-neutral-500">#{err.fila}</td>
                          <td className="py-2 px-3">{err.cedula}</td>
                          <td className="py-2 px-3 font-sans font-medium">{err.nombre}</td>
                          <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-sans">
                            {err.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ImportarPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    async function fetchPerfil() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setPerfil(data.perfil);
        }
      } catch {
        // Silencioso
      }
    }
    fetchPerfil();
  }, []);

  return (
    <ToastProvider>
      <AdaptiveLayout
        userName={perfil?.nombre || "Administrador Naval"}
        userSubtitle={perfil?.unidad || "Comando General"}
        userRole="admin"
      >
        <ImportarCsvDashboard />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
