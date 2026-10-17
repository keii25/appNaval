"use client";

// components/ui/Input.tsx — Campo de texto e inputs con estilo Inset Apple HIG
import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, X, AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      clearable = false,
      onClear,
      type = "text",
      value,
      onChange,
      disabled,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const isPassword = type === "password";
    const currentType = isPassword ? (showPassword ? "text" : "password") : type;

    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 ml-1"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={currentType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full min-h-[44px] py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : "pl-4"
            } ${clearable || isPassword ? "pr-11" : "pr-4"} ${
              error
                ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20 focus:border-red-500"
                : "border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900"
            } ${className}`}
            {...props}
          />

          <div className="absolute right-0 pr-3 flex items-center gap-1.5">
            {clearable && hasValue && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Limpiar campo"
                onClick={onClear}
                className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-600 text-white flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            )}

            {isPassword && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-1 mt-1.5 ml-1 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p className="mt-1.5 ml-1 text-xs text-neutral-400 dark:text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
