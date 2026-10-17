"use client";

// components/ui/InsetGroupedList.tsx — Lista agrupada Inset Grouped estilo Apple iOS
import React from "react";
import { ChevronRight } from "lucide-react";

export interface InsetGroupedListProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}

export function InsetGroupedList({
  header,
  footer,
  children,
  className = "",
}: InsetGroupedListProps) {
  return (
    <div className={`w-full my-4 ${className}`}>
      {header && (
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 ml-4">
          {header}
        </p>
      )}

      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800/70">
        {children}
      </div>

      {footer && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5 ml-4 leading-relaxed">
          {footer}
        </p>
      )}
    </div>
  );
}

export interface InsetGroupedCellProps {
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string; // background color for the icon squircle
  accessory?: "chevron" | "none" | React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}

export function InsetGroupedCell({
  title,
  subtitle,
  value,
  icon,
  iconColor = "bg-[#0A2540] text-white",
  accessory = "chevron",
  onClick,
  destructive = false,
}: InsetGroupedCellProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
        isClickable
          ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 active:bg-neutral-100 dark:active:bg-neutral-800 select-none"
          : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              destructive
                ? "text-[#FF3B30] font-semibold"
                : "text-neutral-900 dark:text-neutral-100"
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
            {value}
          </span>
        )}
        {accessory === "chevron" ? (
          <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
        ) : accessory !== "none" ? (
          accessory
        ) : null}
      </div>
    </div>
  );
}

export default InsetGroupedList;
