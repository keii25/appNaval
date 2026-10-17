"use client";

// app/(app)/admin/components/TabEscuelas.tsx — Gestión y CRUD de Escuelas (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  School,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

export interface EscuelaItem {
  id: string;
  nombre: string;
  activa: boolean;
  creado_en: string;
  deportistas_count: number;
}

export function TabEscuelas() {
  const toast = useToast();

  const [escuelas, setEscuelas] = useState<EscuelaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActiva, setFiltroActiva] = useState<"todas" | "activas" | "inactivas">("todas");

  // Modal Crear
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaActiva, setNuevaActiva] = useState(true);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Modal Editar
  const [escuelaEditando, setEscuelaEditando] = useState<EscuelaItem | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editActiva, setEditActiva] = useState(true);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Modal Eliminar / Advertencia
  const [escuelaEliminando, setEscuelaEliminando] = useState<EscuelaItem | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Cargar escuelas
  const cargarEscuelas = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/escuelas");
      const data = await res.json();
      if (res.ok && data.ok) {
        setEscuelas(data.escuelas || []);
      } else {
        toast.error("Error", data.error || "No se pudieron cargar las escuelas.");
      }
    } catch {
      toast.error("Error", "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarEscuelas();
  }, [cargarEscuelas]);

  // Toggle rápida de activa / inactiva
  const handleToggleActiva = async (escuela: EscuelaItem) => {
    const nuevoEstado = !escuela.activa;
    // Actualización optimista
    setEscuelas((prev) =>
      prev.map((e) => (e.id === escuela.id ? { ...e, activa: nuevoEstado } : e))
    );

    try {
      const res = await fetch("/api/admin/escuelas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: escuela.id, activa: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revertir
        setEscuelas((prev) =>
          prev.map((e) => (e.id === escuela.id ? { ...e, activa: escuela.activa } : e))
        );
        toast.error("Error", data.error || "No se pudo actualizar el estado.");
      } else {
        toast.success(
          nuevoEstado ? "Escuela Activada" : "Escuela Desactivada",
          `La escuela "${escuela.nombre}" ahora está ${nuevoEstado ? "activa" : "inactiva"}.`
        );
      }
    } catch {
      setEscuelas((prev) =>
        prev.map((e) => (e.id === escuela.id ? { ...e, activa: escuela.activa } : e))
      );
      toast.error("Error", "Error de conexión.");
    }
  };

  // Crear Escuela
  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || nuevoNombre.trim().length < 3) {
      toast.error("Nombre inválido", "El nombre debe tener al menos 3 caracteres.");
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await fetch("/api/admin/escuelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), activa: nuevaActiva }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Escuela Creada", data.mensaje);
        setModalCrearAbierto(false);
        setNuevoNombre("");
        setNuevaActiva(true);
        cargarEscuelas();
      } else {
        toast.error("Error al crear", data.error || "No fue posible registrar la escuela.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setGuardandoCrear(false);
    }
  };

  // Abrir Modal Editar
  const abrirEditar = (escuela: EscuelaItem) => {
    setEscuelaEditando(escuela);
    setEditNombre(escuela.nombre);
    setEditActiva(escuela.activa);
  };

  // Guardar Edición
  const handleGuardarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escuelaEditando) return;
    if (!editNombre.trim() || editNombre.trim().length < 3) {
      toast.error("Nombre inválido", "El nombre debe tener al menos 3 caracteres.");
      return;
    }

    setGuardandoEdit(true);
    try {
      const res = await fetch("/api/admin/escuelas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: escuelaEditando.id,
          nombre: editNombre.trim(),
          activa: editActiva,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Escuela Actualizada", data.mensaje);
        setEscuelaEditando(null);
        cargarEscuelas();
      } else {
        toast.error("Error al guardar", data.error || "No se pudo actualizar.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  // Confirmar y Ejecutar Eliminación
  const handleEliminar = async () => {
    if (!escuelaEliminando) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/escuelas?id=${escuelaEliminando.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Escuela Eliminada", data.mensaje);
        setEscuelaEliminando(null);
        cargarEscuelas();
      } else {
        toast.error("No permitida", data.error || "No fue posible eliminar la escuela.");
      }
    } catch {
      toast.error("Error", "Error de conexión al eliminar.");
    } finally {
      setEliminando(false);
    }
  };

  // Filtros
  const escuelasFiltradas = escuelas.filter((esc) => {
    const coincideNombre = esc.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideNombre) return false;
    if (filtroActiva === "activas") return esc.activa;
    if (filtroActiva === "inactivas") return !esc.activa;
    return true;
  });

  const totalEscuelas = escuelas.length;
  const totalActivas = escuelas.filter((e) => e.activa).length;
  const totalDeportistas = escuelas.reduce((sum, e) => sum + (e.deportistas_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Tarjetas de Estadísticas de Escuelas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Total Escuelas
            </span>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {totalEscuelas}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[#0A2540] dark:text-blue-400">
            <School className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Activas
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totalActivas}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0A2540] dark:text-blue-400">
              Deportistas Registrados
            </span>
            <p className="text-2xl font-black text-[#0A2540] dark:text-blue-400 mt-1">
              {totalDeportistas}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0A2540] dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Acciones y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de escuela..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {/* Filtro estado */}
          <select
            value={filtroActiva}
            onChange={(e: any) => setFiltroActiva(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="todas">Todas ({totalEscuelas})</option>
            <option value="activas">Solo Activas ({totalActivas})</option>
            <option value="inactivas">Inactivas ({totalEscuelas - totalActivas})</option>
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={cargarEscuelas}
              title="Recargar catálogo"
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
              <span>Nueva Escuela</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Escuelas (Inset Grouped Card Apple HIG) */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Catálogo de Escuelas Participantes
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Escuelas militares y policiales oficiales para la acreditación de deportistas.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {escuelasFiltradas.length} {escuelasFiltradas.length === 1 ? "escuela" : "escuelas"}
          </span>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando catálogo de escuelas...
          </div>
        ) : escuelasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <School className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No se encontraron escuelas
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {busqueda
                ? "Ninguna escuela coincide con la búsqueda introducida."
                : "Aún no se han registrado escuelas en el catálogo."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {escuelasFiltradas.map((esc) => {
              const tieneDeportistas = (esc.deportistas_count || 0) > 0;

              return (
                <div
                  key={esc.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${
                        esc.activa
                          ? "bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-400"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      <School className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white truncate">
                          {esc.nombre}
                        </h4>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            esc.activa
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {esc.activa ? "Activa" : "Inactiva"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                          <Users className="w-3.5 h-3.5 text-neutral-400" />
                          {esc.deportistas_count} {esc.deportistas_count === 1 ? "deportista" : "deportistas"}
                        </span>
                        <span>•</span>
                        <span>
                          Registrada {new Date(esc.creado_en).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones para cada escuela */}
                  <div className="flex items-center gap-2.5 self-stretch sm:self-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Switch activa/inactiva */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {esc.activa ? "Activa" : "Inactiva"}
                      </span>
                      <Switch
                        checked={esc.activa}
                        onChange={() => handleToggleActiva(esc)}
                        id={`switch-escuela-${esc.id}`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón Editar */}
                      <button
                        type="button"
                        onClick={() => abrirEditar(esc)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                        <span>Editar</span>
                      </button>

                      {/* Botón Eliminar con validación estricta */}
                      <button
                        type="button"
                        onClick={() => setEscuelaEliminando(esc)}
                        title={
                          tieneDeportistas
                            ? "Protección: Esta escuela tiene deportistas asociados y no puede eliminarse."
                            : "Eliminar escuela del catálogo"
                        }
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          tieneDeportistas
                            ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800/60 dark:text-neutral-500 hover:bg-neutral-200"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:text-rose-400"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL: NUEVA ESCUELA ─── */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="Nueva Escuela Oficial"
        description="Agregue una nueva institución para la acreditación en los Inter Escuelas."
      >
        <form onSubmit={handleCrear} className="space-y-4">
          <Input
            label="Nombre de la Escuela *"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder='Ej: Escuela Naval de Suboficiales "ARC Barranquilla"'
            required
            autoFocus
          />

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <Switch
              label="Habilitar para registro de deportistas"
              description="Si está activa, los auxiliares podrán seleccionarla al registrar deportistas."
              checked={nuevaActiva}
              onChange={setNuevaActiva}
              id="switch-nueva-escuela"
            />
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
              disabled={guardandoCrear}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {guardandoCrear ? "Guardando..." : "Crear Escuela"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDITAR ESCUELA ─── */}
      <Modal
        isOpen={!!escuelaEditando}
        onClose={() => setEscuelaEditando(null)}
        title="Editar Escuela"
        description={`Modifique el nombre o estado de "${escuelaEditando?.nombre}".`}
      >
        <form onSubmit={handleGuardarEdit} className="space-y-4">
          <Input
            label="Nombre de la Escuela *"
            value={editNombre}
            onChange={(e) => setEditNombre(e.target.value)}
            required
            autoFocus
          />

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <Switch
              label="Escuela Activa"
              description="Determina si está disponible en las listas de selección."
              checked={editActiva}
              onChange={setEditActiva}
              id="switch-editar-escuela"
            />
          </div>

          {escuelaEditando && escuelaEditando.deportistas_count > 0 && (
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                Esta escuela cuenta con <strong>{escuelaEditando.deportistas_count}</strong> deportistas asociados.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEscuelaEditando(null)}
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

      {/* ─── MODAL: CONFIRMAR ELIMINACIÓN O ADVERTENCIA ─── */}
      <Modal
        isOpen={!!escuelaEliminando}
        onClose={() => setEscuelaEliminando(null)}
        title={
          (escuelaEliminando?.deportistas_count || 0) > 0
            ? "Acción Protegida"
            : "¿Eliminar Escuela?"
        }
      >
        <div className="space-y-4">
          {(escuelaEliminando?.deportistas_count || 0) > 0 ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  No es posible eliminar &quot;{escuelaEliminando?.nombre}&quot;
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Esta escuela tiene{" "}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {escuelaEliminando?.deportistas_count} deportista(s)
                  </strong>{" "}
                  asociado(s). Para preservar la integridad de los datos históricos y registros de ingreso, la base de datos no permite su eliminación física.
                </p>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 text-left mt-3">
                  <strong>Recomendación:</strong> Desactive la escuela mediante el interruptor para que no aparezca en nuevas selecciones, conservando todos los registros asociados.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEscuelaEliminando(null)}
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
                  ¿Está seguro de eliminar &quot;{escuelaEliminando?.nombre}&quot;?
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Esta escuela no tiene deportistas asociados. Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEscuelaEliminando(null)}
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

export default TabEscuelas;
