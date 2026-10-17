"use client";

// app/(app)/admin/components/TabAuditoria.tsx — Bitácora de Auditoría (Apple HIG)
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { History, RefreshCw, Search, Shield, User, Clock } from "lucide-react";

export interface AuditoriaLog {
  id: string;
  accion: string;
  entidad?: string;
  entidad_id?: string;
  detalle?: Record<string, unknown> | string | null;
  fecha: string;
  usuario_nombre: string;
  usuario_cedula: string;
  usuario_unidad: string;
}

export function TabAuditoria() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarLogs = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/auditoria");
      const data = await res.json();
      if (res.ok) {
        setLogs(data.auditoria || []);
      } else {
        toast.error("Error", data.error || "No se pudo cargar la auditoría.");
      }
    } catch {
      toast.error("Error", "Error al comunicarse con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarLogs();
  }, [cargarLogs]);

  const logsFiltrados = logs.filter((log) => {
    const texto = `${log.accion} ${log.usuario_nombre} ${log.usuario_cedula} ${JSON.stringify(log.detalle)}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por acción, usuario o detalle..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400 shadow-sm transition-all"
          />
        </div>

        <button
          type="button"
          onClick={cargarLogs}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          <span>Actualizar Bitácora</span>
        </button>
      </div>

      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Registro Inmutable de Auditoría
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Trazabilidad de modificaciones de escuelas, personal, estados de ingreso y parámetros.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {logsFiltrados.length} eventos
          </span>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0A2540] dark:text-blue-400" />
            Cargando bitácora...
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-sm">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No hay registros de auditoría disponibles.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {logsFiltrados.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      {log.accion}
                    </span>
                    {log.entidad && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {log.entidad}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.fecha).toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="mt-2 text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{log.usuario_nombre || "Usuario"}</span>
                  <span className="text-neutral-400 font-mono">(CC {log.usuario_cedula})</span>
                  {log.usuario_unidad && (
                    <span className="text-neutral-500">• {log.usuario_unidad}</span>
                  )}
                </div>

                {log.detalle && (
                  <pre className="mt-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {typeof log.detalle === "string" ? log.detalle : JSON.stringify(log.detalle, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TabAuditoria;
