"use client";

// app/(app)/admin/components/TabConfiguracion.tsx — Configuración Global del Evento (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Settings,
  Users,
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function TabConfiguracion() {
  const toast = useToast();

  const [limiteVisitantes, setLimiteVisitantes] = useState<number>(5);
  const [fechaLimite, setFechaLimite] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);

  // Cargar configuración actual
  const cargarConfig = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/configuracion");
      const data = await res.json();
      if (res.ok && data.configuracion) {
        setLimiteVisitantes(data.configuracion.limite_visitantes ?? 5);
        if (data.configuracion.fecha_limite) {
          // Formatear para input datetime-local: YYYY-MM-DDTHH:mm
          const d = new Date(data.configuracion.fecha_limite);
          const offset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
          setFechaLimite(localISOTime);
        } else {
          setFechaLimite("");
        }
        setUltimaActualizacion(data.configuracion.actualizado_en || null);
      }
    } catch {
      toast.error("Error", "No fue posible cargar los parámetros del evento.");
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarConfig();
  }, [cargarConfig]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limite_visitantes: Number(limiteVisitantes),
          fecha_limite: fechaLimite ? new Date(fechaLimite).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(
          "Configuración Guardada",
          "Los parámetros del evento han sido actualizados con éxito."
        );
        setUltimaActualizacion(new Date().toISOString());
      } else {
        toast.error("Error al guardar", data.error || "No se pudo actualizar la configuración.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Tarjeta Informativa de Parámetros */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-400 flex items-center justify-center shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Parámetros Generales de Acreditación
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
            Estos valores rigen a todos los auxiliares de acreditación en tiempo real. Determinan la cantidad de acompañantes autorizados por atleta y el cierre del periodo de registro.
          </p>
          {ultimaActualizacion && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Última modificación: {new Date(ultimaActualizacion).toLocaleString("es-CO")}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Formulario Inset Grouped */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800">
          <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
            Reglas de Acreditación
          </h4>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando configuración...
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="p-5 sm:p-6 space-y-6">
            {/* Límite de Visitantes */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white">
                Cupo Máximo de Visitantes por Deportista
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limiteVisitantes}
                  onChange={(e) => setLimiteVisitantes(Number(e.target.value))}
                  required
                  className="w-28 min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-base font-bold text-neutral-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 transition-all"
                />
                <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  acompañantes permitidos por atleta
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                Si un deportista ya tiene este número de visitantes registrados, los auxiliares no podrán añadir más hasta que alguno sea removido.
              </p>
            </div>

            <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

            {/* Fecha Límite */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white">
                Fecha y Hora de Cierre de Acreditaciones
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="datetime-local"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 transition-all"
                />
                {fechaLimite && (
                  <button
                    type="button"
                    onClick={() => setFechaLimite("")}
                    className="min-h-[44px] px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold transition-all active:scale-95"
                  >
                    Sin Límite de Fecha
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                {fechaLimite
                  ? `Las acreditaciones se cerrarán automáticamente el ${new Date(fechaLimite).toLocaleString("es-CO")}.`
                  : "No hay fecha límite configurada. El registro permanece abierto continuamente."}
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{guardando ? "Guardando..." : "Guardar Parámetros"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TabConfiguracion;
