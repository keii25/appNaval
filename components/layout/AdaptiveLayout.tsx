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
  Menu,
  X,
} from "lucide-react";
import ActionSheet from "@/components/ui/ActionSheet";
import type { Rol } from "@/types/database";
import { useLabels } from "@/lib/marca";

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
  userSubtitle,
  customNavItems,
}: AdaptiveLayoutProps) {
  const { marca, t } = useLabels();
  const effectiveSubtitle = userSubtitle || marca.nombre_corto;
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmarSalidaAbierto, setConfirmarSalidaAbierto] = useState(false);
  const [menuHamburguesaAbierto, setMenuHamburguesaAbierto] = useState(false);

  // Cerrar menú hamburguesa al cambiar de ruta
  useEffect(() => {
    setMenuHamburguesaAbierto(false);
  }, [pathname]);

  // Bloquear scroll de la página al abrir menú hamburguesa
  useEffect(() => {
    if (menuHamburguesaAbierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuHamburguesaAbierto]);

  // Cerrar menú hamburguesa con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuHamburguesaAbierto) {
        setMenuHamburguesaAbierto(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuHamburguesaAbierto]);

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
          { label: "Admin", href: "/admin", icon: <Users className="w-5 h-5" /> },
          { label: "Importar CSV", href: "/admin/importar", icon: <FileSpreadsheet className="w-5 h-5" /> },
          { label: "Control Portería", href: "/porteria", icon: <ShieldCheck className="w-5 h-5" /> },
        ]
      : userRole === "porteria"
      ? [
          { label: "Control Ingreso", href: "/porteria", icon: <ShieldCheck className="w-5 h-5" /> },
        ]
      : [
          { label: t("Participantes"), href: "/auxiliar", icon: <Users className="w-5 h-5" /> },
          { label: "Control Portería", href: "/porteria", icon: <ShieldCheck className="w-5 h-5" /> },
        ]);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("naval_user_role");
        localStorage.removeItem("naval_perfil");
      }
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
                    src={marca.logo_claro_url || "/images/logo-interescuelas-2026.png"}
                    alt={marca.nombre_actividad || "Escudo Oficial"}
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
                    {marca.organizacion}
                  </h2>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate">
                    {marca.nombre_corto}
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
                <span className="truncate">{effectiveSubtitle}</span>
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

      {/* ─── CONTENIDO PRINCIPAL Y HEADER MÓVIL CON MENÚ HAMBURGUESA ─── */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden pb-8">
        {/* HEADER MÓVIL (< 768px): CON BOTÓN HAMBURGUESA Y LOGO OFICIAL */}
        <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-neutral-200/70 dark:border-neutral-800/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Botón Menú Hamburguesa */}
            <button
              type="button"
              onClick={() => setMenuHamburguesaAbierto(!menuHamburguesaAbierto)}
              aria-label={menuHamburguesaAbierto ? "Cerrar menú principal" : "Abrir menú principal"}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-neutral-800 dark:text-neutral-100 bg-neutral-100/90 dark:bg-neutral-800/90 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 active:scale-95 transition-all -ml-1 shrink-0"
            >
              {menuHamburguesaAbierto ? (
                <X className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
              ) : (
                <Menu className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
              )}
            </button>

            <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-neutral-200/80 dark:border-neutral-700/80">
              <div className="relative w-full h-full">
                <Image
                  src={marca.logo_claro_url || "/images/logo-interescuelas-2026.png"}
                  alt={marca.nombre_actividad || "Escudo Oficial"}
                  fill
                  className="object-contain"
                  sizes="32px"
                  priority
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight truncate">
                {marca.organizacion}
              </p>
              <p className="text-[10px] text-neutral-400 leading-none truncate">{marca.nombre_corto}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Modo de color"
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
              aria-label="Salir del sistema"
              title="Salir"
              className="w-9 h-9 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── MENÚ HAMBURGUESA MÓVIL SLIDE-OVER (< 768px) ─── */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
            menuHamburguesaAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop oscuro con desenfoque Apple */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuHamburguesaAbierto(false)}
            aria-hidden="true"
          />

          {/* Panel Lateral Deslizante */}
          <aside
            className={`absolute inset-y-0 left-0 w-[84%] max-w-xs bg-white dark:bg-[#1C1C1E] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out z-10 border-r border-neutral-200/80 dark:border-neutral-800 ${
              menuHamburguesaAbierto ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Cabecera del Menú */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 p-1 flex items-center justify-center shrink-0 shadow-xs border border-neutral-200/80 dark:border-neutral-700/80">
                  <div className="relative w-full h-full">
                    <Image
                      src={marca.logo_claro_url || "/images/logo-interescuelas-2026.png"}
                      alt={marca.nombre_actividad || "Escudo"}
                      fill
                      className="object-contain"
                      sizes="36px"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {marca.organizacion}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-medium truncate">
                    {marca.nombre_corto}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuHamburguesaAbierto(false)}
                aria-label="Cerrar menú"
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Listado de Enlaces de Navegación */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Módulos del Sistema
              </p>

              {defaultNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuHamburguesaAbierto(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
                      active
                        ? "bg-[#0A2540] text-white dark:bg-blue-600 shadow-sm"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={active ? "text-white" : "text-neutral-500 dark:text-neutral-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Botón Salir en listado de navegación */}
              <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setMenuHamburguesaAbierto(false);
                    setConfirmarSalidaAbierto(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Salir</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Pie del Menú Hamburguesa: Ficha de Usuario, Tema y Salir */}
            <div className="p-4 pb-6 sm:pb-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 space-y-2.5">
              <div className="p-3 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {userName}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {effectiveSubtitle} • <span className="capitalize font-mono font-semibold">{userRole}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0"
                  title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuHamburguesaAbierto(false);
                  setConfirmarSalidaAbierto(true);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-900/50 transition-colors active:scale-95 shadow-2xs"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Salir</span>
              </button>
            </div>
          </aside>
        </div>

        <main className="flex-1 w-full max-w-6xl min-w-0 mx-auto px-4 sm:px-8 pt-3 sm:pt-6 overflow-x-hidden">
          {children}
        </main>
      </div>

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
