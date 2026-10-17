"use client";

// app/(app)/deportista/page.tsx — Panel del Deportista (Apple HIG Rediseño Oficial)
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import Input from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Modal from "@/components/ui/Modal";
import ActionSheet from "@/components/ui/ActionSheet";
import { SkeletonList } from "@/components/ui/Skeleton";
import ToastProvider, { useToast } from "@/components/ui/Toast";
import type { Visitante, Perfil } from "@/types/database";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Car,
  Heart,
  User,
} from "lucide-react";

interface ConfiguracionVisitantes {
  limite_visitantes: number;
  fecha_limite: string | null;
  total_registrados: number;
  cupos_disponibles: number;
  limite_alcanzado: boolean;
  fecha_limite_vencida: boolean;
}

function getIniciales(nombre?: string): string {
  if (!nombre) return "•";
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function formatRangoFechas(desde?: string, hasta?: string): string {
  if (!desde) return "";
  try {
    const meses = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic"
    ];
    const [y1, m1, d1] = desde.split("-").map(Number);
    if (!hasta || desde === hasta) {
      return `${d1} ${meses[m1 - 1]}`;
    }
    const [y2, m2, d2] = hasta.split("-").map(Number);
    if (m1 === m2 && y1 === y2) {
      return `${d1} – ${d2} ${meses[m1 - 1]}`;
    }
    return `${d1} ${meses[m1 - 1]} – ${d2} ${meses[m2 - 1]}`;
  } catch {
    return `${desde} al ${hasta || desde}`;
  }
}

