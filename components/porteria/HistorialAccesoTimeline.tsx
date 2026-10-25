"use client";

import React from "react";
import {
  History,
  LogIn,
  LogOut,
  UserCheck,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";

export interface EventoHistorialAcceso {
  id: string;
  tipo_evento: "INGRESO" | "SALIDA";
  creado_en: string;
  timestamp_formateado: string;
  observaciones?: string | null;
  operador_nombre: string;
  operador_rol: string;
  operador_unidad?: string | null;
}

interface HistorialAccesoTimelineProps {
  historial: EventoHistorialAcceso[];
  cargando: boolean;
  onRefresh?: () => void;
  sujetoNombre?: string;
}

export function HistorialAccesoTimeline({
  historial,
  cargando,
  onRefresh,
  sujetoNombre,
}: HistorialAccesoTimelineProps) {
  const totalIngresos = historial.filter((h) => h.tipo_evento === "INGRESO").length;
  const totalSalidas = historial.filter((h) => h.tipo_evento === "SALIDA").length;

  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#1C1C1E] shadow-xs overflow-hidden">
      {/* ─── ENCABEZADO DE SECCIÓN ─── */}
      <div className="px-4 py-3 border-b border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/60 dark:bg-neutral-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0A2540] dark:text-blue-300 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 leading-tight">
                Historial de Accesos
              </h4>
              <span className="px-1.5 py-0.2 rounded-md bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono text-[10px] font-bold">
                {historial.length}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 truncate leading-tight">
              Trazabilidad física bidireccional en Puesto de Guardia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {historial.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800">
                {totalIngresos} In
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/70 dark:border-rose-800">
                {totalSalidas} Out
              </span>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={cargando}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors disabled:opacity-40"
              title="Actualizar historial de movimientos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* ─── CUERPO DE LA LÍNEA DE TIEMPO ─── */}
      <div className="p-4">
        {cargando ? (
          /* Estado de carga con Skeleton Shimmer */
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                  <div className="h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : historial.length === 0 ? (
          /* Estado vacío amigable */
          <div className="py-6 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/80 text-neutral-400 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Sin movimientos registrados
            </p>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              No se han detectado marcaciones previas de ingreso o salida para{" "}
              <strong className="text-neutral-600 dark:text-neutral-300">{sujetoNombre || "este usuario"}</strong>.
            </p>
          </div>
        ) : (
          /* Línea de tiempo vertical Apple HIG */
          <div className="relative max-h-60 sm:max-h-64 overflow-y-auto pr-1 no-scrollbar space-y-4">
            {/* Línea vertical continua que conecta los nodos */}
            <div className="absolute top-3 bottom-3 left-[15px] w-0.5 bg-neutral-200 dark:bg-neutral-800 -z-0" />

            {historial.map((ev, idx) => {
              const esIngreso = ev.tipo_evento === "INGRESO";

              return (
                <div key={ev.id || idx} className="relative flex items-start gap-3.5 z-10 group">
                  {/* Nodo circular cromático */}
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-xs border-2 ${
                      esIngreso
                        ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {esIngreso ? (
                      <LogIn className="w-3.5 h-3.5" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Contenedor del evento transaccional */}
                  <div className="flex-1 min-w-0 bg-neutral-50/70 dark:bg-neutral-800/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/80 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            esIngreso
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          }`}
                        >
                          {esIngreso ? "Ingreso Oficial" : "Salida Oficial"}
                        </span>

                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-[9px] font-bold uppercase tracking-wider">
                            Más Reciente
                          </span>
                        )}
                      </div>

                      {/* Marca de tiempo ENAP */}
                      <span className="text-[11px] font-mono font-medium text-neutral-600 dark:text-neutral-300">
                        {ev.timestamp_formateado}
                      </span>
                    </div>

                    {/* Metadatos del operador y puesto de guardia */}
                    <div className="mt-1.5 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50 flex flex-wrap items-center justify-between gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>Guardia: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{ev.operador_nombre}</strong></span>
                        <span className="opacity-60">({ev.operador_rol})</span>
                      </div>

                      {ev.observaciones && (
                        <p className="w-full text-[10px] text-amber-700 dark:text-amber-400 italic mt-0.5">
                          Nota: {ev.observaciones}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── FOOTER CON RESUMEN DE SEGURIDAD ─── */}
      <div className="px-4 py-2 border-t border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 flex items-center justify-between text-[10px] text-neutral-400">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Registros inmutables en tiempo real</span>
        </div>
        <span>ENAP • Control de Portería</span>
      </div>
    </div>
  );
}
