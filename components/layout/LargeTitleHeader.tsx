"use client";

// components/layout/LargeTitleHeader.tsx — Encabezado Large Title estilo Apple HIG
import React from "react";

export interface LargeTitleHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  accessory?: React.ReactNode;
}

export function LargeTitleHeader({
  title,
  subtitle,
  action,
  accessory,
}: LargeTitleHeaderProps) {
  return (
    <div className="pt-1 sm:pt-2 pb-3 sm:pb-5 border-b border-neutral-200/60 dark:border-neutral-800/60 min-w-0 flex-1 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl break-words">
              {subtitle}
            </p>
          )}
        </div>
        {(action || accessory) && (
          <div className="flex items-center gap-2.5 shrink-0">
            {accessory}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export default LargeTitleHeader;
