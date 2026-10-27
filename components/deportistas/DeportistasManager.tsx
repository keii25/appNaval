"use client";

// components/deportistas/DeportistasManager.tsx — Módulo de Gestión de Deportistas (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Rol } from "@/types/database";
import { useLabels } from "@/lib/marca";
import {
  Users,
  Search,
  Plus,
  School,
  Phone,
  Pencil,
  Trash2,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  FileText,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface DeportistaItem {
  id: string;
  nombre_completo: string;
  cedula: string;
  celular: string;
  escuela_id: string;
  escuela_nombre: string;
  escuela_activa: boolean;
  numero_escarapela?: string | null;
  observaciones: string | null;
  autorizacion_datos: boolean;
  creado_en: string;
  visitantes_count: number;
}

interface EscuelaOption {
  id: string;
  nombre: string;
  activa: boolean;
}

interface DeportistasManagerProps {
  rolUsuario?: Rol;
  baseRutaVisitantes?: string; // e.g. "/auxiliar" or "/admin"
}

export function DeportistasManager({
  rolUsuario = "auxiliar",
  baseRutaVisitantes = "/auxiliar",
}: DeportistasManagerProps) {
  const toast = useToast();
  const { marca, t } = useLabels();

  const [deportistas, setDeportistas] = useState<DeportistaItem[]>([]);
  const [totalDeportistasBd, setTotalDeportistasBd] = useState<number | null>(null);
  const [escuelas, setEscuelas] = useState<EscuelaOption[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros y Paginación (limitado a 10 por vista)
  const [busqueda, setBusqueda] = useState("");
  const [filtroEscuela, setFiltroEscuela] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const ELEMENTOS_POR_PAGINA = 10;

  // Modal Crear Deportista
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCedula, setNuevaCedula] = useState("");
  const [nuevoCelular, setNuevoCelular] = useState("");
  const [nuevaEscuelaId, setNuevaEscuelaId] = useState("");
  const [nuevoNumeroEscarapela, setNuevoNumeroEscarapela] = useState("");
  const [nuevasObservaciones, setNuevasObservaciones] = useState("");
  const [aceptoLey1581, setAceptoLey1581] = useState(false);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Modal Editar Deportista
  const [deportistaEditando, setDeportistaEditando] = useState<DeportistaItem | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [editCelular, setEditCelular] = useState("");
  const [editEscuelaId, setEditEscuelaId] = useState("");
  const [editNumeroEscarapela, setEditNumeroEscarapela] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Modal Eliminar Deportista
  const [deportistaEliminando, setDeportistaEliminando] = useState<DeportistaItem | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // 1. Cargar catálogo de escuelas activas
  const cargarEscuelas = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/escuelas?activas=true");
      const data = await res.json();
      if (res.ok && data.escuelas) {
        setEscuelas(data.escuelas);
        if (data.escuelas.length > 0 && !nuevaEscuelaId) {
          setNuevaEscuelaId(data.escuelas[0].id);
        }
      }
    } catch {
      // Silencioso
    }
  }, [nuevaEscuelaId]);

  // 2. Cargar deportistas
  const cargarDeportistas = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append("q", busqueda.trim());
      if (filtroEscuela) params.append("escuela_id", filtroEscuela);

      const res = await fetch(`/api/deportistas?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setDeportistas(data.deportistas || []);
        if (typeof data.total === "number") {
          setTotalDeportistasBd(data.total);
        }
      } else {
        toast.error("Error", data.error || `No se pudieron cargar ${t("los", "participante", true)}.`);
      }
    } catch {
      toast.error("Error", `Error de conexión al obtener ${t("los", "participante", true)}.`);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroEscuela, toast, t]);

  useEffect(() => {
    cargarEscuelas();
  }, [cargarEscuelas]);

  useEffect(() => {
    cargarDeportistas();
    setPaginaActual(1);
  }, [cargarDeportistas]);

  // 3. Crear nuevo deportista
  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aceptoLey1581) {
      toast.error(
        "Autorización Obligatoria",
        "Debe marcar la casilla de autorización de datos conforme a la Ley 1581 de 2012."
      );
      return;
    }

    if (!nuevoNombre.trim() || !nuevaCedula.trim() || !nuevoCelular.trim() || !nuevaEscuelaId) {
      toast.error("Datos incompletos", "Complete todos los campos requeridos.");
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await fetch("/api/deportistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: nuevoNombre.trim(),
          cedula: nuevaCedula.trim(),
          celular: nuevoCelular.trim(),
          escuela_id: nuevaEscuelaId,
          numero_escarapela: nuevoNumeroEscarapela.trim() || null,
          observaciones: nuevasObservaciones.trim() || null,
          autorizacion_datos: true,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`${t("Participante")} Registrado`, data.mensaje);
        setModalCrearAbierto(false);
        setNuevoNombre("");
        setNuevaCedula("");
        setNuevoCelular("");
        setNuevoNumeroEscarapela("");
        setNuevasObservaciones("");
        setAceptoLey1581(false);
        cargarDeportistas();
      } else {
        toast.error("No fue posible registrar", data.error || "Ocurrió un error.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setGuardandoCrear(false);
    }
  };

  // 4. Abrir modal editar
  const abrirEditar = (d: DeportistaItem) => {
    setDeportistaEditando(d);
    setEditNombre(d.nombre_completo);
    setEditCedula(d.cedula);
    setEditCelular(d.celular);
    setEditEscuelaId(d.escuela_id);
    setEditNumeroEscarapela(d.numero_escarapela || "");
    setEditObservaciones(d.observaciones || "");
  };

  // 5. Guardar edición
  const handleGuardarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deportistaEditando) return;

    setGuardandoEdit(true);
    try {
      const res = await fetch(`/api/deportistas/${deportistaEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: editNombre.trim(),
          cedula: editCedula.trim(),
          celular: editCelular.trim(),
          escuela_id: editEscuelaId,
          numero_escarapela: editNumeroEscarapela.trim() || null,
          observaciones: editObservaciones.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Datos Actualizados", data.mensaje);
        setDeportistaEditando(null);
        cargarDeportistas();
      } else {
        toast.error("Error al actualizar", data.error || "No se pudo actualizar el registro.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  // 6. Eliminar deportista (validando visitantes)
  const handleEliminar = async () => {
    if (!deportistaEliminando) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/deportistas/${deportistaEliminando.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`${t("Participante")} Eliminado`, data.mensaje);
        setDeportistaEliminando(null);
        cargarDeportistas();
      } else {
        toast.error("Eliminación Bloqueada", data.error || "No se pudo eliminar.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setEliminando(false);
    }
  };

  const totalDeportistas = busqueda.trim() || filtroEscuela
    ? deportistas.length
    : (totalDeportistasBd ?? deportistas.length);
  const totalVisitantes = deportistas.reduce((sum, d) => sum + (d.visitantes_count || 0), 0);

  // Cálculos de paginación oficial (máximo 10 deportistas por vista)
  const totalPaginas = Math.max(1, Math.ceil(deportistas.length / ELEMENTOS_POR_PAGINA));
  const paginaValida = Math.min(paginaActual, totalPaginas);
  const inicioIndice = (paginaValida - 1) * ELEMENTOS_POR_PAGINA;
  const finIndice = inicioIndice + ELEMENTOS_POR_PAGINA;
  const deportistasPaginados = deportistas.slice(inicioIndice, finIndice);

  return (
    <div className="space-y-6">
      {/* ─── TARJETAS DE ESTADÍSTICAS RÁPIDAS (COMPACTAS EN MÓVIL) ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Participantes */}
        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs sm:shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block truncate">
              {t("Participantes")}
            </span>
            <p className="text-base sm:text-2xl font-black text-neutral-900 dark:text-white mt-0.5 sm:mt-1 leading-tight truncate">
              {totalDeportistas}
            </p>
          </div>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 2: Entidades */}
        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs sm:shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block truncate">
              {t("Entidades")}
            </span>
            <p className="text-base sm:text-2xl font-black text-neutral-900 dark:text-white mt-0.5 sm:mt-1 leading-tight truncate">
              {escuelas.length}
            </p>
          </div>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0">
            <School className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 3: Visitantes */}
        <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs sm:shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
              {t("Visitantes")}
            </span>
            <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 leading-tight truncate">
              {totalVisitantes}
            </p>
          </div>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* ─── BARRA DE ACCIÓN Y BÚSQUEDA EN TIEMPO REAL ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por documento o nombre..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={filtroEscuela}
            onChange={(e) => setFiltroEscuela(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="">{t("todos", "entidad")}</option>
            {escuelas.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.nombre}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={cargarDeportistas}
              title="Recargar listado"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-all active:scale-95 shadow-sm shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setModalCrearAbierto(true)}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{t("nuevo", "participante")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── LISTADO INSET GROUPED APPLE HIG ─── */}
      <div className="space-y-3">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Padrón Oficial de {t("Participantes")}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Registro oficial de {t("participantes")} para la acreditación de {t("visitantes")} e ingreso a instalaciones.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {deportistas.length} {deportistas.length === 1 ? t("participante") : t("participantes")}
            </span>
            {totalPaginas > 1 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0A2540] dark:text-blue-300">
                Pág. {paginaValida}/{totalPaginas}
              </span>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-neutral-400 text-sm rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Consultando registros...
          </div>
        ) : deportistas.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs">
            <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No se encontraron {t("participantes")}
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {busqueda || filtroEscuela
                ? `Ningún ${t("participante")} coincide con los filtros aplicados.`
                : `Utilice el botón '${t("nuevo", "participante")}' para registrar ${t("al", "participante")} o importe el archivo CSV.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deportistasPaginados.map((d) => {
              const tieneVisitantes = d.visitantes_count > 0;

              return (
                <div
                  key={d.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-400 font-bold text-sm shrink-0 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                          {d.nombre_completo}
                        </h4>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          CC {d.cedula}
                        </span>
                        {d.numero_escarapela && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                            Escarapela #{d.numero_escarapela}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0A2540] dark:bg-blue-950/60 dark:text-blue-300 truncate max-w-xs">
                          {d.escuela_nombre}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-md bg-neutral-100/80 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300">
                          <Phone className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          {d.celular}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Ley 1581 Autorizada
                        </span>
                        {d.observaciones && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100/60 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 italic truncate max-w-xs sm:max-w-sm">
                            &quot;{d.observaciones}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones para el deportista */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Botón Ver / Gestionar Visitantes (Paso 5) */}
                    <Link
                      href={`${baseRutaVisitantes}/deportistas/${d.id}/visitantes`}
                      className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {t("Visitantes")} ({d.visitantes_count})
                      </span>
                    </Link>

                    {/* Botón Acceso e Historial en Portería */}
                    <Link
                      href={`/porteria?q=${d.cedula}`}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#0A2540] dark:text-blue-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      title={`Control de Acceso e Historial de ${d.nombre_completo}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="hidden sm:inline">Acceso</span>
                    </Link>

                    {/* Botón Editar */}
                    <button
                      type="button"
                      onClick={() => abrirEditar(d)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                      <span>Editar</span>
                    </button>

                    {/* Botón Eliminar con validación estricta */}
                    <button
                      type="button"
                      onClick={() => setDeportistaEliminando(d)}
                      title={
                        tieneVisitantes
                          ? `No se puede eliminar: tiene ${t("visitantes")} asociados.`
                          : `Eliminar ${t("participante")}`
                      }
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        tieneVisitantes
                          ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800/60 dark:text-neutral-500 hover:bg-neutral-200"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:text-rose-400"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── BARRA DE PAGINACIÓN APPLE HIG (MÁXIMO 10 POR VISTA) ─── */}
        {deportistas.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center sm:text-left">
              Mostrando <strong className="text-neutral-900 dark:text-white font-bold">{inicioIndice + 1}</strong> a{" "}
              <strong className="text-neutral-900 dark:text-white font-bold">{Math.min(finIndice, deportistas.length)}</strong> de{" "}
              <strong className="text-neutral-900 dark:text-white font-bold">{deportistas.length}</strong> {t("participantes")}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5 select-none">
                {/* Botón Anterior */}
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaValida === 1}
                  aria-label="Página anterior"
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter((num) => {
                      return (
                        num === 1 ||
                        num === totalPaginas ||
                        Math.abs(num - paginaValida) <= 1
                      );
                    })
                    .reduce<(number | string)[]>((acc, num, idx, arr) => {
                      if (idx > 0 && num - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(num);
                      return acc;
                    }, [])
                    .map((item, index) =>
                      typeof item === "string" ? (
                        <span
                          key={`dots-${index}`}
                          className="px-2 text-xs text-neutral-400 select-none"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPaginaActual(item)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
                            paginaValida === item
                              ? "bg-[#0A2540] text-white shadow-sm"
                              : "bg-white dark:bg-[#2C2C2E] border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                {/* Botón Siguiente */}
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaValida === totalPaginas}
                  aria-label="Página siguiente"
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL: NUEVO DEPORTISTA ─── */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title={`Registrar ${t("nuevo", "participante")}`}
        description={`Ficha oficial de ${t("participante")} en ${marca.nombre_actividad}.`}
        maxWidth="lg"
      >
        <form onSubmit={handleCrear} className="space-y-4">
          <Input
            label="Nombre Completo *"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: Cadete Juan Carlos Pérez"
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Número de Documento / Cédula *"
              value={nuevaCedula}
              onChange={(e) => setNuevaCedula(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 1045678901"
              required
            />

            <Input
              label="Teléfono Celular (10 dígitos) *"
              value={nuevoCelular}
              onChange={(e) => setNuevoCelular(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 3001234567"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                {t("Entidad")} *
              </label>
              <select
                value={nuevaEscuelaId}
                onChange={(e) => setNuevaEscuelaId(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
              >
                <option value="" disabled>Seleccione una {t("entidad")}...</option>
                {escuelas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Número de Escarapela (Opcional)"
              value={nuevoNumeroEscarapela}
              onChange={(e) => setNuevoNumeroEscarapela(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 001, 002 (Acepta ceros iniciales)"
              inputMode="numeric"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
              Observaciones o Disciplina (Opcional)
            </label>
            <textarea
              value={nuevasObservaciones}
              onChange={(e) => setNuevasObservaciones(e.target.value)}
              placeholder="Ej: Acreditado para Natación y Atletismo."
              rows={2}
              maxLength={500}
              className="w-full p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] resize-none"
            />
          </div>

          {/* ─── CASILLA OBLIGATORIA LEY 1581 DE 2012 ─── */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="check-ley-1581"
                type="checkbox"
                checked={aceptoLey1581}
                onChange={(e) => setAceptoLey1581(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded-lg text-[#0A2540] focus:ring-[#0A2540] border-neutral-300 dark:border-neutral-600 shrink-0 cursor-pointer"
                required
              />
              <label
                htmlFor="check-ley-1581"
                className="text-xs text-neutral-800 dark:text-neutral-200 leading-snug cursor-pointer select-none"
              >
                <strong className="block text-[#0A2540] dark:text-blue-300 font-bold mb-0.5">
                  Autorización Obligatoria — Tratamiento de Datos (Ley 1581 de 2012) *
                </strong>
                Certifico que {t("el", "participante")} ha suministrado y autorizado el tratamiento de sus datos personales conforme a la Ley 1581 de 2012 para fines de acreditación, seguridad militar y acceso al recinto de {marca.organizacion}.
              </label>
            </div>
            {!aceptoLey1581 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pl-8">
                * Debe marcar esta autorización para poder registrar {t("al", "participante")}.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalCrearAbierto(false)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoCrear || !aceptoLey1581}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardandoCrear ? "Registrando..." : `Guardar ${t("Participante")}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDITAR DEPORTISTA ─── */}
      <Modal
        isOpen={!!deportistaEditando}
        onClose={() => setDeportistaEditando(null)}
        title={`Editar Ficha ${t("del", "participante")}`}
        description={`Modifique los datos de ${deportistaEditando?.nombre_completo}.`}
        maxWidth="lg"
      >
        <form onSubmit={handleGuardarEdit} className="space-y-4">
          <Input
            label="Nombre Completo *"
            value={editNombre}
            onChange={(e) => setEditNombre(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Número de Cédula *"
              value={editCedula}
              onChange={(e) => setEditCedula(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />

            <Input
              label="Teléfono Celular *"
              value={editCelular}
              onChange={(e) => setEditCelular(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                {t("Entidad")} Oficial
              </label>
              <select
                value={editEscuelaId}
                onChange={(e) => setEditEscuelaId(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
              >
                {escuelas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Número de Escarapela (Opcional)"
              value={editNumeroEscarapela}
              onChange={(e) => setEditNumeroEscarapela(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 001, 002..."
              inputMode="numeric"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
              Observaciones
            </label>
            <textarea
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDeportistaEditando(null)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoEdit}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {guardandoEdit ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: CONFIRMAR ELIMINACIÓN O BLOQUEO SI TIENE VISITANTES ─── */}
      <Modal
        isOpen={!!deportistaEliminando}
        onClose={() => setDeportistaEliminando(null)}
        title={
          (deportistaEliminando?.visitantes_count || 0) > 0
            ? "Acción Protegida"
            : `¿Eliminar ${t("Participante")}?`
        }
      >
        <div className="space-y-4">
          {(deportistaEliminando?.visitantes_count || 0) > 0 ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  No se puede eliminar a {deportistaEliminando?.nombre_completo}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Este {t("participante")} tiene{" "}
                  <strong className="text-neutral-900 dark:text-white font-bold">
                    {deportistaEliminando?.visitantes_count} {t("visitantes")} registrado(s)
                  </strong>. Por seguridad y trazabilidad, no se permite eliminar {t("participantes")} con acompañantes activos.
                </p>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-300 text-left mt-2">
                  <strong>Instrucción:</strong> Ingrese a la gestión de {t("visitantes")} de este {t("participante")} y elimínelos primero si desea borrar la ficha {t("del", "participante")}.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeportistaEliminando(null)}
                  className="w-full min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
                >
                  Entendido
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  ¿Confirma eliminar a &quot;{deportistaEliminando?.nombre_completo}&quot;?
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  El {t("participante")} no tiene {t("visitantes")} asociados. Esta acción removerá su ficha definitivamente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeportistaEliminando(null)}
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="min-h-[44px] px-6 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {eliminando ? "Eliminando..." : "Eliminar Definitivamente"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default DeportistasManager;
