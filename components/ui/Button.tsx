"use client";

// components/ui/Button.tsx — Botón con especificaciones Apple HIG
import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "tinted" | "plain";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    // Clases base: táctil mínimo 44px (Apple HIG), efecto de presión activo y transición suave
    const baseClasses =
      "inline-flex items-center justify-center font-medium select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-[#0A2540] dark:focus-visible:ring-blue-400 focus-visible:ring-offset-2";

    // Variantes según Apple HIG
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-[#0A2540] hover:bg-[#1a4a8a] text-white shadow-sm border border-transparent dark:bg-naval-700 dark:hover:bg-naval-500",
      secondary:
        "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 dark:text-neutral-100 border border-neutral-200/60 dark:border-neutral-700/60",
      destructive:
        "bg-[#FF3B30] hover:bg-red-600 text-white shadow-sm border border-transparent active:bg-red-700",
      tinted:
        "bg-blue-50 hover:bg-blue-100 text-[#0A2540] dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40",
      plain:
        "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#0A2540] dark:text-blue-400 active:bg-neutral-200 dark:active:bg-neutral-700",
    };

    // Tamaños accesibles (mínimo 44px para cumplir Apple HIG en tamaños principales)
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5 min-w-[70px]",
      md: "min-h-[44px] px-5 py-2.5 text-sm rounded-2xl gap-2 min-w-[100px]",
      lg: "min-h-[50px] px-6 py-3.5 text-base rounded-2xl gap-2.5 min-w-[120px]",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
