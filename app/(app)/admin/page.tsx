"use client";

// app/(app)/admin/page.tsx — Panel de Administración Naval (Apple HIG)
import React, { useState } from "react";
import Link from "next/link";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import LargeTitleHeader from "@/components/layout/LargeTitleHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ToastProvider from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import TabEscuelas from "./components/TabEscuelas";
import TabAuxiliares from "./components/TabAuxiliares";
import TabConfiguracion from "./components/TabConfiguracion";
import TabMarca from "./components/TabMarca";
import TabAuditoria from "./components/TabAuditoria";
import TabVisitantes from "./components/TabVisitantes";
import DeportistasManager from "@/components/deportistas/DeportistasManager";
import { useLabels } from "@/lib/marca";
import {
  Users,
  UserPlus,
  School,
  UserCheck,
  Settings,
  History,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Menu,
  Check,
  ChevronDown,
  Palette,
} from "lucide-react";

type TabAdmin = "deportistas" | "visitantes" | "escuelas" | "auxiliares" | "configuracion" | "marca" | "auditoria";

function AdminContent() {
  const { t } = useLabels();
  const [tabActual, setTabActual] = useState<TabAdmin>("deportistas");
  const [menuHamburguesaAbierto, setMenuHamburguesaAbierto] = useState(false);

  const tabOptions = [
    {
      value: "deportistas" as TabAdmin,
      label: t("Participantes"),
      descripcion: `Padrón oficial de ${t("participantes")} y acompañantes`,
      icon: <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      bgIcon: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      value: "visitantes" as TabAdmin,
      label: "Acreditaciones",
      descripcion: "Aprobación y control de pases de ingreso",
      icon: <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      bgIcon: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      value: "escuelas" as TabAdmin,
      label: t("Entidades"),
      descripcion: `Catálogo oficial de ${t("entidades")}`,
      icon: <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      bgIcon: "bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      value: "auxiliares" as TabAdmin,
      label: "Personal Staff",
      descripcion: "Cuentas de auxiliares y personal de guardia",
      icon: <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      bgIcon: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      value: "configuracion" as TabAdmin,
      label: "Parámetros",
      descripcion: "Cupos máximos y plazos de registro",
      icon: <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      bgIcon: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      value: "marca" as TabAdmin,
      label: "Marca y Textos",
      descripcion: "Logos, colores, vocabulario y textos dinámicos",
      icon: <Palette className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      bgIcon: "bg-sky-50 dark:bg-sky-950/50",
    },
    {
      value: "auditoria" as TabAdmin,
      label: "Auditoría",
      descripcion: "Bitácora inmutable de eventos del sistema",
      icon: <History className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      bgIcon: "bg-rose-50 dark:bg-rose-950/50",
    },
  ];

  const tabActualInfo = tabOptions.find((t) => t.value === tabActual) || tabOptions[0];

  return (
    <div className="space-y-5 pb-20 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* ─── ENCABEZADO CON ACCIONES RÁPIDAS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0">
        <LargeTitleHeader
          title="Panel de Administración"
          subtitle="Catálogos oficiales, padrón de deportistas, auxiliares y control del evento."
        />

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
          <a
            href="/api/admin/exportar/excel"
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar libro consolidado oficial en Excel (.xlsx)"
            className="min-h-[44px] px-2.5 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] shadow-sm truncate"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Excel</span>
          </a>

          <a
            href="/api/admin/exportar/word"
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar minuta oficial para la guardia en Word (.docx)"
            className="min-h-[44px] px-2.5 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] shadow-sm truncate"
          >
            <FileText className="w-4 h-4 text-[#0A2540] dark:text-blue-400 shrink-0" />
            <span className="truncate">Minuta</span>
          </a>

          <Link
            href="/admin/importar"
            className="min-h-[44px] px-2.5 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] shadow-sm truncate"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Importar</span>
          </Link>

          <Link
            href="/porteria"
            className="min-h-[44px] px-2.5 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] shadow-sm truncate"
          >
            <ShieldCheck className="w-4 h-4 text-[#0A2540] dark:text-blue-400 shrink-0" />
            <span className="truncate">Portería</span>
          </Link>
        </div>
      </div>

      {/* ─── BARRA DE NAVEGACIÓN MÓVIL ESTILO APPLE CON MENÚ HAMBURGUESA (< 768px) ─── */}
      <div className="md:hidden w-full max-w-full">
        <button
          type="button"
          onClick={() => setMenuHamburguesaAbierto(true)}
          className="w-full min-h-[54px] p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800/90 shadow-sm flex items-center justify-between transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tabActualInfo.bgIcon}`}>
              {tabActualInfo.icon}
            </div>
            <div className="text-left truncate">
              <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Módulo Activo
              </span>
              <span className="block text-sm font-bold text-neutral-900 dark:text-white truncate">
                {tabActualInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <span className="text-xs font-semibold text-[#0A2540] dark:text-blue-400">
              Módulos
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-xs">
              <Menu className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* ─── SELECTOR SEGMENTADO APPLE HIG (DESKTOP / TABLET >= 768px) ─── */}
      <div className="hidden md:block max-w-3xl w-full">
        <SegmentedControl
          options={tabOptions}
          value={tabActual}
          onChange={(val) => setTabActual(val as TabAdmin)}
          name="admin-tabs"
        />
      </div>

      {/* ─── MENÚ HAMBURGUESA MODAL ESTILO APPLE (BOTTOM SHEET MÓVIL) ─── */}
      <Modal
        isOpen={menuHamburguesaAbierto}
        onClose={() => setMenuHamburguesaAbierto(false)}
        title="Módulos de Administración"
        description="Seleccione la sección que desea consultar o gestionar"
        maxWidth="md"
      >
        <div className="space-y-2 py-1">
          {tabOptions.map((opt) => {
            const isSelected = opt.value === tabActual;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTabActual(opt.value);
                  setMenuHamburguesaAbierto(false);
                }}
                className={`w-full p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all text-left active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#0A2540] text-white dark:bg-blue-600 shadow-sm"
                    : "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-white/15 text-white"
                        : opt.bgIcon
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-snug truncate ${isSelected ? "text-white" : "text-neutral-900 dark:text-white"}`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? "text-blue-100" : "text-neutral-400 dark:text-neutral-500"}`}>
                      {opt.descripcion}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ─── CONTENIDO DINÁMICO POR PESTAÑA ─── */}
      <div className="transition-opacity duration-200 ease-in-out w-full max-w-full min-w-0 overflow-x-hidden">
        {tabActual === "deportistas" && (
          <DeportistasManager rolUsuario="admin" baseRutaVisitantes="/admin" />
        )}
        {tabActual === "visitantes" && <TabVisitantes />}
        {tabActual === "escuelas" && <TabEscuelas />}
        {tabActual === "auxiliares" && <TabAuxiliares />}
        {tabActual === "configuracion" && <TabConfiguracion />}
        {tabActual === "marca" && <TabMarca />}
        {tabActual === "auditoria" && <TabAuditoria />}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdaptiveLayout
        userRole="admin"
        userName="Administrador Naval"
        userSubtitle="Comando General"
      >
        <AdminContent />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
