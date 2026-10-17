"use client";

// components/ui/Switch.tsx — Interruptor estilo Apple iOS (51x31px con pomo fluido)
import React from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = "",
}: SwitchProps) {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label
      htmlFor={switchId}
      className={`flex items-center justify-between gap-3 py-1 cursor-pointer select-none group ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${className}`}
    >
      {(label || description) && (
        <div className="flex-1 pr-2">
          {label && (
            <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}

      {/* Track & Knob del switch iOS */}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#34C759] ${
          checked
            ? "bg-[#34C759]"
            : "bg-neutral-200 dark:bg-neutral-700/80 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-[2px] ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}

export default Switch;
