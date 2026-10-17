"use client";

// app/(app)/admin/components/TabVisitantes.tsx — Gestión de Estados de Visitantes (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import type { EstadoVisitante } from "@/types/database";
import { useLabels } from "@/lib/marca";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Car,
  School,
  Calendar,
  RefreshCw,
  Check,
  X,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";

export interface VisitanteAdminItem {
  id: string;
  deportista_id: string;
  nombre: string;
  parentesco: string;
  tipo_documento: string;
  numero_documento: string;
  tiene_vehiculo: boolean;
  placa: string | null;
  modelo: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  estado: EstadoVisitante;
  creado_en: string;
  deportista_nombre: string;
  deportista_cedula: string;
  escuela_id: string;
  escuela_nombre: string;
}

interface StatsVisitantes {
  total: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  con_vehiculo: number;
}

interface EscuelaOption {
  id: string;
  nombre: string;
}

export function TabVisitantes() {
  const toast = useToast();
  const { marca, t } = useLabels();

  const [visitantes, setVisitantes] = useState<VisitanteAdminItem[]>([]);
  const [stats, setStats] = useState<StatsVisitantes>({
    total: 0,
    aprobados: 0,
    pendientes: 0,
    rechazados: 0,
    con_vehiculo: 0,
  });
  const [escuelas, setEscuelas] = useState<EscuelaOption[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroEscuela, setFiltroEscuela] = useState<string>("todas");
  const [filtroVehiculo, setFiltroVehiculo] = useState<string>("todos");

  // Descarga de reportes oficiales (Excel y Word)
  const descargarReporte = async (formato: "excel" | "word", soloAprobados?: boolean) => {
    try {
      setDescargando(formato);
      toast.info("Generando reporte", `Preparando ${formato === "excel" ? "Libro Excel" : "Minuta Word"} oficial...`);
      const params = new URLSearchParams();
      if (soloAprobados) {
        params.append("estado", "Aprobado");
      } else if (filtroEstado !== "todos") {
        params.append("estado", filtroEstado);
      }
      if (filtroEscuela !== "todas") {
        params.append("escuela_id", filtroEscuela);
      }
      if (filtroVehiculo !== "todos") {
        params.append("vehiculo", filtroVehiculo);
      }

      const res = await fetch(`/api/admin/exportar/${formato}?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo generar el archivo");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = formato === "excel" ? "xlsx" : "docx";
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `${formato === "excel" ? "Ingreso_Naval_Interescuelas_2026" : "Minuta_Guardia_Naval_2026"}_${timestamp}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        "Descarga Completa",
        `${formato === "excel" ? "Libro Excel (.xlsx)" : "Minuta Word (.docx)"} descargado correctamente.`
      );
    } catch (err: any) {
      toast.error("Error al exportar", err?.message || "Ocurrió un error al descargar el reporte.");
    } finally {
      setDescargando(null);
    }
  };

  // 1. Cargar catálogo de escuelas
  useEffect(() => {
    async function fetchEscuelas() {
      try {
        const res = await fetch("/api/admin/escuelas?activas=true");
        const data = await res.json();
        if (res.ok && data.escuelas) {
          setEscuelas(data.escuelas);
        }
      } catch {
        // Silencioso
      }
    }
    fetchEscuelas();
  }, []);

  // 2. Cargar visitantes
  const cargarVisitantes = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append("q", busqueda.trim());
      if (filtroEstado !== "todos") params.append("estado", filtroEstado);
      if (filtroEscuela !== "todas") params.append("escuela_id", filtroEscuela);
      if (filtroVehiculo !== "todos") params.append("vehiculo", filtroVehiculo);

      const res = await fetch(`/api/admin/visitantes?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setVisitantes(data.visitantes || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error("Error", data.error || `No fue posible cargar ${t("los", "visitante", true)}.`);
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroEstado, filtroEscuela, filtroVehiculo, toast, t]);

  useEffect(() => {
    cargarVisitantes();
  }, [cargarVisitantes]);

  // 3. Cambiar estado de visitante (Aprobar / Rechazar / Pendiente)
  const cambiarEstado = async (id: string, nuevoEstado: EstadoVisitante) => {
    setActualizandoId(id);
    // Actualización optimista
    setVisitantes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, estado: nuevoEstado } : v))
    );

    try {
      const res = await fetch(`/api/admin/visitantes/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();

      if (!res.ok) {
        cargarVisitantes(); // Revertir
        toast.error("Error", data.error || "No se pudo actualizar el estado.");
      } else {
        toast.success(
          nuevoEstado === "Aprobado"
            ? `${t("Visitante")} Aprobado`
            : nuevoEstado === "Rechazado"
            ? `${t("Visitante")} Rechazado`
            : "Estado Restablecido",
          data.mensaje
        );
        cargarVisitantes();
      }
    } catch {
      cargarVisitantes();
      toast.error("Error", "Error de conexión con el servidor.");
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── MÉTRICAS DE ACREDITACIÓN (APPLE HIG) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <Users className="w-4 h-4 text-[#0A2540] dark:text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {stats.total}
          </p>
        </div>

        {/* Aprobados */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aprobados</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.aprobados}
          </p>
        </div>

        {/* Pendientes */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendientes</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendientes}
          </p>
        </div>

        {/* Rechazados */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rechazados</span>
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {stats.rechazados}
          </p>
        </div>

        {/* Con Vehículo */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vehículos</span>
            <Car className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {stats.con_vehiculo}
          </p>
        </div>
      </div>

      {/* ─── FILTROS Y BÚSQUEDA GLOBAL ─── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar por ${t("visitante").toLowerCase()}, cédula, placa o ${t("participante").toLowerCase()}...`}
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
          {/* Filtro Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendientes ({stats.pendientes})</option>
            <option value="Aprobado">Aprobados ({stats.aprobados})</option>
            <option value="Rechazado">Rechazados ({stats.rechazados})</option>
          </select>

          {/* Filtro Escuela */}
          <select
            value={filtroEscuela}
            onChange={(e) => setFiltroEscuela(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="todas">Todas las {t("entidades").toLowerCase()}</option>
            {escuelas.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.nombre}
              </option>
            ))}
          </select>

          {/* Filtro Vehículo */}
          <select
            value={filtroVehiculo}
            onChange={(e) => setFiltroVehiculo(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="todos">Vehículo: Todos</option>
            <option value="si">Con Vehículo</option>
            <option value="no">Sin Vehículo</option>
          </select>

          <button
            type="button"
            onClick={cargarVisitantes}
            title="Recargar listado"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-all active:scale-95 shadow-sm justify-self-end sm:justify-self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── BARRA DE EXPORTACIONES OFICIALES (GUARDIA NAVAL) ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0A2540]/5 via-blue-50/40 to-emerald-50/30 dark:from-[#0A2540]/30 dark:via-blue-950/20 dark:to-emerald-950/10 border border-[#0A2540]/15 dark:border-blue-900/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#0A2540] text-white">
              <Download className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              Reportes Oficiales de Guardia e Ingreso
            </h4>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Descargue el consolidado oficial con formato naval militar para garitas y control perimetral.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
          {/* Botón Excel */}
          <button
            type="button"
            disabled={descargando !== null}
            onClick={() => descargarReporte("excel")}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-sm w-full"
          >
            {descargando === "excel" ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
            )}
            <span>Exportar Excel (.xlsx)</span>
          </button>

          {/* Botón Minuta Word */}
          <button
            type="button"
            disabled={descargando !== null}
            onClick={() => descargarReporte("word")}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#1E3A8A] dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-sm w-full"
          >
            {descargando === "word" ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <FileText className="w-4 h-4 shrink-0" />
            )}
            <span>Minuta Guardia (.docx)</span>
          </button>

          {/* Botón Rápido: Minuta Solo Aprobados */}
          <button
            type="button"
            disabled={descargando !== null}
            onClick={() => descargarReporte("word", true)}
            title={`Generar minuta Word únicamente con ${t("visitantes").toLowerCase()} aprobados para guardia`}
            className="min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 text-neutral-800 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] shadow-sm w-full"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Solo Aprobados</span>
          </button>
        </div>
      </div>

      {/* ─── LISTADO DE VISITANTES CON CONTROL DE ESTADO ─── */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Control de Estados de Acreditación
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Aprobación de ingreso y asignación de pases militares para acompañantes.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {visitantes.length} resultados
          </span>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando {t("visitantes").toLowerCase()}...
          </div>
        ) : visitantes.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No se encontraron {t("visitantes").toLowerCase()}
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              No hay registros que coincidan con los criterios de búsqueda y filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {visitantes.map((v) => {
              const estaActualizando = actualizandoId === v.id;
              const badgeEstado =
                v.estado === "Aprobado"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : v.estado === "Rechazado"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

              return (
                <div
                  key={v.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shrink-0 flex items-center justify-center font-bold">
                      {v.tiene_vehiculo ? <Car className="w-5 h-5 text-blue-600" /> : <Users className="w-5 h-5 text-neutral-600" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                          {v.nombre}
                        </h4>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          {v.tipo_documento} {v.numero_documento}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0A2540] dark:bg-blue-950/60 dark:text-blue-300">
                          {v.parentesco}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeEstado}`}>
                          {v.estado}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {t("Participante")}: <strong>{v.deportista_nombre}</strong> (CC {v.deportista_cedula})
                        </span>
                        <span>•</span>
                        <span className="text-[#0A2540] dark:text-blue-400 font-semibold">
                          {v.escuela_nombre}
                        </span>
                        <span>•</span>
                        <span className="font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {v.fecha_desde} al {v.fecha_hasta}
                        </span>

                        {v.tiene_vehiculo && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              Placa: <strong className="font-mono">{v.placa}</strong> ({v.modelo})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Cambio de Estado (Apple HIG) */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Botón Aprobar */}
                    {v.estado !== "Aprobado" && (
                      <button
                        type="button"
                        disabled={estaActualizando}
                        onClick={() => cambiarEstado(v.id, "Aprobado")}
                        className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Aprobar</span>
                      </button>
                    )}

                    {/* Botón Rechazar */}
                    {v.estado !== "Rechazado" && (
                      <button
                        type="button"
                        disabled={estaActualizando}
                        onClick={() => cambiarEstado(v.id, "Rechazado")}
                        className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span>Rechazar</span>
                      </button>
                    )}

                    {/* Botón Volver a Pendiente */}
                    {v.estado !== "Pendiente" && (
                      <button
                        type="button"
                        disabled={estaActualizando}
                        onClick={() => cambiarEstado(v.id, "Pendiente")}
                        className="flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Reabrir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TabVisitantes;
