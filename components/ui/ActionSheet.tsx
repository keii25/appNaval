"use client";

// components/ui/ActionSheet.tsx — Responsive Apple HIG: Action Sheet en móvil, Diálogo de Confirmación macOS en escritorio
import React, { useEffect } from "react";
import { LogOut, AlertTriangle, HelpCircle, X } from "lucide-react";

export interface ActionSheetOption {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetOption[];
  cancelText?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelText = "Cancelar",
}: ActionSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDestructive = actions.some((a) => a.destructive);
  const isLogout =
    title?.toLowerCase().includes("cerrar sesión") ||
    title?.toLowerCase().includes("salir") ||
    actions.some((a) => a.label.toLowerCase().includes("cerrar sesión"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-3 sm:p-6 overflow-hidden"
    >
      {/* Fondo translúcido con blur Apple */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-200"
      />

      {/* ─── VISTA DESKTOP: macOS Alert Dialog (>= 640px) ─── */}
      <div className="hidden sm:flex relative w-full sm:max-w-md md:max-w-lg bg-white dark:bg-[#1E1E20] text-neutral-900 dark:text-neutral-100 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] border border-neutral-200/80 dark:border-neutral-800/90 z-10 flex-col p-6 animate-mac-modal">
        {/* Botón de cierre en esquina superior derecha */}
        <div className="flex items-center justify-end pb-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar (Esc)"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center transition-colors -mr-1 -mt-1"
          >
            <X className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>

        {/* Contenido centrado con icono oficial Apple */}
        <div className="flex flex-col items-center text-center pt-2">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs ${
              isDestructive
                ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/50"
                : "bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50"
            }`}
          >
            {isLogout ? (
              <LogOut className="w-7 h-7 stroke-[2]" />
            ) : isDestructive ? (
              <AlertTriangle className="w-7 h-7 stroke-[2]" />
            ) : (
              <HelpCircle className="w-7 h-7 stroke-[2]" />
            )}
          </div>

          {title && (
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
              {title}
            </h3>
          )}

          {message && (
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-sm leading-normal">
              {message}
            </p>
          )}
        </div>

        {/* Botones de acción horizontales estilo macOS */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm font-semibold transition-all active:scale-95"
          >
            {cancelText}
          </button>

          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95 select-none ${
                action.destructive
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                  : "bg-[#0A2540] hover:bg-[#071c31] text-white"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── VISTA MÓVIL: iOS Action Sheet (< 640px) ─── */}
      <div className="sm:hidden relative w-full max-w-sm z-10 flex flex-col gap-2 animate-sheet-up">
        {/* Bloque principal de opciones */}
        <div className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-apple-sheet divide-y divide-neutral-200/60 dark:divide-neutral-800/70 text-center">
          {(title || message) && (
            <div className="px-4 py-3.5">
              {title && (
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {title}
                </p>
              )}
              {message && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  {message}
                </p>
              )}
            </div>
          )}

          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`w-full min-h-[50px] px-4 py-3 text-base font-medium flex items-center justify-center transition-colors select-none active:bg-neutral-100 dark:active:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed ${
                action.destructive
                  ? "text-[#FF3B30] font-semibold"
                  : "text-[#0A2540] dark:text-blue-400"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Bloque independiente de Cancelar (estilo oficial iOS) */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[50px] px-4 py-3 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl text-base font-semibold text-[#0A2540] dark:text-blue-400 border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors select-none"
        >
          {cancelText}
        </button>
      </div>
    </div>
  );
}

export default ActionSheet;
