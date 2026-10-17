"use client";

// components/ui/Skeleton.tsx — Efecto de carga shimmer/skeleton estilo Apple
import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "h-3.5 w-full rounded-md",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-2xl",
    card: "rounded-3xl min-h-[120px] w-full",
  }[variant];

  return (
    <div
      className={`animate-pulse bg-neutral-200/80 dark:bg-neutral-800/80 ${variantClasses} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" className="w-9 h-9" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-2/3" />
          </div>
          <Skeleton variant="rectangular" className="w-12 h-6 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
