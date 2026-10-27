"use client";

// components/porteria/AsignadorEscarapelaBadge.tsx — Control táctil Apple HIG con Bottom Sheet en móvil (Portal) e inline en escritorio
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tag, Check, X, RefreshCw, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export interface AsignadorEscarapelaBadgeProps {
  id: string;
  tipoSujeto: "deportista" | "visitante";
  numeroEscarapela?: string | null;
  nombreSujeto?: string;
  size?: "sm" | "md";
  onActualizado?: (
    id: string,
    tipoSujeto: "deportista" | "visitante",
    nuevoNumero: string | null
  ) => void;
  disabled?: boolean;
}

export function AsignadorEscarapelaBadge({
  id,
  tipoSujeto,
  numeroEscarapela,
  nombreSujeto,
  size = "md",
  onActualizado,
  disabled = false,
}: AsignadorEscarapelaBadgeProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [editandoDesktop, setEditandoDesktop] = useState(false);
  const [modalMovilAbierto, setModalMovilAbierto] = useState(false);
  const [valor, setValor] = useState(numeroEscarapela || "");
  const [guardando, setGuardando] = useState(false);
  const inputDesktopRef = useRef<HTMLInputElement>(null);
  const inputMovilRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar valor si el prop cambia
  useEffect(() => {
    setValor(numeroEscarapela || "");
  }, [numeroEscarapela]);

  // Enfocar input desktop
  useEffect(() => {
    if (editandoDesktop) {
      inputDesktopRef.current?.focus();
      inputDesktopRef.current?.select();
    }
  }, [editandoDesktop]);

  // Enfocar input móvil
  useEffect(() => {
    if (modalMovilAbierto) {
      const timer = setTimeout(() => {
        inputMovilRef.current?.focus();
        inputMovilRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalMovilAbierto]);

  // Manejo de tecla Escape para el modal móvil
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalMovilAbierto) {
        setEditandoDesktop(false);
        setModalMovilAbierto(false);
        setValor(numeroEscarapela || "");
      }
    };
    if (modalMovilAbierto) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalMovilAbierto, numeroEscarapela]);

  const iniciarEdicion = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled || guardando) return;
    setValor(numeroEscarapela || "");

    // Si es móvil (< 640px), abrir Bottom Sheet modal; de lo contrario, inline en escritorio
    const esMovil = typeof window !== "undefined" && window.innerWidth < 640;
    if (esMovil) {
      setModalMovilAbierto(true);
    } else {
      setEditandoDesktop(true);
    }
  };

  const cerrarEdicion = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditandoDesktop(false);
    setModalMovilAbierto(false);
    setValor(numeroEscarapela || "");
  };

  const procesarGuardado = async (nuevoValor: string | null) => {
    setGuardando(true);
    try {
      const res = await fetch("/api/porteria/escarapela", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          tipo_sujeto: tipoSujeto,
          numero_escarapela: nuevoValor,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(
          data.mensaje ||
            (nuevoValor
              ? `Escarapela #${nuevoValor} asignada.`
              : "Escarapela retirada exitosamente."),
          nombreSujeto ? `Ficha: ${nombreSujeto}` : undefined
        );
        setEditandoDesktop(false);
        setModalMovilAbierto(false);
        if (onActualizado) {
          onActualizado(id, tipoSujeto, nuevoValor);
        }
      } else {
        toast.error(
          data.error || "No fue posible actualizar la escarapela.",
          "Conflicto de Escarapela"
        );
      }
    } catch {
      toast.error("Error de comunicación con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEscarapela = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (guardando || disabled) return;

    const valorLimpio = valor.replace(/[^0-9]/g, "").trim();
    const escarapelaAEnviar = valorLimpio.length > 0 ? valorLimpio : null;

    // Si no cambió (ej: ya no tenía escarapela y se deja vacía, o es el mismo número), cerrar directamente
    if ((numeroEscarapela || null) === escarapelaAEnviar) {
      setEditandoDesktop(false);
      setModalMovilAbierto(false);
      return;
    }

    await procesarGuardado(escarapelaAEnviar);
  };

  const desasignarEscarapela = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (guardando || disabled) return;
    setValor("");
    await procesarGuardado(null);
  };

  const esTeclaValida = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Tab", "Enter", "Escape", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return true;
    }
    return /^[0-9]$/.test(e.key);
  };

  const handleKeyDownDesktop = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      guardarEscarapela();
      return;
    }
    if (e.key === "Escape") {
      cerrarEdicion();
      return;
    }
    if (!esTeclaValida(e)) {
      e.preventDefault();
    }
  };

  const handleKeyDownMovil = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      guardarEscarapela();
      return;
    }
    if (e.key === "Escape") {
      cerrarEdicion();
      return;
    }
    if (!esTeclaValida(e)) {
      e.preventDefault();
    }
  };

  return (
    <>
      {/* ─── MODO INLINE EN ESCRITORIO (sm: y superiores) ─── */}
      {editandoDesktop ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 p-0.5 rounded-xl bg-white dark:bg-neutral-900 border-2 transition-all ${
            valor.trim().length > 0 ? "border-blue-500 shadow-blue-500/10" : "border-amber-500"
          } shadow-sm ${
            size === "sm" ? "text-xs" : "text-xs sm:text-sm"
          }`}
        >
          <input
            ref={inputDesktopRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            disabled={guardando}
            placeholder=""
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={handleKeyDownDesktop}
            onBeforeInput={(e: any) => {
              if (e.data && !/^[0-9]+$/.test(e.data)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pegado = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
              setValor(pegado.slice(0, 15));
            }}
            className={`w-16 sm:w-20 font-mono font-bold bg-transparent text-neutral-900 dark:text-white outline-none px-2 py-0.5 ${
              size === "sm" ? "text-xs" : "text-xs sm:text-sm"
            }`}
          />
          <button
            type="button"
            disabled={guardando}
            onClick={guardarEscarapela}
            title="Guardar Escarapela"
            className={`p-1 rounded-lg text-white disabled:opacity-50 transition-colors ${
              valor.trim().length > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {guardando ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className={`w-3.5 h-3.5 stroke-[3] transition-colors ${
                valor.trim().length > 0 ? "text-emerald-400" : "text-white"
              }`} />
            )}
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={cerrarEdicion}
            title="Cancelar"
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      ) : numeroEscarapela ? (
        /* Badge con Escarapela asignada */
        <div
          onClick={(e) => e.stopPropagation()}
          className={`group inline-flex items-center gap-1.5 rounded-lg border font-mono font-bold transition-all ${
            size === "sm"
              ? "px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
              : "px-2.5 py-1 text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
          }`}
        >
          <Tag className={`${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-600 dark:text-amber-400 shrink-0`} />
          <span>Escarapela #{numeroEscarapela}</span>
          {!disabled && (
            <button
              type="button"
              onClick={iniciarEdicion}
              title="Cambiar o retirar número de escarapela"
              className="opacity-80 hover:opacity-100 p-0.5 rounded hover:bg-amber-200/80 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 transition-all ml-0.5"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        /* Botón para asignar nueva escarapela */
        <button
          type="button"
          onClick={iniciarEdicion}
          disabled={disabled}
          title="Asignar número de escarapela física"
          className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold transition-all active:scale-95 ${
            size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Tag className={`${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} shrink-0`} />
          <span>+ Escarapela</span>
        </button>
      )}

      {/* ─── MODAL BOTTOM SHEET DEDICADO PARA MÓVIL EN PORTAL (document.body) ─── */}
      {modalMovilAbierto && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
        >
          {/* Backdrop con desenfoque Apple */}
          <div
            onClick={cerrarEdicion}
            className="fixed inset-0 bg-neutral-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Contenedor Bottom Sheet */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-10 max-h-[90vh] flex flex-col overflow-hidden animate-sheet-up transition-all p-5 sm:p-6 space-y-4"
          >
            {/* Grab Handle para móvil */}
            <div className="w-full pb-1 flex justify-center sm:hidden cursor-grab">
              <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>

            {/* Encabezado con Contexto Claro */}
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/80 dark:border-amber-800/80">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    Asignar Escarapela
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {nombreSujeto || (tipoSujeto === "deportista" ? "Participante" : "Visitante")} •{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {tipoSujeto === "deportista" ? "Atleta / Cadete" : "Acompañante"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Botón X de cerrar modal */}
              <button
                type="button"
                onClick={cerrarEdicion}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Input Numérico Gigante y Cómodo (Dial Pad Friendly) */}
            <form onSubmit={guardarEscarapela} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 text-center">
                  Número Físico de Escarapela
                </label>
                <div className={`relative rounded-2xl bg-neutral-50 dark:bg-neutral-900/90 border-2 transition-all flex items-center justify-center shadow-inner ${
                  valor.trim().length > 0
                    ? "border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20"
                    : "border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/20"
                }`}>
                  <input
                    ref={inputMovilRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    disabled={guardando}
                    placeholder=""
                    value={valor}
                    onKeyDown={handleKeyDownMovil}
                    onBeforeInput={(e: any) => {
                      if (e.data && !/^[0-9]+$/.test(e.data)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pegado = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                      setValor(pegado.slice(0, 15));
                    }}
                    onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full text-center font-mono font-black text-3xl sm:text-4xl text-neutral-900 dark:text-white bg-transparent outline-none tracking-widest px-4 py-2"
                  />
                  {valor && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setValor("");
                      }}
                      className="absolute right-3 p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      title="Limpiar campo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                  Digita el número visible en la escarapela física. Ceros iniciales (ej. 001) son admitidos.
                </p>
              </div>

              {/* Botonera de Acciones Táctiles (Touch targets >= 48px) */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={guardando}
                  className={`w-full min-h-[50px] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50 ${
                    valor.trim().length > 0
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
                      : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                  }`}
                >
                  {guardando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando en el sistema...</span>
                    </>
                  ) : (
                    <>
                      <Check className={`w-4 h-4 stroke-[3] transition-colors ${
                        valor.trim().length > 0 ? "text-emerald-400" : "text-white"
                      }`} />
                      <span>{valor.trim().length > 0 ? "Guardar Escarapela" : "Dejar sin Escarapela"}</span>
                    </>
                  )}
                </button>

                {/* Si ya tenía escarapela asignada previamente, permitir retirarla con un toque directo */}
                {numeroEscarapela && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={desasignarEscarapela}
                    className="w-full min-h-[46px] rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900/50 transition-colors active:scale-98 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Retirar / Liberar Escarapela #{numeroEscarapela}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={guardando}
                  onClick={cerrarEdicion}
                  className="w-full min-h-[46px] rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-colors active:scale-98"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
export default AsignadorEscarapelaBadge;
