"use client";

// app/(app)/porteria/page.tsx — Control de Ingreso y Consulta de Portería Naval (Apple HIG)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import LargeTitleHeader from "@/components/layout/LargeTitleHeader";
import ToastProvider, { useToast } from "@/components/ui/Toast";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import Modal from "@/components/ui/Modal";
import type { Perfil } from "@/types/database";
import { useLabels } from "@/lib/marca";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  User,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Trophy,
  School,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  FileText,
} from "lucide-react";

export interface VisitanteAsociado {
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
  estado: "Pendiente" | "Aprobado" | "Rechazado";
  acceso_autorizado: boolean;
  motivo_estado: string;
}

export interface PorteriaRegistro {
  id: string;
  categoria_registro?: "deportista" | "visitante";
  deportista_id?: string;
  nombre: string;
  parentesco: string;
  tipo_documento: string;
  numero_documento: string;
  tiene_vehiculo: boolean;
  placa: string | null;
  modelo: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  estado: "Pendiente" | "Aprobado" | "Rechazado";
  acceso_autorizado: boolean;
  fecha_valida_hoy: boolean;
  motivo_estado: string;
  deportista_nombre: string;
  deportista_cedula: string;
  deportista_celular?: string;
  deportista_unidad?: string;
  escuela_nombre?: string;
  total_visitantes_inscritos?: number;
  visitantes_asociados?: VisitanteAsociado[];
}

type FiltroTipo = "todos" | "deportistas" | "visitantes" | "vehiculos";

