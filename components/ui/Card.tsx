"use client";

// components/ui/Card.tsx — Tarjeta estilo Inset Grouped Card de Apple HIG
import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  glass?: boolean;
}

export function Card({
  title,
  subtitle,
  action,
  footer,
  glass = false,
  children,
  className = "",
  ...props
}: CardProps) {
  const glassClasses = glass
    ? "bg-white/75 dark:bg-[#1C1C1E]/75 backdrop-blur-xl"
    : "bg-white dark:bg-[#1C1C1E]";

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 shadow-sm border border-neutral-200/70 dark:border-neutral-800/80 transition-colors duration-200 ${glassClasses} ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/60">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 text-xs text-neutral-400 dark:text-neutral-500">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