function DeportistaDashboard() {
  const router = useRouter();
  const toast = useToast();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [config, setConfig] = useState<ConfiguracionVisitantes | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estados del Formulario (Crear / Editar)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [visitanteEditando, setVisitanteEditando] = useState<Visitante | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Campos del Formulario
  const [nombre, setNombre] = useState("");
  const [parentesco, setParentesco] = useState<"Familiar" | "Amigo">("Familiar");
  const [tipoDocumento, setTipoDocumento] = useState<"CC" | "TI" | "CE" | "Pasaporte">("CC");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [tieneVehiculo, setTieneVehiculo] = useState<"No" | "Sí">("No");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Estado para confirmación de eliminación (Action Sheet)
  const [visitanteAEliminar, setVisitanteAEliminar] = useState<Visitante | null>(null);
  const [actionSheetAbierto, setActionSheetAbierto] = useState(false);

  // Estado de swipe-to-delete en celular
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchDeltaX = useRef<number>(0);

  // 1. Cargar Perfil
  const cargarPerfil = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setPerfil(data.perfil);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // 2. Cargar Visitantes y Configuración
  const cargarVisitantes = useCallback(async () => {
    try {
      const res = await fetch("/api/visitantes");
      if (res.ok) {
        const data = await res.json();
        setVisitantes(data.visitantes || []);
        setConfig(data.configuracion || null);
      }
    } catch {
      toast.error("Error", "No fue posible cargar la lista de visitantes.");
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarPerfil();
    cargarVisitantes();
  }, [cargarPerfil, cargarVisitantes]);

  // Abrir modal para nuevo registro
  const abrirModalCrear = () => {
    if (config?.limite_alcanzado) {
      toast.error(
        "Límite Alcanzado",
        `Ya registraste los ${config.limite_visitantes} visitantes permitidos.`
      );
      return;
    }
    if (config?.fecha_limite_vencida) {
      toast.error(
        "Plazo Vencido",
        "El período de inscripción de visitantes ha finalizado."
      );
      return;
    }

    const hoy = new Date().toISOString().split("T")[0];
    const manana = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    setVisitanteEditando(null);
    setNombre("");
    setParentesco("Familiar");
    setTipoDocumento("CC");
    setNumeroDocumento("");
    setTieneVehiculo("No");
    setPlaca("");
    setModelo("");
    setFechaDesde(hoy);
    setFechaHasta(manana);
    setErrorForm(null);
    setModalAbierto(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (v: Visitante) => {
    if (config?.fecha_limite_vencida) {
      toast.error(
        "Plazo Vencido",
        "No es posible modificar datos porque la fecha límite ha expirado."
      );
      return;
    }

    setVisitanteEditando(v);
    setNombre(v.nombre);
    setParentesco(v.parentesco);
    setTipoDocumento(v.tipo_documento);
    setNumeroDocumento(v.numero_documento);
    setTieneVehiculo(v.tiene_vehiculo ? "Sí" : "No");
    setPlaca(v.placa || "");
    setModelo(v.modelo || "");
    setFechaDesde(v.fecha_desde);
    setFechaHasta(v.fecha_hasta);
    setErrorForm(null);
    setModalAbierto(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardarVisitante = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);

    const payload = {
      nombre: nombre.trim(),
      parentesco,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim(),
      tiene_vehiculo: tieneVehiculo === "Sí",
      placa: tieneVehiculo === "Sí" ? placa.trim().toUpperCase() : null,
      modelo: tieneVehiculo === "Sí" ? modelo.trim() : null,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    };

    try {
      const url = visitanteEditando
        ? `/api/visitantes/${visitanteEditando.id}`
        : "/api/visitantes";
      const method = visitanteEditando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorForm(data.error || "Error al procesar el visitante.");
        setGuardando(false);
        return;
      }

      setModalAbierto(false);
      toast.success(
        visitanteEditando ? "Visitante Actualizado" : "Visitante Registrado",
        visitanteEditando
          ? "Los cambios han sido guardados."
          : `${payload.nombre} ha sido agregado exitosamente.`
      );
      cargarVisitantes();
    } catch {
      setErrorForm("Error de conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  // Confirmar y Ejecutar Eliminación
  const confirmarEliminar = (v: Visitante) => {
    setVisitanteAEliminar(v);
    setActionSheetAbierto(true);
  };

  const ejecutarEliminacion = async () => {
    if (!visitanteAEliminar) return;

    try {
      const res = await fetch(`/api/visitantes/${visitanteAEliminar.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error", data.error || "No fue posible eliminar al visitante.");
        return;
      }

      toast.success("Visitante Eliminado", `${visitanteAEliminar.nombre} fue removido.`);
      cargarVisitantes();
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setVisitanteAEliminar(null);
      setSwipedId(null);
    }
  };

  // Manejo de gesto táctil: deslizar para eliminar en celular
  const handleTouchStart = (id: string, clientX: number) => {
    touchStartX.current = clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (id: string, clientX: number) => {
    touchDeltaX.current = clientX - touchStartX.current;
  };

  const handleTouchEnd = (id: string) => {
    if (touchDeltaX.current < -50) {
      // Deslizó hacia la izquierda
      setSwipedId(id);
    } else if (touchDeltaX.current > 30) {
      // Deslizó hacia la derecha (cerrar)
      setSwipedId(null);
    }
  };

  const limiteAlcanzado = Boolean(config?.limite_alcanzado);
  const fechaLimiteVencida = Boolean(config?.fecha_limite_vencida);
  const registroBloqueado = limiteAlcanzado || fechaLimiteVencida;

  const total = config?.total_registrados || 0;
  const maximo = config?.limite_visitantes || 5;
  const porcentajeCupos = Math.min(100, Math.round((total / maximo) * 100));

  return (
    <div className="flex flex-col gap-8">
      {/* ─── 1. ENCABEZADO CON LARGE TITLE Y BOTÓN PRIMARIO ÚNICO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.125rem] sm:text-[2.125rem] leading-[1.1] font-[700] tracking-[-0.02em] text-[#1C1C1E] dark:text-[#F2F2F7] m-0">
            Mis visitantes
          </h1>
          <p className="mt-1 text-[1.0625rem] leading-[1.4] text-[#6C6C70] dark:text-[#A1A1A6] m-0">
            Autoriza el ingreso de tus familiares y amigos a la Escuela Naval.
          </p>
        </div>

        {/* Botón primario en encabezado: solo visible cuando existan visitantes */}
        {visitantes.length > 0 && (
          <button
            type="button"
            onClick={abrirModalCrear}
            disabled={registroBloqueado}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-[12px] bg-[#0A2540] dark:bg-[#6FA8E8] dark:text-[#0A1A2E] text-white font-semibold text-[1.0625rem] select-none hover:opacity-95 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0A2540]/30 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
            <span>Inscribir visitante</span>
          </button>
        )}
      </div>

      {/* ─── 2. TARJETA INSET GROUPED UNIFICADA: PERFIL, CUPOS Y PLAZO ─── */}
      <section
        className="bg-white dark:bg-[#1C1C1E] rounded-[16px] border border-black/[0.06] dark:border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden"
        aria-label="Resumen del deportista"
      >
        {/* Fila 1: Perfil (Nombre, Unidad y Cédula en tabular-nums sin monoespaciada) */}
        <div className="p-4 sm:p-6 flex items-center gap-4 min-h-[44px]">
          <div
            className="w-12 h-12 rounded-full bg-[#0A2540]/10 dark:bg-blue-400/15 text-[#0A2540] dark:text-blue-300 font-semibold text-lg flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            {getIniciales(perfil?.nombre)}
          </div>
          <div className="min-w-0">
            <div className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
              {perfil?.nombre || "Cargando deportista..."}
            </div>
            <div className="text-[0.9375rem] text-[#6C6C70] dark:text-[#A1A1A6] tabular-nums mt-0.5 truncate">
              {perfil?.unidad || "Infantería de Marina"} · C.C. {perfil?.cedula || "—"}
            </div>
          </div>
        </div>

        {/* Fila 2: Cupos usados con barra de progreso */}
        <div className="border-t border-black/[0.06] dark:border-white/10 ml-4 sm:ml-6 pr-4 sm:pr-6 py-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between text-[1.0625rem]">
            <span className="text-[#1C1C1E] dark:text-[#F2F2F7]">Cupos usados</span>
            <span className="text-[#6C6C70] dark:text-[#A1A1A6] tabular-nums font-normal">
              {total} de {maximo}
            </span>
          </div>
          <div
            className="h-1.5 w-full bg-black/[0.06] dark:bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={maximo}
            aria-valuenow={total}
            aria-label="Cupos usados"
          >
            <span
              className="block h-full rounded-full bg-[#0A2540] dark:bg-[#6FA8E8] transition-all duration-300 ease-out"
              style={{ width: `${porcentajeCupos}%` }}
            />
          </div>
        </div>

        {/* Fila 3: Plazo de inscripción con un único estado */}
        <div className="border-t border-black/[0.06] dark:border-white/10 ml-4 sm:ml-6 pr-4 sm:pr-6 py-4 flex items-center justify-between min-h-[44px]">
          <span className="text-[1.0625rem] text-[#1C1C1E] dark:text-[#F2F2F7]">
            Plazo de inscripción
          </span>
          <span
            className={`text-[0.8125rem] font-semibold rounded-full px-3 py-1 ${
              fechaLimiteVencida
                ? "text-[#D70015] dark:text-red-400 bg-[rgba(215,0,21,0.12)] dark:bg-red-400/20"
                : "text-[#1E7A3C] dark:text-[#52D07A] bg-[rgba(52,199,89,0.12)] dark:bg-[#34C759]/20"
            }`}
          >
            {fechaLimiteVencida ? "Cerrado" : "Abierto"}
          </span>
        </div>
      </section>

      {/* ─── 3. SECCIÓN DE PERSONAS INSCRITAS ─── */}
      <section aria-label="Personas inscritas" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 text-[0.8125rem] text-[#6C6C70] dark:text-[#A1A1A6] tracking-[0.02em] uppercase font-semibold tabular-nums">
          <span>Personas inscritas</span>
          <span>{visitantes.length}</span>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-[16px] border border-black/[0.06] dark:border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden">
          {cargando ? (
            <div className="p-6">
              <SkeletonList count={3} />
            </div>
          ) : visitantes.length === 0 ? (
            /* Estado Vacío con Mascota Oficial en Podio */
            <div className="py-12 px-6 sm:px-8 flex flex-col items-center text-center gap-3">
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 drop-shadow-md mb-1 transition-transform hover:scale-105 duration-300">
                <Image
                  src="/images/mascota-interescuelas-2026.png"
                  alt="Mascota Oficial Interescuelas 2026"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 128px, 144px"
                />
              </div>
              <h2 className="m-0 text-[20px] font-[600] tracking-[-0.01em] text-[#1C1C1E] dark:text-[#F2F2F7]">
                Aún no has inscrito acompañantes
              </h2>
              <p className="m-0 max-w-[380px] text-[0.9375rem] leading-[1.45] text-[#6C6C70] dark:text-[#A1A1A6]">
                ¡Bienvenido a los XXX Juegos Interescuelas 2026! Inscribe a tus familiares o amigos para autorizar su ingreso a las instalaciones de la Escuela Naval.
              </p>
              <button
                type="button"
                onClick={abrirModalCrear}
                disabled={registroBloqueado}
                className="mt-2 inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-[12px] bg-[#0A2540] dark:bg-[#6FA8E8] dark:text-[#0A1A2E] text-white font-semibold text-[1.0625rem] select-none hover:opacity-95 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0A2540]/30 w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Plus className="w-5 h-5 stroke-[2.2]" />
                <span>Inscribir acompañante</span>
              </button>
            </div>
          ) : (
            /* Lista Inset Grouped con swipe-to-delete en celular */
            <div>
              {visitantes.map((v, index) => {
                const esAprobado = v.estado === "Aprobado";
                const esRechazado = v.estado === "Rechazado";
                const estaDeslizado = swipedId === v.id;

                return (
                  <div
                    key={v.id}
                    className="relative overflow-hidden group select-none"
                    onTouchStart={(e) => handleTouchStart(v.id, e.touches[0].clientX)}
                    onTouchMove={(e) => handleTouchMove(v.id, e.touches[0].clientX)}
                    onTouchEnd={() => handleTouchEnd(v.id)}
                  >
                    {/* Botón de eliminación revelado al deslizar en celular */}
                    <div className="sm:hidden absolute right-0 inset-y-0 w-20 bg-[#D70015] flex items-center justify-center z-0">
                      <button
                        type="button"
                        onClick={() => confirmarEliminar(v)}
                        disabled={fechaLimiteVencida}
                        className="w-full h-full flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1 active:opacity-80"
                        aria-label={`Eliminar a ${v.nombre}`}
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    {/* Fila de visitante con transición de desplazamiento */}
                    <div
                      className={`relative z-10 bg-white dark:bg-[#1C1C1E] flex items-center justify-between gap-3 p-4 sm:px-6 min-h-[56px] transition-transform duration-200 ${
                        index > 0 ? "border-t border-black/[0.06] dark:border-white/10" : ""
                      } ${estaDeslizado ? "-translate-x-20" : "translate-x-0"}`}
                    >
                      {/* Avatar con iniciales */}
                      <div
                        className="w-10 h-10 rounded-full bg-[#0A2540]/10 dark:bg-blue-400/15 text-[#0A2540] dark:text-blue-300 font-semibold text-sm flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        {getIniciales(v.nombre)}
                      </div>

                      {/* Datos del visitante */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                          {v.nombre}
                        </div>
                        <div className="text-[0.9375rem] text-[#6C6C70] dark:text-[#A1A1A6] tabular-nums mt-0.5 truncate">
                          {v.parentesco} · {formatRangoFechas(v.fecha_desde, v.fecha_hasta)}
                          {v.tiene_vehiculo && v.placa ? ` · Placa: ${v.placa}` : ""}
                        </div>
                      </div>

                      {/* Chip de estado (píldora con fondo tenue al 12%) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[0.8125rem] font-semibold rounded-full px-3 py-1 ${
                            esAprobado
                              ? "text-[#1E7A3C] dark:text-[#52D07A] bg-[rgba(52,199,89,0.12)] dark:bg-[#34C759]/20"
                              : esRechazado
                              ? "text-[#D70015] dark:text-red-400 bg-[rgba(215,0,21,0.12)] dark:bg-red-400/20"
                              : "text-[#B25E00] dark:text-amber-400 bg-[rgba(255,149,0,0.14)] dark:bg-amber-400/20"
                          }`}
                        >
                          {v.estado}
                        </span>

                        {/* Botones secundarios (fondo 10% azul marino y texto azul marino) */}
                        <div className="hidden sm:flex items-center gap-1.5 ml-2">
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(v)}
                            disabled={fechaLimiteVencida}
                            title="Editar visitante"
                            className="min-h-[44px] px-3.5 rounded-[10px] bg-[#0A2540]/10 hover:bg-[#0A2540]/15 dark:bg-blue-400/15 dark:hover:bg-blue-400/25 text-[#0A2540] dark:text-blue-300 font-semibold text-xs inline-flex items-center gap-1.5 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0A2540]/30 disabled:opacity-40"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarEliminar(v)}
                            disabled={fechaLimiteVencida}
                            title="Eliminar visitante"
                            className="min-h-[44px] w-10 rounded-[10px] text-[#D70015] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center justify-center active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-red-500/30 disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── MODAL / BOTTOM SHEET DE REGISTRO / EDICIÓN ─── */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={visitanteEditando ? "Editar Visitante" : "Inscribir Visitante"}
        description={
          visitanteEditando
            ? "Modifica los datos del visitante registrado."
            : "Completa la información oficial para solicitar la acreditación de ingreso."
        }
      >
        {errorForm && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorForm}</span>
          </div>
        )}

        <form onSubmit={handleGuardarVisitante} className="space-y-4">
          {/* Parentesco: Selector Segmentado */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C6C70] dark:text-[#A1A1A6] mb-1.5 ml-1">
              Parentesco
            </label>
            <SegmentedControl
              options={[
                { value: "Familiar", label: "Familiar", icon: <Heart className="w-4 h-4 text-rose-500" /> },
                { value: "Amigo", label: "Amigo", icon: <User className="w-4 h-4 text-blue-500" /> },
              ]}
              value={parentesco}
              onChange={(val) => setParentesco(val as "Familiar" | "Amigo")}
            />
          </div>

          {/* Nombre completo */}
          <Input
            label="Nombre Completo"
            placeholder="Ej. Juan Carlos Pérez"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          {/* Tipo y Número de Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C6C70] dark:text-[#A1A1A6] mb-1.5 ml-1">
                Tipo Doc.
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as "CC" | "TI" | "CE" | "Pasaporte")}
                className="w-full min-h-[44px] px-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 text-sm text-[#1C1C1E] dark:text-[#F2F2F7] outline-none"
              >
                <option value="CC">C.C. (Cédula)</option>
                <option value="TI">T.I. (Tarjeta Identidad)</option>
                <option value="CE">C.E. (Extranjería)</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Número de Documento"
                placeholder="Ej. 1045678901"
                required
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                helperText="Sin puntos ni guiones. No duplicados."
              />
            </div>
          </div>

          {/* ¿Tiene Vehículo? */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C6C70] dark:text-[#A1A1A6] mb-1.5 ml-1">
              ¿Ingresa con Vehículo?
            </label>
            <SegmentedControl
              options={[
                { value: "No", label: "No (A pie)" },
                { value: "Sí", label: "Sí (Carro / Moto)", icon: <Car className="w-4 h-4 text-amber-500" /> },
              ]}
              value={tieneVehiculo}
              onChange={(val) => setTieneVehiculo(val as "No" | "Sí")}
            />
          </div>

          {/* Campos condicionales de Vehículo */}
          {tieneVehiculo === "Sí" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 animate-sheet-up">
              <Input
                label="Placa de Colombia"
                placeholder="Ej. ABC123 o ABC12D"
                required
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                helperText="Formato: ABC123 o ABC12D"
              />
              <Input
                label="Modelo / Marca"
                placeholder="Ej. Renault Duster 2022"
                required
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>
          )}

          {/* Rango de Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha Desde"
              type="date"
              required
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
            <Input
              label="Fecha Hasta"
              type="date"
              required
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              helperText="Debe ser igual o posterior a Fecha Desde"
            />
          </div>

          {/* Botones de Acción del Modal */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 min-h-[48px] px-6 rounded-[12px] bg-[#0A2540] dark:bg-[#6FA8E8] dark:text-[#0A1A2E] text-white font-semibold text-sm select-none hover:opacity-95 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0A2540]/30 disabled:opacity-40"
            >
              {guardando
                ? "Guardando..."
                : visitanteEditando
                ? "Guardar Cambios"
                : "Inscribir Visitante"}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setModalAbierto(false)}
              className="min-h-[48px] px-6 rounded-[12px] bg-[#0A2540]/10 hover:bg-[#0A2540]/15 dark:bg-blue-400/15 dark:hover:bg-blue-400/25 text-[#0A2540] dark:text-blue-300 font-semibold text-sm select-none active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0A2540]/30"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── ACTION SHEET (Confirmación Destructiva Apple HIG) ─── */}
      <ActionSheet
        isOpen={actionSheetAbierto}
        onClose={() => setActionSheetAbierto(false)}
        title="¿Deseas eliminar a este visitante?"
        message={`Se eliminará a ${visitanteAEliminar?.nombre} de tu lista. Esta acción liberará 1 cupo de tu límite permitido.`}
        actions={[
          {
            label: "Eliminar Visitante Definitivamente",
            destructive: true,
            onClick: ejecutarEliminacion,
          },
        ]}
      />
    </div>
  );
}

export default function DeportistaPage() {
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
        userName={perfil?.nombre || "Deportista"}
        userSubtitle={perfil?.unidad || "Escuela Naval"}
        userRole={perfil?.rol || "auxiliar"}
      >
        <DeportistaDashboard />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
