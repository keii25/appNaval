"use client";

// components/layout/AdaptiveLayout.tsx — Layout Adaptable Apple HIG (Fase 2 Ajustada)
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  School,
} from "lucide-react";
import ActionSheet from "@/components/ui/ActionSheet";
import type { Rol } from "@/types/database";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface AdaptiveLayoutProps {
  children: React.ReactNode;
  userRole?: Rol;
  userName?: string;
  userSubtitle?: string;
  customNavItems?: NavItem[];
}

export function AdaptiveLayout({
  children,
  userRole = "auxiliar",
  userName = "Personal de Acreditación",
  userSubtitle = "Inter Escuelas 2026",
  customNavItems,
}: AdaptiveLayoutProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmarSalidaAbierto, setConfirmarSalidaAbierto] = useState(false);

  // Inicializar tema respetando prefers-color-scheme
  useEffect(() => {
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Rutas de navegación según el rol oficial
  const defaultNavItems: NavItem[] =
    customNavItems ||
    (userRole === "admin"
      ? [
          { label: "Deportistas", href: "/admin", icon: <Users className="w-5 h-5" /> },
          { label: "Importar CSV", href: "/admin/importar", icon: <FileSpreadsheet className="w-5 h-5" /> },
          { label: "Control Portería", href: "/porteria", icon: <ShieldCheck className="w-5 h-5" /> },
        ]
      : userRole === "porteria"
      ? [
          { label: "Control Ingreso", href: "/porteria", icon: <ShieldCheck className="w-5 h-5" /> },
        ]
      : [
          { label: "Deportistas", href: "/auxiliar", icon: <Users className="w-5 h-5" /> },
        ]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 flex transition-colors duration-200">
      {/* ─── SIDEBAR DESKTOP / TABLET (>= 768px) ─── */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-r border-neutral-200/70 dark:border-neutral-800/80 transition-all duration-300 z-30 sticky top-0 h-screen ${
          collapsed ? "w-20 px-2" : "w-64 px-4"
        } py-5`}
      >
        <div>
          {/* Cabecera Sidebar con escudo */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-neutral-800 p-1 flex items-center justify-center shrink-0 shadow-sm border border-neutral-200/80 dark:border-neutral-700/80">
                <div className="relative w-full h-full">
                  <Image
                    src="/images/logo-interescuelas-2026.png"
                    alt="Escudo Oficial Interescuelas 2026"
                    fill
                    className="object-contain"
                    sizes="40px"
                    priority
                  />
                </div>
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white leading-snug">
                    Escuela Naval
                  </h2>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate">
                    Inter Escuelas 2026
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="space-y-1">
            {defaultNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all duration-150 select-none min-h-[44px] ${
                    active
                      ? "bg-[#0A2540] text-white dark:bg-naval-700 shadow-sm font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pie de Sidebar (Usuario + Switch de Tema + Salir) */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
          {!collapsed && (
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs">
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {userName}
              </p>
              <div className="flex items-center justify-between mt-0.5 text-neutral-400">
                <span className="truncate">{userSubtitle}</span>
                <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#0A2540] dark:text-blue-300 font-semibold">
                  {userRole}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  {!collapsed && <span>Claro</span>}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-neutral-500" />
                  {!collapsed && <span>Oscuro</span>}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmarSalidaAbierto(true)}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-900/50 transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                collapsed ? "min-w-[44px]" : ""
              }`}
            >
              <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
              {!collapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ─── CONTENIDO PRINCIPAL Y BARRA MÓVIL ─── */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
        <header className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/80 px-3.5 py-2.5 flex items-center justify-between w-full max-w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 p-0.5 flex items-center justify-center shadow-sm shrink-0 border border-neutral-200/80 dark:border-neutral-700/80">
              <div className="relative w-full h-full">
                <Image
                  src="/images/logo-interescuelas-2026.png"
                  alt="Escudo Oficial"
                  fill
                  className="object-contain"
                  sizes="32px"
                  priority
                />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight truncate">
                Escuela Naval
              </p>
              <p className="text-[10px] text-neutral-400 leading-none truncate">Inter Escuelas 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Modo de color"
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmarSalidaAbierto(true)}
              aria-label="Salir"
              title="Cerrar sesión"
              className="h-9 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200/60 dark:border-red-900/50 transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl min-w-0 mx-auto px-3 sm:px-8 pt-3 sm:pt-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ─── TAB BAR INFERIOR MÓVIL (< 768px) ─── */}
      <nav
        aria-label="Barra de navegación inferior"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-neutral-200/70 dark:border-neutral-800/80 px-4 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg"
      >
        {defaultNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-2xl select-none transition-colors active:scale-95 ${
                active
                  ? "text-[#0A2540] dark:text-blue-400 font-bold"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
              }`}
            >
              <span className="relative">{item.icon}</span>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[80px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Modo Claro" : "Modo Oscuro"}
          className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-2xl text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 active:scale-95 transition-all"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-neutral-500" />
          )}
          <span className="text-[10px] mt-1 tracking-tight">
            {isDark ? "Claro" : "Oscuro"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setConfirmarSalidaAbierto(true)}
          aria-label="Cerrar sesión"
          className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-2xl text-red-600 dark:text-red-400 hover:text-red-700 active:scale-95 transition-all"
        >
          <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-[10px] mt-1 font-bold tracking-tight text-red-600 dark:text-red-400">
            Salir
          </span>
        </button>
      </nav>

      {/* ─── ACTION SHEET: CONFIRMACIÓN DE CERRAR SESIÓN (APPLE HIG) ─── */}
      <ActionSheet
        isOpen={confirmarSalidaAbierto}
        onClose={() => setConfirmarSalidaAbierto(false)}
        title="¿Deseas cerrar sesión?"
        message="Saldrás de tu cuenta oficial en este dispositivo."
        actions={[
          {
            label: "Cerrar sesión",
            destructive: true,
            onClick: handleLogout,
          },
        ]}
      />
    </div>
  );
}

export default AdaptiveLayout;