function PorteriaDashboard({ perfil }: { perfil?: Perfil | null }) {
  const toast = useToast();
  const { marca, t } = useLabels();

  const [busqueda, setBusqueda] = useState("");
  const [todosLosRegistros, setTodosLosRegistros] = useState<PorteriaRegistro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [fechaHoy, setFechaHoy] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);

  // Paginación compacta (10 por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const ELEMENTOS_POR_PAGINA = 10;

  // Modal de Detalle
  const [registroSeleccionado, setRegistroSeleccionado] = useState<PorteriaRegistro | null>(null);

  const ejecutarBusqueda = useCallback(
    async (termino: string) => {
      setCargando(true);
      setErrorConsulta(null);
      try {
        const queryParam = encodeURIComponent(termino.trim());
        const res = await fetch(`/api/porteria/buscar?q=${queryParam}`);
        const data = await res.json();

        if (res.ok && data.ok) {
          setTodosLosRegistros(data.resultados || []);
          setFechaHoy(data.fecha_consulta || "");
          setBuscado(true);
          setPaginaActual(1);
        } else {
          setErrorConsulta(data.error || "No fue posible realizar la consulta.");
          setTodosLosRegistros([]);
          setBuscado(true);
        }
      } catch {
        setErrorConsulta("Error de conexión al servidor de portería.");
        setTodosLosRegistros([]);
        setBuscado(true);
      } finally {
        setCargando(false);
      }
    },
    []
  );

  // Carga inicial
  useEffect(() => {
    ejecutarBusqueda("");
  }, [ejecutarBusqueda]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    setErrorConsulta(null);
    ejecutarBusqueda("");
  };

  // Filtrado según Segmented Control
  const registrosFiltrados = useMemo(() => {
    return todosLosRegistros.filter((item) => {
      if (filtroTipo === "deportistas") return item.categoria_registro === "deportista";
      if (filtroTipo === "visitantes") return item.categoria_registro === "visitante";
      if (filtroTipo === "vehiculos") return Boolean(item.tiene_vehiculo && item.placa);
      return true;
    });
  }, [todosLosRegistros, filtroTipo]);

  // Métricas rápidas
  const totalAtletas = useMemo(
    () => todosLosRegistros.filter((r) => r.categoria_registro === "deportista").length,
    [todosLosRegistros]
  );
  const totalAcompanantes = useMemo(
    () => todosLosRegistros.filter((r) => r.categoria_registro === "visitante").length,
    [todosLosRegistros]
  );
  const totalVehiculos = useMemo(
    () => todosLosRegistros.filter((r) => r.tiene_vehiculo && r.placa).length,
    [todosLosRegistros]
  );

  // Cálculos de Paginación
  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / ELEMENTOS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const registrosPaginados = useMemo(() => {
    return registrosFiltrados.slice(indiceInicio, indiceInicio + ELEMENTOS_POR_PAGINA);
  }, [registrosFiltrados, indiceInicio]);

  // Si la búsqueda arrojó exactamente 1 coincidencia directa (Spotlight Hero)
  const esCoincidenciaUnica = buscado && busqueda.trim().length > 0 && registrosFiltrados.length === 1;
  const unicoRegistro = esCoincidenciaUnica ? registrosFiltrados[0] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* ─── ENCABEZADO DE PORTERÍA (ALTO CONTRASTE) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <LargeTitleHeader
          title="Control de Portería"
          subtitle={`Verificación instantánea de ingreso de ${t("visitantes").toLowerCase()} y vehículos a ${marca.organizacion}.`}
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Puesto de Guardia Oficial</span>
          </span>
        </div>
      </div>

      {/* ─── TARJETAS DE MÉTRICAS RÁPIDAS (MINI CONTROL CENTER) ─── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">{t("Participantes")}</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white leading-tight">
              {totalAtletas}
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">{t("Visitantes")}</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white leading-tight">
              {totalAcompanantes}
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">Vehículos</p>
            <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white leading-tight">
              {totalVehiculos}
            </p>
          </div>
        </div>
      </div>

      {/* ─── CAJA DE BÚSQUEDA RÁPIDA DE ALTA VISIBILIDAD ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Digita cédula, placa (ej. ABC123) o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full min-h-[50px] pl-12 pr-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border-2 border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 text-base sm:text-lg font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                aria-label="Limpiar campo de búsqueda"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="min-h-[50px] px-7 rounded-2xl bg-[#0A2540] dark:bg-blue-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shrink-0"
          >
            {cargando ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>Consultar</span>
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400 px-1 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
          <span>Consulta instantánea de {t("participantes")} y {t("visitantes")} autorizados.</span>
          {fechaHoy && (
            <span className="font-mono text-neutral-500 dark:text-neutral-400">
              Fecha de consulta: {fechaHoy}
            </span>
          )}
        </div>
      </div>

      {/* ─── FILTROS RÁPIDOS (SEGMENTED CONTROL) ─── */}
      <SegmentedControl<FiltroTipo>
        name="filtro-porteria"
        value={filtroTipo}
        onChange={(val) => {
          setFiltroTipo(val);
          setPaginaActual(1);
        }}
        options={[
          { value: "todos", label: `Todos (${todosLosRegistros.length})` },
          { value: "deportistas", label: `${t("Participantes")} (${totalAtletas})` },
          { value: "visitantes", label: `${t("Visitantes")} (${totalAcompanantes})` },
          { value: "vehiculos", label: `Vehículos (${totalVehiculos})` },
        ]}
      />

      {/* ─── RESULTADOS: COINCIDENCIA ÚNICA SPOTLIGHT O LISTA COMPACTA ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {busqueda
              ? `Resultados para "${busqueda}" (${registrosFiltrados.length})`
              : `Registros Activos para Control de Acceso (${registrosFiltrados.length})`}
          </h3>
          {registrosFiltrados.length > 0 && !esCoincidenciaUnica && (
            <span className="text-xs text-neutral-400">
              Mostrando {indiceInicio + 1} – {Math.min(indiceInicio + ELEMENTOS_POR_PAGINA, registrosFiltrados.length)} de {registrosFiltrados.length}
            </span>
          )}
        </div>

        {cargando ? (
          <div className="p-10 text-center bg-white dark:bg-[#1C1C1E] rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0A2540] dark:text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              Verificando base de datos oficial...
            </p>
          </div>
        ) : errorConsulta ? (
          /* Caja de error acotada (sin desbordamiento) */
          <div className="max-w-md mx-auto p-6 text-center bg-rose-50 dark:bg-rose-950/30 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
            <div>
              <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                Consulta no completada
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                {errorConsulta}
              </p>
            </div>
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              Reintentar vista general
            </button>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          /* Estado Vacío Acotado */
          <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-[#1C1C1E] rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm space-y-2">
            <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto mb-1" />
            <h4 className="font-bold text-base text-neutral-800 dark:text-neutral-200">
              No se encontró ningún registro
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {busqueda
                ? `No existe ningún ${t("participante").toLowerCase()}, ${t("visitante").toLowerCase()} o vehículo registrado con el término "${busqueda}". Verifica el documento o placa.`
                : "No hay registros disponibles en esta categoría."}
            </p>
            {busqueda && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0A2540] dark:bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Ver todos los registros
              </button>
            )}
          </div>
        ) : esCoincidenciaUnica && unicoRegistro ? (
          /* ─── MODO SPOTLIGHT HERO: COINCIDENCIA ÚNICA DE ALTO IMPACTO ─── */
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1C1C1E] border-2 border-emerald-500/80 shadow-lg space-y-4">
            {/* Banner de Estado Hero */}
            <div className="p-4 rounded-2xl bg-emerald-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-100" />
                <div>
                  <p className="font-black text-base sm:text-lg uppercase tracking-wide leading-tight">
                    {unicoRegistro.categoria_registro === "deportista"
                      ? `${t("Participante").toUpperCase()} ACREDITADO — INGRESO AUTORIZADO`
                      : "INGRESO AUTORIZADO"}
                  </p>
                  <p className="text-xs text-emerald-100 leading-tight mt-0.5">
                    {unicoRegistro.motivo_estado}
                  </p>
                </div>
              </div>

              <span className="self-start sm:self-auto px-3 py-1 rounded-xl bg-white/20 text-xs font-bold uppercase tracking-wider">
                {unicoRegistro.categoria_registro === "deportista" ? `${t("Participante")} Oficial` : unicoRegistro.estado}
              </span>
            </div>

            {/* Datos Principales en Layout Horizontal Compacto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Columna 1: Identidad */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {unicoRegistro.categoria_registro === "deportista" ? t("Participante") : t("Visitante")}
                </p>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white leading-snug">
                  {unicoRegistro.nombre}
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300">
                  {unicoRegistro.tipo_documento}: {unicoRegistro.numero_documento}
                </p>
              </div>

              {/* Columna 2: Escuela o Responsable */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {unicoRegistro.categoria_registro === "deportista" ? t("Entidad") : `${t("Participante")} Responsable`}
                </p>
                <h5 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                  {unicoRegistro.categoria_registro === "deportista"
                    ? unicoRegistro.escuela_nombre
                    : unicoRegistro.deportista_nombre}
                </h5>
                <p className="text-xs text-neutral-500">
                  {unicoRegistro.categoria_registro === "deportista"
                    ? marca.nombre_actividad
                    : `C.C. ${unicoRegistro.deportista_cedula} • ${unicoRegistro.escuela_nombre}`}
                </p>
              </div>

              {/* Columna 3: Vehículo / Ingreso */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Modalidad de Ingreso</p>
                  {unicoRegistro.tiene_vehiculo && unicoRegistro.placa ? (
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{unicoRegistro.modelo}</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-300 text-neutral-900 border border-neutral-900 font-mono font-black text-xs">
                        {unicoRegistro.placa}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mt-1">
                      🚶 Ingreso Peatonal (A pie)
                    </p>
                  )}
                </div>

                <div className="pt-2 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Contacto:</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                    {unicoRegistro.deportista_celular || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Listado de Acompañantes si es Deportista */}
            {unicoRegistro.categoria_registro === "deportista" && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                      {t("Visitantes")} Registrados ({unicoRegistro.visitantes_asociados?.length || 0})
                    </h5>
                  </div>
                  {unicoRegistro.visitantes_asociados && unicoRegistro.visitantes_asociados.length > 0 && (
                    <span className="text-[11px] font-semibold text-neutral-500">
                      {unicoRegistro.visitantes_asociados.filter((v) => v.acceso_autorizado).length} Autorizados
                    </span>
                  )}
                </div>

                {!unicoRegistro.visitantes_asociados || unicoRegistro.visitantes_asociados.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400 text-xs text-center border border-dashed border-neutral-200 dark:border-neutral-700">
                    Este {t("participante").toLowerCase()} no cuenta con {t("visitantes").toLowerCase()} registrados para ingreso.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {unicoRegistro.visitantes_asociados.map((vis) => (
                      <div
                        key={vis.id}
                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {vis.nombre}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {vis.parentesco} • {vis.tipo_documento}: {vis.numero_documento}
                          </p>
                          {vis.tiene_vehiculo && vis.placa ? (
                            <div className="mt-1 flex items-center gap-1.5">
                              <Car className="w-3 h-3 text-neutral-400" />
                              <span className="px-1.5 py-0.2 rounded bg-amber-300 text-neutral-900 font-mono font-black text-[10px] border border-neutral-900">
                                {vis.placa}
                              </span>
                              <span className="text-[10px] text-neutral-500">{vis.modelo}</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-neutral-400 mt-0.5">🚶 Peatonal</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vis.acceso_autorizado
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : vis.estado === "Rechazado"
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                vis.acceso_autorizado
                                  ? "bg-emerald-500"
                                  : vis.estado === "Rechazado"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            <span>{vis.acceso_autorizado ? "Autorizado" : vis.estado === "Rechazado" ? "Denegado" : "Pendiente"}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ─── MODO TABLA / LISTA COMPACTA APPLE HIG DE ALTA DENSIDAD ─── */
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-[11px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Nombre e Identificación</th>
                    <th className="py-3 px-4 hidden md:table-cell">{t("Entidad")} / {t("Participante")}</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Vehículo</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {registrosPaginados.map((item) => {
                    const esAtleta = item.categoria_registro === "deportista";
                    const esAutorizado = item.acceso_autorizado;
                    const esRechazado = item.estado === "Rechazado";

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setRegistroSeleccionado(item)}
                        className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                      >
                        {/* Tipo de Registro */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {esAtleta ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0A2540] dark:text-blue-300 text-[11px] font-bold">
                              <Trophy className="w-3 h-3 text-amber-500" />
                              <span>{t("Participante")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                              <Users className="w-3 h-3" />
                              <span>{t("Visitante")}</span>
                            </span>
                          )}
                        </td>

                        {/* Nombre y Documento */}
                        <td className="py-3 px-4 min-w-[180px]">
                          <p className="font-bold text-neutral-900 dark:text-white leading-tight">
                            {item.nombre}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            {item.tipo_documento}: {item.numero_documento}
                          </p>
                        </td>

                        {/* Escuela o Atleta Responsable */}
                        <td className="py-3 px-4 hidden md:table-cell text-xs text-neutral-600 dark:text-neutral-300">
                          {esAtleta ? (
                            <div className="flex items-center gap-1.5 font-medium">
                              <School className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{item.escuela_nombre}</span>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{item.deportista_nombre}</p>
                              <p className="text-[10px] text-neutral-400 font-mono">C.C. {item.deportista_cedula}</p>
                            </div>
                          )}
                        </td>

                        {/* Vehículo / Placa */}
                        <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap">
                          {item.tiene_vehiculo && item.placa ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="px-2 py-0.5 rounded bg-amber-300 text-neutral-900 font-mono font-black text-xs border border-neutral-900/60">
                                {item.placa}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs">Peatonal</span>
                          )}
                        </td>

                        {/* Semáforo Pill Badge */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {esAutorizado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Autorizado</span>
                            </span>
                          ) : esRechazado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Denegado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </td>

                        {/* Botón Ver Ficha */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRegistroSeleccionado(item);
                            }}
                            className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#0A2540] dark:text-blue-400 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                            title="Ver ficha completa de ingreso"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden lg:inline">Ficha</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── CONTROLES DE PAGINACIÓN APPLE HIG ─── */}
            {totalPaginas > 1 && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
                <span className="text-neutral-500 font-medium">
                  Página <strong className="text-neutral-900 dark:text-white">{paginaActual}</strong> de {totalPaginas} ({registrosFiltrados.length} registros)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    className="min-h-[36px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1 mx-1">
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                      .map((p, idx, arr) => {
                        const esActual = p === paginaActual;
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-neutral-400">…</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPaginaActual(p)}
                              className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                                esActual
                                  ? "bg-[#0A2540] text-white dark:bg-blue-600 shadow-sm"
                                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    className="min-h-[36px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── MODAL DE DETALLE COMPLETO (INSPECCIÓN RÁPIDA) ─── */}
      <Modal
        isOpen={Boolean(registroSeleccionado)}
        onClose={() => setRegistroSeleccionado(null)}
        title={
          registroSeleccionado?.categoria_registro === "deportista"
            ? `Ficha Oficial de ${t("Participante")} Acreditado`
            : `Ficha de ${t("Visitante")} y Vehículo`
        }
        maxWidth="md"
      >
        {registroSeleccionado && (
          <div className="space-y-3">
            {registroSeleccionado.categoria_registro === "deportista" ? (
              /* ─── FICHA OFICIAL DE ATLETA ACREDITADO (ALTA DENSIDAD / COMPACTA) ─── */
              <>
                {/* 1. Banner Slim de Estado */}
                <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 text-white flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
                    <div className="truncate">
                      <p className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">
                        {t("Participante").toUpperCase()} OFICIAL ACREDITADO
                      </p>
                      <p className="text-[10px] text-emerald-100/90 truncate leading-tight">
                        {marca.nombre_actividad} • Ingreso Autorizado
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black uppercase tracking-wider">
                    Autorizado
                  </span>
                </div>

                {/* 2. Tarjeta Resumen: Identidad, Institución y Contacto */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("Participante")}</span>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-snug">
                      {registroSeleccionado.nombre}
                    </h4>
                    <p className="text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-300 mt-0.5">
                      {registroSeleccionado.tipo_documento}: {registroSeleccionado.numero_documento}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("Entidad")}</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate leading-snug">
                      {registroSeleccionado.escuela_nombre}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500 font-mono">
                      {registroSeleccionado.deportista_celular && (
                        <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300 font-semibold">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          {registroSeleccionado.deportista_celular}
                        </span>
                      )}
                      <span>Vigencia 2026</span>
                    </div>
                  </div>
                </div>

                {/* 3. Listado de Acompañantes y Familiares */}
                <div className="rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-neutral-600 dark:text-neutral-300">
                      <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{t("Visitantes")} Registrados ({registroSeleccionado.visitantes_asociados?.length || 0})</span>
                    </div>
                    {registroSeleccionado.visitantes_asociados && registroSeleccionado.visitantes_asociados.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {registroSeleccionado.visitantes_asociados.filter((v) => v.acceso_autorizado).length} Autorizados
                      </span>
                    )}
                  </div>

                  {!registroSeleccionado.visitantes_asociados || registroSeleccionado.visitantes_asociados.length === 0 ? (
                    <div className="p-3 text-center text-xs text-neutral-400">
                      Sin {t("visitantes").toLowerCase()} inscritos en el padrón para este {t("participante").toLowerCase()}.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800 max-h-48 overflow-y-auto no-scrollbar">
                      {registroSeleccionado.visitantes_asociados.map((vis) => (
                        <div
                          key={vis.id}
                          className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="font-bold text-neutral-900 dark:text-white truncate">
                              {vis.nombre}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0A2540] dark:text-blue-300 shrink-0">
                              {vis.parentesco}
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                              {vis.tipo_documento} {vis.numero_documento}
                            </span>
                            {vis.tiene_vehiculo && vis.placa && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-300 text-neutral-900 font-mono font-black text-[10px] border border-neutral-900 shrink-0">
                                🚗 {vis.placa}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                vis.acceso_autorizado
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                  : vis.estado === "Rechazado"
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  vis.acceso_autorizado
                                    ? "bg-emerald-500 animate-pulse"
                                    : vis.estado === "Rechazado"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              <span>{vis.acceso_autorizado ? "Autorizado" : vis.estado === "Rechazado" ? "Denegado" : "Pendiente"}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ─── FICHA DE ACOMPAÑANTE / VEHÍCULO ─── */
              <>
                {/* Banner de Estado */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-white ${
                    registroSeleccionado.acceso_autorizado
                      ? "bg-emerald-600"
                      : registroSeleccionado.estado === "Rechazado"
                      ? "bg-rose-600"
                      : "bg-amber-500"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {registroSeleccionado.acceso_autorizado ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                    )}
                    <div className="truncate">
                      <p className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">
                        {registroSeleccionado.acceso_autorizado
                          ? "INGRESO AUTORIZADO"
                          : "ACCESO DENEGADO / PENDIENTE"}
                      </p>
                      <p className="text-[10px] opacity-90 truncate leading-tight">
                        {registroSeleccionado.motivo_estado}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black uppercase tracking-wider">
                    {registroSeleccionado.estado}
                  </span>
                </div>

                {/* Datos de Identidad y Atleta Responsable */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("Visitante")}</span>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-snug">
                      {registroSeleccionado.nombre}
                    </h4>
                    <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 mt-0.5">
                      {registroSeleccionado.tipo_documento}: {registroSeleccionado.numero_documento}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0A2540] dark:text-blue-300">
                      Parentesco: {registroSeleccionado.parentesco}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("Participante")} Responsable</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 leading-snug">
                      {registroSeleccionado.deportista_nombre}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      C.C. {registroSeleccionado.deportista_cedula}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {registroSeleccionado.escuela_nombre}
                    </p>
                  </div>
                </div>

                {/* Modalidad de Ingreso / Vehículo */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Modalidad de Ingreso</span>
                    {registroSeleccionado.tiene_vehiculo && registroSeleccionado.placa ? (
                      <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                        {registroSeleccionado.modelo || "Vehículo Particular"}
                      </p>
                    ) : (
                      <p className="text-neutral-600 dark:text-neutral-300 font-medium mt-0.5">
                        🚶 Ingreso Peatonal
                      </p>
                    )}
                  </div>
                  {registroSeleccionado.tiene_vehiculo && registroSeleccionado.placa && (
                    <span className="px-3 py-1 rounded-xl bg-amber-300 text-neutral-900 border-2 border-neutral-900 font-mono font-black text-sm">
                      {registroSeleccionado.placa}
                    </span>
                  )}
                </div>

                {/* Nota de estado Pendiente si aplica */}
                {registroSeleccionado.estado === "Pendiente" && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p>
                      <strong>Pendiente de Validación:</strong> Requiere autorización del Administrador o Auxiliar para habilitar su acceso en portería.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Botón Cerrar */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setRegistroSeleccionado(null)}
                className="px-4 py-2 rounded-xl bg-[#0A2540] dark:bg-blue-600 text-white font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function PorteriaClient({
  initialPerfil,
}: {
  initialPerfil?: Perfil | null;
}) {
  const [perfil, setPerfil] = useState<Perfil | null>(initialPerfil || null);

  useEffect(() => {
    if (!initialPerfil) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => {
          if (d.perfil) setPerfil(d.perfil);
        })
        .catch(() => {});
    }
  }, [initialPerfil]);

  return (
    <ToastProvider>
      <AdaptiveLayout
        userRole={perfil?.rol || "porteria"}
        userName={perfil?.nombre || (perfil?.rol === "admin" ? "Administrador General" : "Guardia de Portería")}
        userSubtitle={perfil?.unidad || (perfil?.rol === "admin" ? "Control Maestro Interescuelas" : "Puesto de Control Naval")}
      >
        <PorteriaDashboard perfil={perfil} />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
