"use client";

// components/ui/SegmentedControl.tsx — Selector Segmentado Apple HIG
import React from "react";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  name,
  disabled = false,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-neutral-800/80 rounded-2xl border border-neutral-300/40 dark:border-neutral-700/40 backdrop-blur-md select-none ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`shrink-0 sm:flex-1 whitespace-nowrap min-h-[38px] py-1.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] ${
              isSelected
                ? "bg-white dark:bg-[#2C2C2E] text-[#0A2540] dark:text-white shadow-sm font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
