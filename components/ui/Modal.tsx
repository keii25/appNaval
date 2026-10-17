"use client";

// components/ui/Modal.tsx — Hoja Adaptable: Bottom Sheet en móvil, Ventana macOS amplia y elegante en escritorio
import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  // Manejo de tecla ESC
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

  // Anchos amplios y proporcionados para escritorio macOS (eliminando la apariencia estrecha de móvil en PC)
  const maxWidthClasses = {
    sm: "sm:max-w-md",                  // ~448px (para confirmaciones, alertas, reset clave)
    md: "sm:max-w-xl md:max-w-2xl",      // ~672px (para formularios estándar)
    lg: "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl", // ~768px - 896px (formularios ricos y columnas dobles)
    xl: "sm:max-w-4xl md:max-w-5xl lg:max-w-6xl", // ~1024px - 1152px (tablas e importaciones masivas)
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-6 overflow-hidden"
    >
      {/* Fondo translúcido con desenfoque Apple */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Contenedor del Modal: Bottom Sheet en móvil, Ventana macOS elegante en escritorio */}
      <div
        className={`relative w-full ${maxWidthClasses} bg-white dark:bg-[#1E1E20] text-neutral-900 dark:text-neutral-100 rounded-t-[28px] sm:rounded-3xl shadow-apple-popover sm:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] dark:sm:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] border border-neutral-200/80 dark:border-neutral-800/90 z-10 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-sheet-up sm:animate-mac-modal transition-all`}
      >
        {/* Barra de agarre para móvil (Grab Handle Apple) */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden cursor-grab">
          <div className="w-10 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        {/* Encabezado estilo macOS en escritorio */}
        {(title || showCloseButton) && (
          <div className="px-6 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 shrink-0 bg-neutral-50/50 dark:bg-[#1A1A1C]/50 backdrop-blur-sm">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ventana"
                title="Cerrar (Esc)"
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-all active:scale-95 shrink-0 -mr-1"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            )}
          </div>
        )}

        {/* Contenido con espaciado amplio y scroll fluido */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 overflow-y-auto overflow-x-hidden flex-1 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
