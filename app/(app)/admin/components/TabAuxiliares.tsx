"use client";

// app/(app)/admin/components/TabAuxiliares.tsx — Gestión de Auxiliares y Portería (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Rol } from "@/types/database";
import {
  UserCheck,
  ShieldCheck,
  Plus,
  Pencil,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface UsuarioStaff {
  id: string;
  cedula: string;
  nombre: string;
  unidad: string;
  rol: "auxiliar" | "porteria";
  activo: boolean;
  debe_cambiar_clave: boolean;
  creado_en?: string;
}

export function TabAuxiliares() {
  const toast = useToast();

  const [usuarios, setUsuarios] = useState<UsuarioStaff[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("todos");

  // Modal Crear Usuario
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoRol, setNuevoRol] = useState<"auxiliar" | "porteria">("auxiliar");
  const [nuevaCedula, setNuevaCedula] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("Atención y Registro");
  const [nuevoDebeCambiarClave, setNuevoDebeCambiarClave] = useState(false);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Modal Editar Personal Staff
  const [usuarioEditar, setUsuarioEditar] = useState<UsuarioStaff | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [editUnidad, setEditUnidad] = useState("");
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Reset Clave
  const [usuarioReset, setUsuarioReset] = useState<UsuarioStaff | null>(null);
  const [resetExigirCambio, setResetExigirCambio] = useState(false);
  const [reseteando, setReseteando] = useState(false);

  // Cargar usuarios
  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();
      if (res.ok && data.ok) {
        setUsuarios(data.usuarios || []);
      } else {
        toast.error("Error", data.error || "No se pudieron cargar los usuarios.");
      }
    } catch {
      toast.error("Error", "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Toggle rápido de Activo / Inactivo
  const handleToggleActivo = async (usuario: UsuarioStaff) => {
    const nuevoEstado = !usuario.activo;

    // Actualización optimista
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoEstado } : u))
    );

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario.id, activo: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuario.id ? { ...u, activo: usuario.activo } : u))
        );
        toast.error("Error", data.error || "No fue posible actualizar el estado.");
      } else {
        toast.success(
          nuevoEstado ? "Usuario Habilitado" : "Usuario Bloqueado",
          `La cuenta de ${usuario.nombre} fue ${nuevoEstado ? "activada" : "bloqueada"}.`
        );
      }
    } catch {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: usuario.activo } : u))
      );
      toast.error("Error", "Error de conexión.");
    }
  };

  // Toggle rápido de debe_cambiar_clave
  const handleToggleCambiarClave = async (usuario: UsuarioStaff) => {
    const nuevoValor = !usuario.debe_cambiar_clave;

    // Actualización optimista
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, debe_cambiar_clave: nuevoValor } : u))
    );

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario.id, debe_cambiar_clave: nuevoValor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === usuario.id ? { ...u, debe_cambiar_clave: usuario.debe_cambiar_clave } : u
          )
        );
        toast.error("Error", data.error || "No se pudo actualizar el requisito de clave.");
      } else {
        toast.success(
          nuevoValor ? "Cambio de Clave Exigido" : "Clave Fija (Cédula)",
          nuevoValor
            ? `${usuario.nombre} deberá cambiar su contraseña al próximo inicio de sesión.`
            : `${usuario.nombre} podrá continuar usando su cédula como contraseña.`
        );
      }
    } catch {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id ? { ...u, debe_cambiar_clave: usuario.debe_cambiar_clave } : u
        )
      );
      toast.error("Error", "Error de conexión.");
    }
  };

  // Crear Usuario Staff
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCedula.trim() || !nuevoNombre.trim()) {
      toast.error("Datos incompletos", "Cédula y nombre completo son obligatorios.");
      return;
    }

    setGuardandoCrear(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          cedula: nuevaCedula.trim(),
          nombre: nuevoNombre.trim(),
          unidad: nuevaUnidad.trim(),
          rol: nuevoRol,
          debe_cambiar_clave: nuevoDebeCambiarClave,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Usuario Registrado", data.mensaje);
        setModalCrearAbierto(false);
        setNuevaCedula("");
        setNuevoNombre("");
        setNuevaUnidad("Atención y Registro");
        setNuevoDebeCambiarClave(false);
        cargarUsuarios();
      } else {
        toast.error("Error al crear", data.error || "No fue posible registrar la cuenta.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setGuardandoCrear(false);
    }
  };

  // Restablecer contraseña a la cédula
  const handleResetClave = async () => {
    if (!usuarioReset) return;

    setReseteando(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_clave",
          userId: usuarioReset.id,
          debe_cambiar_clave: resetExigirCambio,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Contraseña Restablecida", data.mensaje);
        setUsuarioReset(null);
        cargarUsuarios();
      } else {
        toast.error("Error al restablecer", data.error || "No se pudo cambiar la contraseña.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setReseteando(false);
    }
  };

  // Abrir modal de edición
  const abrirModalEditar = (u: UsuarioStaff) => {
    setUsuarioEditar(u);
    setEditNombre(u.nombre);
    setEditCedula(u.cedula);
    setEditUnidad(u.unidad || "");
  };

  // Guardar cambios del personal staff (nombre, cédula, unidad)
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditar) return;

    const nombreLimpio = editNombre.trim();
    const cedulaLimpia = editCedula.trim();
    const unidadLimpia = editUnidad.trim();

    if (nombreLimpio.length < 3) {
      toast.error("Validación", "El nombre del responsable debe tener al menos 3 caracteres.");
      return;
    }

    if (!cedulaLimpia.match(/^[0-9]{6,12}$/)) {
      toast.error("Validación", "La cédula debe contener solo números (entre 6 y 12 dígitos).");
      return;
    }

    try {
      setGuardandoEditar(true);
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: usuarioEditar.id,
          nombre: nombreLimpio,
          cedula: cedulaLimpia,
          unidad: unidadLimpia || "Atención y Registro",
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Responsable Actualizado", "Datos del responsable y cédula guardados con éxito.");
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === usuarioEditar.id
              ? {
                  ...u,
                  nombre: nombreLimpio,
                  cedula: cedulaLimpia,
                  unidad: unidadLimpia || "Atención y Registro",
                }
              : u
          )
        );
        setUsuarioEditar(null);
      } else {
        toast.error("Error al actualizar", data.error || "No se pudieron guardar los cambios.");
      }
    } catch {
      toast.error("Error", "Error de conexión con el servidor.");
    } finally {
      setGuardandoEditar(false);
    }
  };

  // Filtros
  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideTexto =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.cedula.includes(busqueda.trim());
    if (!coincideTexto) return false;
    if (filtroRol !== "todos" && u.rol !== filtroRol) return false;
    return true;
  });

  const totalPersonal = usuarios.length;
  const totalAuxiliares = usuarios.filter((u) => u.rol === "auxiliar").length;
  const totalPorteria = usuarios.filter((u) => u.rol === "porteria").length;

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas de Personal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Personal Staff Total
            </span>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {totalPersonal}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[#0A2540] dark:text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Auxiliares de Registro
            </span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {totalAuxiliares}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0A2540] dark:text-emerald-400">
              Guardias de Portería
            </span>
            <p className="text-2xl font-black text-[#0A2540] dark:text-emerald-400 mt-1">
              {totalPorteria}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Creación */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] shadow-sm"
          >
            <option value="todos">Todos los roles</option>
            <option value="auxiliar">Solo Auxiliares</option>
            <option value="porteria">Solo Portería</option>
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={cargarUsuarios}
              title="Recargar usuarios"
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
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Personal (Inset Grouped Card) */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Cuentas de Auxiliares y Seguridad
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Acceso con cédula como usuario y contraseña. El Administrador decide si exige cambio de clave.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {usuariosFiltrados.length} cuentas
          </span>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando personal...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <UserCheck className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No se encontraron usuarios
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              No hay cuentas que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {usuariosFiltrados.map((u) => {
              const esAuxiliar = u.rol === "auxiliar";

              return (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  {/* Datos del usuario */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-sm ${
                        esAuxiliar
                          ? "bg-blue-100 dark:bg-blue-950/60 text-[#0A2540] dark:text-blue-300"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      {esAuxiliar ? <UserCheck className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      {/* Título: Guardia de Portería o Auxiliar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 dark:text-white">
                          {esAuxiliar ? "Auxiliar" : "Guardia de Portería"}
                        </h4>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            esAuxiliar
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {esAuxiliar ? "Auxiliar de Registro" : "Control de Acceso"}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            u.activo
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {u.activo ? "Activo" : "Bloqueado"}
                        </span>
                      </div>

                      {/* Debajo: Nombre del Responsable */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                          Responsable:
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                          {u.nombre}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200 font-semibold">
                          Cédula: {u.cedula}
                        </span>
                        <span>•</span>
                        <span>{u.unidad || "Sin dependencia asignada"}</span>
                        <span>•</span>
                        <span className="text-[11px]">
                          {u.debe_cambiar_clave ? "Exige cambio de clave" : "Clave = Cédula"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controles de seguridad y edición para el Admin */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-neutral-800 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
                      {/* Toggle Exigir Cambio de Contraseña */}
                      <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-0 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 sm:bg-transparent sm:dark:bg-transparent">
                        <div className="text-left sm:text-right">
                          <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 leading-tight">
                            Exigir cambio de clave
                          </span>
                          <span className="block text-[10px] text-neutral-400">
                            {u.debe_cambiar_clave ? "Obligatorio al entrar" : "Cédula como clave fija"}
                          </span>
                        </div>
                        <Switch
                          checked={u.debe_cambiar_clave}
                          onChange={() => handleToggleCambiarClave(u)}
                          id={`switch-clave-${u.id}`}
                        />
                      </div>

                      {/* Toggle Bloquear / Activar */}
                      <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-0 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 sm:bg-transparent sm:dark:bg-transparent">
                        <div className="text-left sm:text-right">
                          <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 leading-tight">
                            Estado
                          </span>
                          <span className="block text-[10px] text-neutral-400">
                            {u.activo ? "Habilitado" : "Bloqueado"}
                          </span>
                        </div>
                        <Switch
                          checked={u.activo}
                          onChange={() => handleToggleActivo(u)}
                          id={`switch-activo-${u.id}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Botón Editar Responsable y Cédula */}
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(u)}
                        title="Editar nombre del responsable y número de cédula"
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs flex-1 sm:flex-initial"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#0A2540] dark:text-blue-400 shrink-0" />
                        <span>Editar</span>
                      </button>

                      {/* Botón Restablecer Clave */}
                      <button
                        type="button"
                        onClick={() => {
                          setUsuarioReset(u);
                          setResetExigirCambio(false); // Por defecto apagado según requerimiento
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 flex-1 sm:flex-initial"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Resetear Clave</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL: NUEVO USUARIO ─── */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="Crear Nueva Cuenta de Personal"
        description="Usuario y contraseña inicial serán la cédula de identidad."
      >
        <form onSubmit={handleCrearUsuario} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
              Rol del Personal
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setNuevoRol("auxiliar")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  nuevoRol === "auxiliar"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#0A2540] dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Auxiliar de Mesa</span>
              </button>
              <button
                type="button"
                onClick={() => setNuevoRol("porteria")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  nuevoRol === "porteria"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#0A2540] dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Portería</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre Completo *"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Auxiliar Mesa Cuatro"
              required
              autoFocus
            />

            <Input
              label="Número de Cédula *"
              value={nuevaCedula}
              onChange={(e) => setNuevaCedula(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 71000004"
              helperText="Usuario y clave inicial."
              required
            />
          </div>

          <Input
            label="Dependencia o Unidad"
            value={nuevaUnidad}
            onChange={(e) => setNuevaUnidad(e.target.value)}
            placeholder="Ej: Atención y Registro"
          />

          {/* Switch de exigir cambio de clave */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <Switch
              label="Exigir cambio de contraseña en el primer ingreso"
              description="Desactivado por defecto. Si se mantiene apagado, sus credenciales permanentes serán cédula y cédula."
              checked={nuevoDebeCambiarClave}
              onChange={setNuevoDebeCambiarClave}
              id="switch-nuevo-debe-cambiar"
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
              {guardandoCrear ? "Registrando..." : "Crear Cuenta"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: EDITAR PERSONAL STAFF ─── */}
      <Modal
        isOpen={!!usuarioEditar}
        onClose={() => setUsuarioEditar(null)}
        title="Editar Personal Staff"
        description="Actualice el nombre del responsable y su número de cédula de identidad."
      >
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Cargo Oficial
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                usuarioEditar?.rol === "auxiliar"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              {usuarioEditar?.rol === "auxiliar" ? "Auxiliar" : "Guardia de Portería"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del Responsable *"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              placeholder="Ej: S1. Juan Carlos Pérez Gómez"
              required
              autoFocus
            />

            <Input
              label="Número de Cédula *"
              value={editCedula}
              onChange={(e) => setEditCedula(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej: 71000001"
              helperText="Cédula oficial de ingreso."
              required
            />
          </div>

          <Input
            label="Dependencia o Puesto Asignado"
            value={editUnidad}
            onChange={(e) => setEditUnidad(e.target.value)}
            placeholder="Ej: Guardia Principal / Mesa de Registro"
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setUsuarioEditar(null)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoEditar}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {guardandoEditar ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: RESTABLECER CONTRASEÑA ─── */}
      <Modal
        isOpen={!!usuarioReset}
        onClose={() => setUsuarioReset(null)}
        title="Restablecer Contraseña"
        description={`Restablecimiento de credenciales para ${usuarioReset?.nombre}.`}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
            <p className="font-semibold mb-1">Nueva contraseña asignada:</p>
            <p>
              La contraseña se cambiará automáticamente al número de cédula:{" "}
              <strong className="font-mono text-sm">{usuarioReset?.cedula}</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <Switch
              label="Exigir cambio de clave al ingresar"
              description="Si está desactivado, el usuario podrá ingresar directamente con su cédula sin ser redirigido a cambio de contraseña."
              checked={resetExigirCambio}
              onChange={setResetExigirCambio}
              id="switch-reset-exigir-cambio"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setUsuarioReset(null)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleResetClave}
              disabled={reseteando}
              className="min-h-[44px] px-6 py-2 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {reseteando ? "Restableciendo..." : "Confirmar Restablecimiento"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TabAuxiliares;
