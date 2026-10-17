"use client";

// app/(auth)/cambiar-clave/page.tsx — Cambio obligatorio de contraseña en el primer ingreso
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";

interface PerfilUsuario {
  id: string;
  nombre: string;
  cedula: string;
  unidad: string;
  rol: string;
}

export default function CambiarClavePage() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del usuario actual
  useEffect(() => {
    async function cargarPerfil() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.perfil) {
            setPerfil(data.perfil);
          }
        }
      } catch {
        // Fallback silencioso
      } finally {
        setCargandoPerfil(false);
      }
    }
    cargarPerfil();
  }, []);

  // Validaciones en tiempo real
  const cumpleLongitud = claveNueva.length >= 8;
  const noEsCedula = perfil?.cedula ? claveNueva !== perfil.cedula : claveNueva.length >= 8;
  const coinciden = claveNueva.length > 0 && claveNueva === confirmarClave;
  const formularioValido = cumpleLongitud && noEsCedula && coinciden;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido) return;

    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/cambiar-clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clave_nueva: claveNueva,
          confirmar_clave: confirmarClave,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No fue posible actualizar la contraseña");
        setCargando(false);
        return;
      }

      // Redirigir según lo indicado por la API
      router.push(data.redireccion || "/aceptar-datos");
      router.refresh();
    } catch {
      setError("Error de conexión al guardar la nueva contraseña.");
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F2F2F7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="w-full max-w-[420px] my-auto flex flex-col items-center">
        {/* Cabecera */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#0A2540] text-white flex items-center justify-center shadow-lg shadow-[#0A2540]/20 mb-4">
            <KeyRound className="w-8 h-8 text-blue-200" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Actualizar Contraseña
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-[340px]">
            Por seguridad, debes cambiar la contraseña inicial de tu cuenta antes de continuar.
          </p>
        </div>

        {/* Ficha de identidad del deportista */}
        {!cargandoPerfil && perfil && (
          <div className="w-full mb-4 p-4 rounded-2xl bg-white/80 dark:bg-[#1C1C1E]/80 border border-neutral-200 dark:border-neutral-800 text-xs flex justify-between items-center">
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {perfil.nombre}
              </p>
              <p className="text-neutral-400 mt-0.5">{perfil.unidad || "Deportista"}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                Cédula
              </span>
              <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                {perfil.cedula}
              </span>
            </div>
          </div>
        )}

        {/* Tarjeta de Formulario */}
        <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 sm:p-7 shadow-sm border border-neutral-200/70 dark:border-neutral-800/80 backdrop-blur-md">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo: Nueva Contraseña */}
            <div>
              <label
                htmlFor="clave_nueva"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 ml-1"
              >
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="clave_nueva"
                  type={mostrarClave ? "text" : "password"}
                  required
                  disabled={cargando}
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm outline-none transition-all duration-150"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={mostrarClave ? "Ocultar" : "Mostrar"}
                  onClick={() => setMostrarClave(!mostrarClave)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  {mostrarClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Contraseña */}
            <div>
              <label
                htmlFor="confirmar_clave"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 ml-1"
              >
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmar_clave"
                  type={mostrarClave ? "text" : "password"}
                  required
                  disabled={cargando}
                  value={confirmarClave}
                  onChange={(e) => setConfirmarClave(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm outline-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Reglas de validación visuales */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
              <p className="font-semibold text-neutral-500 dark:text-neutral-400 text-[11px] uppercase tracking-wider mb-1">
                Requisitos de seguridad
              </p>

              <div className="flex items-center gap-2">
                {cumpleLongitud ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span
                  className={
                    cumpleLongitud
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400"
                  }
                >
                  Mínimo 8 caracteres
                </span>
              </div>

              <div className="flex items-center gap-2">
                {claveNueva.length > 0 && noEsCedula ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span
                  className={
                    claveNueva.length > 0 && noEsCedula
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400"
                  }
                >
                  Diferente a tu número de cédula
                </span>
              </div>

              <div className="flex items-center gap-2">
                {coinciden ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span
                  className={
                    coinciden
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400"
                  }
                >
                  Las contraseñas coinciden
                </span>
              </div>
            </div>

            {/* Botón de Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando || !formularioValido}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0A2540] hover:bg-[#1a4a8a] text-white font-medium text-sm sm:text-base shadow-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Guardando contraseña...</span>
                  </>
                ) : (
                  "Establecer Contraseña y Continuar"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
