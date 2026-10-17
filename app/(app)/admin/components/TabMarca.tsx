"use client";

// app/(app)/admin/components/TabMarca.tsx — Configuración de Marca y Textos Dinámicos (Apple HIG)
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MARCA } from "@/lib/marca/defaults";
import type {
  ConfiguracionMarca,
  VocabularioConfig,
  TerminoVocabulario,
  TextosLoginConfig,
} from "@/types/database";
import {
  Sparkles,
  Palette,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Shield,
  Layers,
  RotateCcw,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Azul Armada", hex: "#0A2540" },
  { name: "Azul Apple", hex: "#007AFF" },
  { name: "Verde Esmeralda", hex: "#34C759" },
  { name: "Índigo Profundo", hex: "#5856D6" },
  { name: "Púrpura Real", hex: "#AF52DE" },
  { name: "Naranja Ámbar", hex: "#FF9500" },
  { name: "Rojo Carmesí", hex: "#FF3B30" },
  { name: "Negro Espacial", hex: "#1C1C1E" },
];

export function TabMarca() {
  const toast = useToast();

  const [marca, setMarca] = useState<ConfiguracionMarca>(DEFAULT_MARCA);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoTipo, setSubiendoTipo] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<"formulario" | "preview">("formulario");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadTipoRef = useRef<"logo_claro" | "logo_oscuro" | "icono" | "mascota">("logo_claro");

  // Cargar configuración de marca desde la API
  const cargarMarca = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/marca");
      const data = await res.json();
      if (res.ok && data.marca) {
        setMarca({
          ...DEFAULT_MARCA,
          ...data.marca,
          vocabulario: {
            ...DEFAULT_MARCA.vocabulario,
            ...(data.marca.vocabulario || {}),
          },
          textos_login: {
            ...DEFAULT_MARCA.textos_login,
            ...(data.marca.textos_login || {}),
          },
        });
      } else {
        setMarca(DEFAULT_MARCA);
      }
    } catch {
      toast.error("Error", "No fue posible cargar la configuración de marca.");
      setMarca(DEFAULT_MARCA);
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarMarca();
  }, [cargarMarca]);

  // Guardar configuración
  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGuardando(true);

    try {
      const res = await fetch("/api/admin/marca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(marca),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(
          "Marca Guardada",
          marca.flag_marca_dinamica
            ? "La configuración personalizada está activa en toda la aplicación."
            : "Cambios guardados. El modo dinámico está en pausa (usando defaults)."
        );
        if (data.marca) {
          setMarca((prev) => ({ ...prev, ...data.marca }));
        }
      } else {
        toast.error("Error al guardar", data.error || "No se pudo actualizar la marca.");
      }
    } catch {
      toast.error("Error", "Error de comunicación con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  // Subir archivo al bucket 'marca'
  const handleTriggerUpload = (tipo: "logo_claro" | "logo_oscuro" | "icono" | "mascota") => {
    targetUploadTipoRef.current = tipo;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tipo = targetUploadTipoRef.current;
    setSubiendoTipo(tipo);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);

      const res = await fetch("/api/admin/marca/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Imagen subida", "El archivo fue almacenado con éxito en el bucket oficial.");
        if (tipo === "logo_claro") setMarca((prev) => ({ ...prev, logo_claro_url: data.url }));
        if (tipo === "logo_oscuro") setMarca((prev) => ({ ...prev, logo_oscuro_url: data.url }));
        if (tipo === "icono") setMarca((prev) => ({ ...prev, icono_url: data.url }));
        if (tipo === "mascota") setMarca((prev) => ({ ...prev, mascota_url: data.url }));
      } else {
        toast.error("Error al subir", data.error || "No se pudo almacenar la imagen.");
      }
    } catch {
      toast.error("Error", "Error al procesar la subida del archivo.");
    } finally {
      setSubiendoTipo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Restaurar valores por defecto oficiales
  const handleRestaurarDefaults = () => {
    if (
      window.confirm(
        "¿Deseas restablecer todos los textos, logos y vocabulario a los valores predeterminados de la Escuela Naval?"
      )
    ) {
      setMarca({
        ...DEFAULT_MARCA,
        flag_marca_dinamica: false,
      });
      toast.info("Valores restablecidos", "Recuerda presionar 'Guardar Cambios' para persistir.");
    }
  };

  // Helper para modificar vocabulario
  const updateTermino = (
    tipo: "participante" | "entidad" | "visitante",
    campo: keyof TerminoVocabulario,
    valor: string
  ) => {
    setMarca((prev) => ({
      ...prev,
      vocabulario: {
        ...prev.vocabulario,
        [tipo]: {
          ...prev.vocabulario[tipo],
          [campo]: valor,
        },
      },
    }));
  };

  // Helper para modificar textos de login
  const updateTextosLogin = (campo: keyof TextosLoginConfig, valor: string) => {
    setMarca((prev) => ({
      ...prev,
      textos_login: {
        ...prev.textos_login,
        [campo]: valor,
      },
    }));
  };

  if (cargando) {
    return (
      <div className="p-16 text-center text-neutral-400 text-sm">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#0A2540] dark:text-blue-400" />
        <p className="font-medium">Cargando módulo de marca y personalización...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Input de archivo oculto para uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ─── BARRA SUPERIOR: ESTADO Y VISTAS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              marca.flag_marca_dinamica
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
            }`}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Personalización y Marca Dinámica</span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                  marca.flag_marca_dinamica
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {marca.flag_marca_dinamica ? "Activa" : "Por Defecto (Pausa)"}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Controla la identidad visual, logos y vocabulario de toda la aplicación sin tocar código.
            </p>
          </div>
        </div>

        {/* Switch de Vistas: Formulario vs Live Preview */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/60">
            <button
              type="button"
              onClick={() => setVistaActiva("formulario")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                vistaActiva === "formulario"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configuración</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva("preview")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                vistaActiva === "preview"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview en Vivo</span>
            </button>
          </div>
        </div>
      </div>

      {vistaActiva === "formulario" ? (
        <form onSubmit={handleGuardar} className="space-y-6">
          {/* ─── SECCIÓN 1: INTERRUPTOR MAESTRO (FEATURE FLAG) ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Interruptor Maestro de Marca Dinámica
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl">
                  {marca.flag_marca_dinamica
                    ? "Los textos, logos, color de acento y términos personalizados están activos y visibles para todos los usuarios."
                    : "El sistema está usando los valores oficiales por defecto (Escuela Naval de Cadetes / Inter Escuelas 2026). Activa el interruptor para aplicar la personalización."}
                </p>
              </div>

              {/* Toggle Switch estilo iOS */}
              <button
                type="button"
                role="switch"
                aria-checked={marca.flag_marca_dinamica}
                onClick={() =>
                  setMarca((prev) => ({
                    ...prev,
                    flag_marca_dinamica: !prev.flag_marca_dinamica,
                  }))
                }
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  marca.flag_marca_dinamica
                    ? "bg-emerald-500 focus:ring-emerald-500"
                    : "bg-neutral-300 dark:bg-neutral-700 focus:ring-neutral-400"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    marca.flag_marca_dinamica ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ─── SECCIÓN 2: IDENTIDAD GENERAL DEL EVENTO ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Identidad del Evento o Convocatoria
                </h4>
                <p className="text-xs text-neutral-400">
                  Nombres oficiales que encabezarán los certificados, cabeceras y reportes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nombre Completo del Evento / Actividad
                </label>
                <input
                  type="text"
                  value={marca.nombre_actividad}
                  onChange={(e) => setMarca((prev) => ({ ...prev, nombre_actividad: e.target.value }))}
                  required
                  placeholder="Ej: XXX Juegos Deportivos Interescuelas de Cadetes 2026"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nombre Corto (Barras de Título / Sidebar)
                </label>
                <input
                  type="text"
                  value={marca.nombre_corto}
                  onChange={(e) => setMarca((prev) => ({ ...prev, nombre_corto: e.target.value }))}
                  required
                  placeholder="Ej: Inter Escuelas 2026"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organización Anfitriona
                </label>
                <input
                  type="text"
                  value={marca.organizacion}
                  onChange={(e) => setMarca((prev) => ({ ...prev, organizacion: e.target.value }))}
                  required
                  placeholder="Ej: Escuela Naval de Cadetes 'Almirante Padilla'"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Lema Oficial o Eslogan
                </label>
                <input
                  type="text"
                  value={marca.lema}
                  onChange={(e) => setMarca((prev) => ({ ...prev, lema: e.target.value }))}
                  placeholder="Ej: Honor, Lealtad y Gloria"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Ciudad y Lugar Sede
                </label>
                <input
                  type="text"
                  value={marca.lugar}
                  onChange={(e) => setMarca((prev) => ({ ...prev, lugar: e.target.value }))}
                  placeholder="Ej: Cartagena de Indias, Colombia"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2540] dark:focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* ─── SECCIÓN 3: LOGOS E ICONOGRAFÍA (BUCKET 'MARCA') ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Logotipos e Iconos
              </h4>
              <p className="text-xs text-neutral-400">
                Imágenes oficiales subidas al bucket seguro &lsquo;marca&rsquo; (máx 2MB por imagen, PNG, WebP o SVG con transparencia recomendado).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Logo Claro / Principal */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col items-center justify-between gap-3 text-center">
                <div className="w-full flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>Logo Claro (Principal)</span>
                  <span className="text-[10px] text-neutral-400">Requerido</span>
                </div>
                <div className="relative w-28 h-28 p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center shadow-sm overflow-hidden">
                  {marca.logo_claro_url ? (
                    <Image
                      src={marca.logo_claro_url}
                      alt="Logo Claro"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">Sin logo</span>
                  )}
                </div>
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    value={marca.logo_claro_url}
                    onChange={(e) => setMarca((prev) => ({ ...prev, logo_claro_url: e.target.value }))}
                    placeholder="URL del logo o subir..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 truncate"
                  />
                  <button
                    type="button"
                    disabled={subiendoTipo === "logo_claro"}
                    onClick={() => handleTriggerUpload("logo_claro")}
                    className="w-full py-2 px-3 rounded-xl bg-[#0A2540] dark:bg-blue-600 hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {subiendoTipo === "logo_claro" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Subir Imagen</span>
                  </button>
                </div>
              </div>

              {/* Logo Modo Oscuro */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col items-center justify-between gap-3 text-center">
                <div className="w-full flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>Logo Modo Oscuro</span>
                  <span className="text-[10px] text-neutral-400">Opcional</span>
                </div>
                <div className="relative w-28 h-28 p-2 rounded-2xl bg-[#0A0A0C] border border-neutral-800 flex items-center justify-center shadow-sm overflow-hidden">
                  {marca.logo_oscuro_url ? (
                    <Image
                      src={marca.logo_oscuro_url}
                      alt="Logo Oscuro"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[11px] text-neutral-500">Usa Logo Claro</span>
                  )}
                </div>
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    value={marca.logo_oscuro_url || ""}
                    onChange={(e) => setMarca((prev) => ({ ...prev, logo_oscuro_url: e.target.value || null }))}
                    placeholder="URL opcional..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 truncate"
                  />
                  <button
                    type="button"
                    disabled={subiendoTipo === "logo_oscuro"}
                    onClick={() => handleTriggerUpload("logo_oscuro")}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {subiendoTipo === "logo_oscuro" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Subir Versión Oscura</span>
                  </button>
                </div>
              </div>

              {/* Ícono / Favicon */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col items-center justify-between gap-3 text-center">
                <div className="w-full flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>Ícono de App / PWA</span>
                  <span className="text-[10px] text-neutral-400">Favicon</span>
                </div>
                <div className="relative w-28 h-28 p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center shadow-sm overflow-hidden">
                  {marca.icono_url ? (
                    <Image
                      src={marca.icono_url}
                      alt="Ícono"
                      fill
                      className="object-contain p-4"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">Sin ícono</span>
                  )}
                </div>
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    value={marca.icono_url}
                    onChange={(e) => setMarca((prev) => ({ ...prev, icono_url: e.target.value }))}
                    placeholder="URL del ícono..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 truncate"
                  />
                  <button
                    type="button"
                    disabled={subiendoTipo === "icono"}
                    onClick={() => handleTriggerUpload("icono")}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-700 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {subiendoTipo === "icono" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Subir Ícono</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECCIÓN 4: PALETA Y COLOR DE ACENTO INSTITUCIONAL ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Color de Acento Institucional
                </h4>
                <p className="text-xs text-neutral-400">
                  Tinte principal usado en botones, badges, enlaces y acentos visuales.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full shadow-inner border border-white/40"
                  style={{ backgroundColor: marca.color_acento || "#0A2540" }}
                />
                <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase">
                  {marca.color_acento || "#0A2540"}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Presets Apple HIG */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_COLORS.map((col) => {
                  const isSelected = marca.color_acento?.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setMarca((prev) => ({ ...prev, color_acento: col.hex }))}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900/10 dark:ring-white/20 bg-neutral-50 dark:bg-neutral-800"
                          : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-black/10"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {col.name}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase">{col.hex}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selector personalizado */}
              <div className="pt-2 flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  O seleccionar tono personalizado:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={marca.color_acento || "#0A2540"}
                    onChange={(e) => setMarca((prev) => ({ ...prev, color_acento: e.target.value }))}
                    className="w-9 h-9 p-0.5 rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={marca.color_acento || "#0A2540"}
                    onChange={(e) => setMarca((prev) => ({ ...prev, color_acento: e.target.value }))}
                    className="w-28 px-2.5 py-1.5 rounded-xl font-mono text-xs uppercase bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECCIÓN 5: VOCABULARIO ADAPTATIVO ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Vocabulario y Términos Adaptativos
              </h4>
              <p className="text-xs text-neutral-400">
                Cambia la terminología para que la aplicación sirva para cualquier evento (académico, deportivo, cultural o militar).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* Participante */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Sujeto Principal
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">participante</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Singular (ej: deportista, cadete, ponente)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.participante.singular}
                      onChange={(e) => updateTermino("participante", "singular", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Plural (ej: deportistas, cadetes, ponentes)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.participante.plural}
                      onChange={(e) => updateTermino("participante", "plural", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-neutral-500 font-medium">Género gramatical:</span>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_participante"
                        checked={marca.vocabulario.participante.genero === "m"}
                        onChange={() => updateTermino("participante", "genero", "m")}
                      />
                      <span>Masculino (el/los)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_participante"
                        checked={marca.vocabulario.participante.genero === "f"}
                        onChange={() => updateTermino("participante", "genero", "f")}
                      />
                      <span>Femenino (la/las)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Entidad */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Institución / Origen
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">entidad</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Singular (ej: escuela, delegación, facultad)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.entidad.singular}
                      onChange={(e) => updateTermino("entidad", "singular", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Plural (ej: escuelas, delegaciones, facultades)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.entidad.plural}
                      onChange={(e) => updateTermino("entidad", "plural", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-neutral-500 font-medium">Género gramatical:</span>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_entidad"
                        checked={marca.vocabulario.entidad.genero === "f"}
                        onChange={() => updateTermino("entidad", "genero", "f")}
                      />
                      <span>Femenino (la/las)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_entidad"
                        checked={marca.vocabulario.entidad.genero === "m"}
                        onChange={() => updateTermino("entidad", "genero", "m")}
                      />
                      <span>Masculino (el/los)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Visitante */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Acompañante
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">visitante</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Singular (ej: visitante, acompañante, invitado)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.visitante.singular}
                      onChange={(e) => updateTermino("visitante", "singular", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-medium">Plural (ej: visitantes, acompañantes, invitados)</label>
                    <input
                      type="text"
                      value={marca.vocabulario.visitante.plural}
                      onChange={(e) => updateTermino("visitante", "plural", e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-neutral-500 font-medium">Género gramatical:</span>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_visitante"
                        checked={marca.vocabulario.visitante.genero === "m"}
                        onChange={() => updateTermino("visitante", "genero", "m")}
                      />
                      <span>Masculino (el/los)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <input
                        type="radio"
                        name="genero_visitante"
                        checked={marca.vocabulario.visitante.genero === "f"}
                        onChange={() => updateTermino("visitante", "genero", "f")}
                      />
                      <span>Femenino (la/las)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECCIÓN 6: TEXTOS DE PANTALLA DE LOGIN ─── */}
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/70 dark:border-neutral-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Textos de Inicio de Sesión
              </h4>
              <p className="text-xs text-neutral-400">
                Personaliza los mensajes de bienvenida y las leyendas de seguridad en la pantalla de ingreso.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Insignia Superior (Badge Hero)
                </label>
                <input
                  type="text"
                  value={marca.textos_login?.badge || ""}
                  onChange={(e) => updateTextosLogin("badge", e.target.value)}
                  placeholder="Ej: Acreditación Oficial"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Título Hero
                </label>
                <input
                  type="text"
                  value={marca.textos_login?.titulo_hero || ""}
                  onChange={(e) => updateTextosLogin("titulo_hero", e.target.value)}
                  placeholder="Ej: Sistema de Acreditación"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Subtítulo Hero
                </label>
                <input
                  type="text"
                  value={marca.textos_login?.subtitulo_hero || ""}
                  onChange={(e) => updateTextosLogin("subtitulo_hero", e.target.value)}
                  placeholder="Ej: Control de Acceso y Visitantes"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Pie de Página Oficial
                </label>
                <input
                  type="text"
                  value={marca.textos_login?.pie_pagina || ""}
                  onChange={(e) => updateTextosLogin("pie_pagina", e.target.value)}
                  placeholder="Ej: Escuela Naval de Cadetes 'Almirante Padilla' • República de Colombia"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* ─── BOTONES DE ACCIÓN FLOTANTES / INFERIORES ─── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={handleRestaurarDefaults}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Valores de Fábrica</span>
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0A2540] dark:bg-blue-600 hover:opacity-95 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98] transition-all"
            >
              {guardando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración de Marca</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* ─── MODO PREVIEW EN VIVO (LIVE PREVIEW APPLE HIG) ─── */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>Visualización simulada con los datos actuales del formulario:</span>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTheme("light")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  previewTheme === "light"
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold"
                    : "text-neutral-400"
                }`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("dark")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  previewTheme === "dark"
                    ? "bg-neutral-800 text-white font-bold"
                    : "text-neutral-400"
                }`}
              >
                Oscuro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mockup 1: Pantalla de Login */}
            <div
              className={`rounded-3xl border p-6 transition-all shadow-sm flex flex-col justify-between min-h-[420px] ${
                previewTheme === "dark"
                  ? "bg-[#000000] border-neutral-800 text-white"
                  : "bg-[#F2F2F7] border-neutral-200 text-neutral-900"
              }`}
            >
              <div className="text-center space-y-3 my-auto">
                <div className="relative w-20 h-20 mx-auto">
                  <Image
                    src={
                      (previewTheme === "dark" && marca.logo_oscuro_url) ||
                      marca.logo_claro_url ||
                      "/images/logo-interescuelas-2026.png"
                    }
                    alt="Logo Preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                <div className="space-y-1">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: marca.color_acento || "#0A2540" }}
                  >
                    {marca.textos_login?.badge || "Acreditación Oficial"}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">
                    {marca.textos_login?.titulo_hero || marca.nombre_actividad}
                  </h3>
                  <p className="text-xs opacity-70">
                    {marca.textos_login?.subtitulo_hero || marca.nombre_corto}
                  </p>
                </div>

                {/* Formulario simulado */}
                <div
                  className={`max-w-xs mx-auto p-4 rounded-2xl border text-left space-y-2.5 text-xs shadow-sm ${
                    previewTheme === "dark"
                      ? "bg-[#1C1C1E] border-neutral-800"
                      : "bg-white border-neutral-200/80"
                  }`}
                >
                  <div className="h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center px-3 text-[11px] opacity-60">
                    {marca.textos_login?.label_usuario || "Usuario"}
                  </div>
                  <div className="h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center px-3 text-[11px] opacity-60">
                    ••••••••
                  </div>
                  <div
                    className="h-8 rounded-xl text-white font-semibold flex items-center justify-center text-xs"
                    style={{ backgroundColor: marca.color_acento || "#0A2540" }}
                  >
                    Iniciar Sesión
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] opacity-50 pt-4">
                {marca.textos_login?.pie_pagina || marca.organizacion}
              </div>
            </div>

            {/* Mockup 2: Barra Lateral (Sidebar) y Menú */}
            <div
              className={`rounded-3xl border p-6 transition-all shadow-sm flex flex-col justify-between min-h-[420px] ${
                previewTheme === "dark"
                  ? "bg-[#1C1C1E] border-neutral-800 text-white"
                  : "bg-white border-neutral-200 text-neutral-900"
              }`}
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3">
                  Vista Previa del Sidebar Adaptado
                </p>

                {/* Cabecera del Sidebar */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 mb-4">
                  <div className="relative w-10 h-10 shrink-0">
                    <Image
                      src={marca.logo_claro_url || "/images/logo-interescuelas-2026.png"}
                      alt="Logo Sidebar"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate leading-tight">{marca.organizacion}</p>
                    <p className="text-[11px] opacity-60 truncate mt-0.5">{marca.nombre_corto}</p>
                  </div>
                </div>

                {/* Ítems del menú */}
                <div className="space-y-1.5 text-xs">
                  <div
                    className="p-3 rounded-2xl font-semibold text-white flex items-center justify-between"
                    style={{ backgroundColor: marca.color_acento || "#0A2540" }}
                  >
                    <span>Admin</span>
                    <span className="text-[10px] opacity-75">Activo</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>
                      {marca.vocabulario?.participante?.titulo_plural ||
                        marca.vocabulario?.participante?.plural ||
                        "Deportistas"}
                    </span>
                    <span className="text-[10px] text-blue-500 font-mono">término dinámico</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>
                      {marca.vocabulario?.entidad?.titulo_plural ||
                        marca.vocabulario?.entidad?.plural ||
                        "Escuelas"}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-mono">término dinámico</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>Control Portería</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800 text-[11px] space-y-1">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Lema Oficial: &ldquo;{marca.lema}&rdquo;
                </p>
                <p className="opacity-60">Sede: {marca.lugar}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabMarca;
