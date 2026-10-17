"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock, User, Eye, EyeOff, AlertCircle, Clock, ShieldCheck, Trophy, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [minutosBloqueo, setMinutosBloqueo] = useState<number | null>(null);
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  const [mensajeInactividad, setMensajeInactividad] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get("motivo") === "inactividad") {
      setMensajeInactividad("Tu sesión ha expirado por inactividad. Ingresa nuevamente.");
    } else if (searchParams?.get("error") === "inactivo") {
      setError("Esta cuenta ha sido desactivada por el administrador.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !password) return;

    setCargando(true);
    setError(null);
    setMensajeInactividad(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedula.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        if (data.bloqueado) {
          setBloqueado(true);
          setMinutosBloqueo(data.minutosRestantes || 15);
        } else if (data.intentosRestantes !== undefined) {
          setIntentosRestantes(data.intentosRestantes);
        }
        setCargando(false);
        return;
      }

      // Redirección informada por el backend según rol y estado del perfil
      router.push(data.redireccion || "/auxiliar");
      router.refresh();
    } catch {
      setError("No fue posible comunicarse con el servidor. Revisa tu conexión.");
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col justify-between items-center p-3 sm:p-4 lg:py-3 lg:px-6 bg-[#F2F2F7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="w-full max-w-6xl my-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 xl:gap-10">
        
        {/* ─── COLUMNA IZQUIERDA: HERO CARD CON MASCOTA OFICIAL (DESKTOP) ─── */}
        <div className="hidden lg:flex flex-col justify-between w-full lg:w-[480px] xl:w-[500px] h-[min(620px,calc(100vh-60px))] rounded-[32px] p-5 sm:p-6 bg-gradient-to-br from-[#0A2540] via-[#071c31] to-[#040c17] text-white border border-white/10 shadow-2xl relative overflow-hidden select-none">
          {/* Luz ambiental de fondo */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Cabecera del Hero */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-200 mb-2 backdrop-blur-md">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>XXX Juegos Interescuelas 2026</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              Escuela Naval de Cadetes
            </h2>
            <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">
              &ldquo;Almirante Padilla&rdquo; • Cartagena de Indias
            </p>
          </div>

          {/* Mascota Oficial en Podio (Aprovechamiento máximo del espacio interno) */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-1">
            <div className="relative w-full max-w-[440px] h-[370px] sm:h-[400px] drop-shadow-[0_25px_40px_rgba(0,0,0,0.55)] transition-transform hover:scale-105 duration-300">
              <Image
                src="/images/mascota-interescuelas-2026.png"
                alt="Mascota Oficial XXX Juegos Interescuelas 2026"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 440px"
              />
            </div>
            <p className="text-[11px] text-center font-bold text-blue-100 tracking-wide mt-1">
              ¡Bienvenidos a la fiesta deportiva naval!
            </p>
          </div>

          {/* Pie informativo del Hero */}
          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Control Seguro y Acreditación
            </span>
            <span>Cartagena 2026</span>
          </div>
        </div>

        {/* ─── COLUMNA DERECHA: FORMULARIO CON LOGO OFICIAL ─── */}
        <div className="w-full max-w-[400px] flex flex-col items-center">
          
          {/* Logo Oficial de los Juegos (Ancla Dorada EN + Fuego Tricolor) */}
          <div className="flex flex-col items-center mb-3 sm:mb-4 text-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-2 drop-shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 duration-300">
              <Image
                src="/images/logo-interescuelas-2026.png"
                alt="Logo Oficial XXX Juegos Interescuelas 2026"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 640px) 96px, 112px"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
              Control de Ingreso
            </h1>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Plataforma Oficial de Acreditación y Seguridad
            </p>
          </div>

          {/* Tarjeta de Login (Inset Grouped Card Apple HIG) */}
          <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 shadow-apple-card sm:shadow-apple-popover border border-neutral-200/80 dark:border-neutral-800/90 backdrop-blur-md">
            
            {/* Mensaje de sesión expirada */}
            {mensajeInactividad && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs sm:text-sm"
              >
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{mensajeInactividad}</span>
              </div>
            )}

            {/* Mensaje de error / bloqueo */}
            {error && (
              <div
                role="alert"
                className={`mb-5 p-3.5 rounded-2xl flex items-start gap-3 text-xs sm:text-sm border ${
                  bloqueado
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200"
                    : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200"
                }`}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  {intentosRestantes !== null && !bloqueado && (
                    <p className="mt-1 text-[11px] opacity-90">
                      Tras 5 intentos fallidos la cuenta se bloqueará temporalmente.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo: Cédula */}
              <div>
                <label
                  htmlFor="cedula"
                  className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 ml-1"
                >
                  Cédula de Identidad
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="cedula"
                    name="cedula"
                    type="text"
                    inputMode="numeric"
                    autoComplete="username"
                    required
                    disabled={cargando || bloqueado}
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Ej. 1098765432"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm font-semibold outline-none transition-all duration-150 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Campo: Contraseña */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                  >
                    Contraseña
                  </label>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                    Tu número de cédula
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={mostrarPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={cargando || bloqueado}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-transparent focus:border-[#0A2540] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm outline-none transition-all duration-150 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                  >
                    {mostrarPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botón Principal (Apple Filled Button) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando || bloqueado || !cedula.trim() || !password}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#0A2540] hover:bg-[#071a2e] text-white font-bold text-sm sm:text-base shadow-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
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
                      <span>Verificando credenciales...</span>
                    </>
                  ) : bloqueado ? (
                    `Bloqueado (${minutosBloqueo}m)`
                  ) : (
                    "Iniciar Sesión"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tarjeta de Mascota en Móvil (< lg) */}
          <div className="lg:hidden mt-6 w-full p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-neutral-200/80 dark:border-neutral-800/90 shadow-sm flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0 drop-shadow-sm">
              <Image
                src="/images/mascota-interescuelas-2026.png"
                alt="Mascota Oficial"
                fill
                className="object-contain"
                sizes="64px"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                XXX Juegos Interescuelas 2026
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                Escuela Naval de Cadetes &ldquo;Almirante Padilla&rdquo;
              </p>
            </div>
          </div>

          {/* Guía informativa rápida */}
          <div className="mt-3 text-center text-[11px] text-neutral-400 dark:text-neutral-500 max-w-xs leading-normal">
            <p>
              Autorización obligatoria de datos personales (Ley 1581 de 2012) para ingreso y acreditación.
            </p>
          </div>
        </div>

      </div>

      {/* Pie de página institucional */}
      <footer className="text-center text-[10px] text-neutral-400 dark:text-neutral-600 mt-2">
        <p>© Escuela Naval de Cadetes &ldquo;Almirante Padilla&rdquo; — Cartagena de Indias 2026</p>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#000000]">
          <div className="w-8 h-8 border-2 border-[#0A2540] border-t-transparent rounded-full animate-spin dark:border-blue-400 dark:border-t-transparent" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

