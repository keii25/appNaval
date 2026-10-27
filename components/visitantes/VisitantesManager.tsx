"use client";

// components/visitantes/VisitantesManager.tsx — Gestión de Visitantes por Deportista (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type {
  Visitante,
  EstadoVisitante,
  Parentesco,
  TipoDocumento,
  Rol,
} from "@/types/database";
import { useLabels } from "@/lib/marca";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Calendar,
  Car,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  School,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface DeportistaHeaderData {
  id: string;
  nombre_completo: string;
  cedula: string;
  celular: string;
  escuela_id: string;
  escuela_nombre: string;
}

interface VisitantesManagerProps {
  deportistaId: string;
  rolUsuario?: Rol;
  rutaRetorno?: string; // e.g. "/auxiliar" or "/admin"
}

export function VisitantesManager({
  deportistaId,
  rolUsuario = "auxiliar",
  rutaRetorno = "/auxiliar",
}: VisitantesManagerProps) {
  const toast = useToast();
  const { marca, t } = useLabels();

  const [deportista, setDeportista] = useState<DeportistaHeaderData | null>(null);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [limiteMaximo, setLimiteMaximo] = useState(5);
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);
  const [registroVencido, setRegistroVencido] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Modal Agregar Visitante
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoParentesco, setNuevoParentesco] = useState<Parentesco>("Familiar");
  const [nuevoTipoDoc, setNuevoTipoDoc] = useState<TipoDocumento>("CC");
  const [nuevoNumeroDoc, setNuevoNumeroDoc] = useState("");
  const [nuevoNumeroEscarapela, setNuevoNumeroEscarapela] = useState("");
  const [nuevoTieneVehiculo, setNuevoTieneVehiculo] = useState(false);
  const [nuevaPlaca, setNuevaPlaca] = useState("");
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [nuevaFechaDesde, setNuevaFechaDesde] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nuevaFechaHasta, setNuevaFechaHasta] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [nuevoAutorizadoInmediato, setNuevoAutorizadoInmediato] = useState(true);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Modal Editar Visitante
  const [visitanteEditando, setVisitanteEditando] = useState<Visitante | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editParentesco, setEditParentesco] = useState<Parentesco>("Familiar");
  const [editTipoDoc, setEditTipoDoc] = useState<TipoDocumento>("CC");
  const [editNumeroDoc, setEditNumeroDoc] = useState("");
  const [editNumeroEscarapela, setEditNumeroEscarapela] = useState("");
  const [editTieneVehiculo, setEditTieneVehiculo] = useState(false);
  const [editPlaca, setEditPlaca] = useState("");
  const [editModelo, setEditModelo] = useState("");
  const [editFechaDesde, setEditFechaDesde] = useState("");
  const [editFechaHasta, setEditFechaHasta] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Modal Eliminar Visitante
  const [visitanteEliminando, setVisitanteEliminando] = useState<Visitante | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [procesandoEstado, setProcesandoEstado] = useState<string | null>(null);

  const handleCambiarEstado = async (visitanteId: string, nuevoEstado: EstadoVisitante) => {
    setProcesandoEstado(visitanteId);
    try {
      const res = await fetch(`/api/admin/visitantes/${visitanteId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Estado de Seguridad Actualizado", data.mensaje);
        cargarDatos();
      } else {
        toast.error("Error", data.error || "No se pudo actualizar el estado.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setProcesandoEstado(null);
    }
  };

  // 1. Cargar visitantes y datos del deportista
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch(`/api/deportistas/${deportistaId}/visitantes`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setDeportista(data.deportista);
        setVisitantes(data.visitantes || []);
        setLimiteMaximo(data.configuracion?.limite_visitantes ?? 5);
        setFechaLimite(data.configuracion?.fecha_limite || null);
        setRegistroVencido(Boolean(data.configuracion?.registro_vencido));
      } else {
        toast.error("Error", data.error || "No se pudieron cargar los datos del deportista.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [deportistaId, toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // 2. Agregar Visitante
  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoNombre.trim() || !nuevoNumeroDoc.trim()) {
      toast.error("Datos incompletos", "Nombre y número de documento son requeridos.");
      return;
    }

    if (nuevoTieneVehiculo && (!nuevaPlaca.trim() || !nuevoModelo.trim())) {
      toast.error("Datos de Vehículo", "Indique la placa y modelo del vehículo.");
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await fetch(`/api/deportistas/${deportistaId}/visitantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          parentesco: nuevoParentesco,
          tipo_documento: nuevoTipoDoc,
          numero_documento: nuevoNumeroDoc.trim(),
          numero_escarapela: nuevoNumeroEscarapela.trim() || null,
          tiene_vehiculo: nuevoTieneVehiculo,
          placa: nuevoTieneVehiculo ? nuevaPlaca.trim().toUpperCase() : null,
          modelo: nuevoTieneVehiculo ? nuevoModelo.trim() : null,
          fecha_desde: nuevaFechaDesde,
          fecha_hasta: nuevaFechaHasta,
          estado: nuevoAutorizadoInmediato ? "Aprobado" : "Pendiente",
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`${t("Visitante")} Agregado`, data.mensaje);
        setModalAgregarAbierto(false);
        // Reset campos
        setNuevoNombre("");
        setNuevoNumeroDoc("");
        setNuevoNumeroEscarapela("");
        setNuevoTieneVehiculo(false);
        setNuevaPlaca("");
        setNuevoModelo("");
        cargarDatos();
      } else {
        toast.error("No se pudo agregar", data.error || "Error al registrar acompañante.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setGuardandoCrear(false);
    }
  };

  // 3. Abrir modal edición
  const abrirEditar = (v: Visitante) => {
    setVisitanteEditando(v);
    setEditNombre(v.nombre);
    setEditParentesco(v.parentesco);
    setEditTipoDoc(v.tipo_documento);
    setEditNumeroDoc(v.numero_documento);
    setEditNumeroEscarapela(v.numero_escarapela || "");
    setEditTieneVehiculo(Boolean(v.tiene_vehiculo));
    setEditPlaca(v.placa || "");
    setEditModelo(v.modelo || "");
    setEditFechaDesde(v.fecha_desde);
    setEditFechaHasta(v.fecha_hasta);
  };

  // 4. Guardar edición
  const handleGuardarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitanteEditando) return;

    setGuardandoEdit(true);
    try {
      const res = await fetch(`/api/visitantes/${visitanteEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editNombre.trim(),
          parentesco: editParentesco,
          tipo_documento: editTipoDoc,
          numero_documento: editNumeroDoc.trim(),
          numero_escarapela: editNumeroEscarapela.trim() || null,
          tiene_vehiculo: editTieneVehiculo,
          placa: editTieneVehiculo ? editPlaca.trim().toUpperCase() : null,
          modelo: editTieneVehiculo ? editModelo.trim() : null,
          fecha_desde: editFechaDesde,
          fecha_hasta: editFechaHasta,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Acreditación Actualizada", data.mensaje);
        setVisitanteEditando(null);
        cargarDatos();
      } else {
        toast.error("Error al actualizar", data.error || "No se pudo actualizar.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  // 5. Eliminar visitante
  const handleEliminar = async () => {
    if (!visitanteEliminando) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/visitantes/${visitanteEliminando.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`${t("Visitante")} Removido`, data.mensaje);
        setVisitanteEliminando(null);
        cargarDatos();
      } else {
        toast.error("Error al eliminar", data.error || "No se pudo remover.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setEliminando(false);
    }
  };

  const totalUsados = visitantes.length;
  const cuposDisponibles = Math.max(0, limiteMaximo - totalUsados);
  const limiteAlcanzado = totalUsados >= limiteMaximo;

  return (
    <div className="space-y-6 pb-20">
      {/* ─── BOTÓN VOLVER Y ENCABEZADO ─── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={rutaRetorno}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#0A2540] dark:hover:text-white transition-colors py-1 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Padrón de {t("Participantes")}</span>
        </Link>

        <button
          type="button"
          onClick={cargarDatos}
          title="Recargar datos"
          className="min-h-[38px] min-w-[38px] p-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ─── TARJETA PRINCIPAL: FICHA DEL DEPORTISTA Y ESTADO DE CUPOS ─── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0A2540] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
              {deportista?.nombre_completo.charAt(0).toUpperCase() || "D"}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {deportista?.nombre_completo || `Cargando ${t("participante")}...`}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  CC {deportista?.cedula}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#0A2540] dark:bg-blue-950/60 dark:text-blue-300">
                  <School className="w-3.5 h-3.5" />
                  {deportista?.escuela_nombre}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md bg-neutral-100/80 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {deportista?.celular}
                </span>
              </div>
            </div>
          </div>

          {/* Botón Agregar Visitante */}
          <button
            type="button"
            onClick={() => setModalAgregarAbierto(true)}
            disabled={limiteAlcanzado || (registroVencido && rolUsuario !== "admin")}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Agregar {t("Visitante")}</span>
          </button>
        </div>

        {/* Barra de Cupos y Plazo (Apple HIG Inset Grouped) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Cupos de Acreditación
              </span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                {totalUsados} de {limiteMaximo} usados ({cuposDisponibles} disponibles)
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  limiteAlcanzado
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                {limiteAlcanzado ? "Cupo Lleno" : "Habilitado"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Plazo de Registro
              </span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                {fechaLimite
                  ? new Date(fechaLimite).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Registro continuo (Sin fecha límite)"}
              </p>
            </div>
            {registroVencido && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                Plazo Cerrado
              </span>
            )}
          </div>
        </div>

        {registroVencido && rolUsuario !== "admin" && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              El periodo oficial para acreditaciones ha concluido. Solo el Administrador puede realizar excepciones.
            </span>
          </div>
        )}
      </div>

      {/* ─── LISTADO DE VISITANTES REGISTRADOS ─── */}
      <div className="space-y-3">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Acompañantes y {t("Visitantes")} Acreditados
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Familiares y acompañantes autorizados para el ingreso a {marca.organizacion}.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {visitantes.length} / {limiteMaximo}
          </span>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-neutral-400 text-sm rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando {t("visitantes")}...
          </div>
        ) : visitantes.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs">
            <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Sin acompañantes registrados
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Este {t("participante")} aún no tiene {t("visitantes")} acreditados. Haga clic en &quot;Agregar {t("Visitante")}&quot; para registrar uno nuevo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visitantes.map((v) => {
              const badgeEstado =
                v.estado === "Aprobado"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : v.estado === "Rechazado"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

              return (
                <div
                  key={v.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all"
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
                        {v.numero_escarapela && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                            Escarapela #{v.numero_escarapela}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0A2540] dark:bg-blue-950/60 dark:text-blue-300">
                          {v.parentesco}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeEstado}`}>
                          {v.estado}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          {v.fecha_desde} al {v.fecha_hasta}
                        </span>

                        {v.tiene_vehiculo && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                              <Car className="w-3.5 h-3.5" />
                              Placa: <strong className="font-mono">{v.placa}</strong> ({v.modelo})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de aprobación (Admin o Auxiliar), edición y eliminación */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    {(rolUsuario === "admin" || rolUsuario === "auxiliar") && (
                      <div className="flex items-center gap-1.5 mr-1">
                        {v.estado !== "Aprobado" && (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstado(v.id, "Aprobado")}
                            disabled={procesandoEstado === v.id}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                            title={`Autorizar ingreso oficial a ${marca.organizacion}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>
                        )}
                        {v.estado !== "Rechazado" && (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstado(v.id, "Rechazado")}
                            disabled={procesandoEstado === v.id}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                            title={`Denegar ingreso a ${marca.organizacion}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Denegar</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Botón Acceso e Historial en Portería */}
                    <Link
                      href={`/porteria?q=${v.numero_documento}`}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#0A2540] dark:text-blue-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      title={`Control de Acceso e Historial de ${v.nombre}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="hidden sm:inline">Acceso</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => abrirEditar(v)}
                      className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisitanteEliminando(v)}
                      className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:text-rose-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
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
      </div>

      {/* ─── MODAL: AGREGAR VISITANTE ─── */}
      <Modal
        isOpen={modalAgregarAbierto}
        onClose={() => setModalAgregarAbierto(false)}
        title={`Acreditar Nuevo ${t("Visitante")}`}
        description={`Registro de ${t("visitante")} para ${deportista?.nombre_completo}.`}
        maxWidth="lg"
      >
        <form onSubmit={handleAgregar} className="space-y-4">
          <Input
            label={`Nombre Completo del ${t("Visitante")} *`}
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: María Fernanda Gómez"
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Parentesco *
              </label>
              <select
                value={nuevoParentesco}
                onChange={(e) => setNuevoParentesco(e.target.value as Parentesco)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              >
                <option value="Familiar">Familiar</option>
                <option value="Amigo">Amigo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Tipo Documento *
              </label>
              <select
                value={nuevoTipoDoc}
                onChange={(e) => setNuevoTipoDoc(e.target.value as TipoDocumento)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Número de Documento *"
              value={nuevoNumeroDoc}
              onChange={(e) => setNuevoNumeroDoc(e.target.value)}
              placeholder="Ej: 1045678901"
              required
            />

            <Input
              label="Número de Escarapela (Opcional)"
              value={nuevoNumeroEscarapela}
              onChange={(e) => setNuevoNumeroEscarapela(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 001, 002 (Acepta ceros iniciales)"
              inputMode="numeric"
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Fecha Desde *
              </label>
              <input
                type="date"
                value={nuevaFechaDesde}
                onChange={(e) => setNuevaFechaDesde(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Fecha Hasta *
              </label>
              <input
                type="date"
                value={nuevaFechaHasta}
                onChange={(e) => setNuevaFechaHasta(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Switch de Vehículo */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
            <Switch
              label="¿Ingresa con vehículo propio?"
              description="Habilita el ingreso de automotor por portería militar."
              checked={nuevoTieneVehiculo}
              onChange={setNuevoTieneVehiculo}
              id="switch-nuevo-vehiculo"
            />

            {nuevoTieneVehiculo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input
                  label="Placa del Vehículo *"
                  value={nuevaPlaca}
                  onChange={(e) => setNuevaPlaca(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  maxLength={7}
                  required={nuevoTieneVehiculo}
                />
                <Input
                  label="Marca y Modelo *"
                  value={nuevoModelo}
                  onChange={(e) => setNuevoModelo(e.target.value)}
                  placeholder="Ej: Chevrolet Onix Gris"
                  required={nuevoTieneVehiculo}
                />
              </div>
            )}
          </div>

          {/* Switch de Autorización Inmediata para Staff (Admin o Auxiliar) */}
          {(rolUsuario === "admin" || rolUsuario === "auxiliar") && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <Switch
                label="Autorizar acceso oficial de inmediato"
                description="Habilita el ingreso con estado Aprobado para que en Portería aparezca Autorizado inmediatamente."
                checked={nuevoAutorizadoInmediato}
                onChange={setNuevoAutorizadoInmediato}
                id="switch-nuevo-autorizado"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalAgregarAbierto(false)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoCrear}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {guardandoCrear ? "Registrando..." : `Acreditar ${t("Visitante")}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDITAR VISITANTE ─── */}
      <Modal
        isOpen={!!visitanteEditando}
        onClose={() => setVisitanteEditando(null)}
        title={`Editar ${t("Visitante")}`}
        description={`Modifique los datos de ${visitanteEditando?.nombre}.`}
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Parentesco *
              </label>
              <select
                value={editParentesco}
                onChange={(e) => setEditParentesco(e.target.value as Parentesco)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              >
                <option value="Familiar">Familiar</option>
                <option value="Amigo">Amigo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Tipo Documento *
              </label>
              <select
                value={editTipoDoc}
                onChange={(e) => setEditTipoDoc(e.target.value as TipoDocumento)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Número de Documento *"
              value={editNumeroDoc}
              onChange={(e) => setEditNumeroDoc(e.target.value)}
              required
            />

            <Input
              label="Número de Escarapela (Opcional)"
              value={editNumeroEscarapela}
              onChange={(e) => setEditNumeroEscarapela(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 001, 002..."
              inputMode="numeric"
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Fecha Desde *
              </label>
              <input
                type="date"
                value={editFechaDesde}
                onChange={(e) => setEditFechaDesde(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Fecha Hasta *
              </label>
              <input
                type="date"
                value={editFechaHasta}
                onChange={(e) => setEditFechaHasta(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
            <Switch
              label="¿Ingresa con vehículo propio?"
              checked={editTieneVehiculo}
              onChange={setEditTieneVehiculo}
              id="switch-edit-vehiculo"
            />

            {editTieneVehiculo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input
                  label="Placa del Vehículo *"
                  value={editPlaca}
                  onChange={(e) => setEditPlaca(e.target.value.toUpperCase())}
                  maxLength={7}
                  required={editTieneVehiculo}
                />
                <Input
                  label="Marca y Modelo *"
                  value={editModelo}
                  onChange={(e) => setEditModelo(e.target.value)}
                  required={editTieneVehiculo}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setVisitanteEditando(null)}
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

      {/* ─── MODAL: ELIMINAR VISITANTE ─── */}
      <Modal
        isOpen={!!visitanteEliminando}
        onClose={() => setVisitanteEliminando(null)}
        title={`¿Eliminar ${t("Visitante")}?`}
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              ¿Está seguro de eliminar a &quot;{visitanteEliminando?.nombre}&quot;?
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Esta acción revocará la autorización de ingreso y liberará 1 cupo para {t("el", "participante")}.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setVisitanteEliminando(null)}
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
        </div>
      </Modal>
    </div>
  );
}

export default VisitantesManager;
