"use client";

// components/InactivityHandler.tsx — Detector de inactividad con cierre automático
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface InactivityHandlerProps {
  /** Tiempo de inactividad antes de cerrar sesión en milisegundos (por defecto 15 minutos) */
  timeoutMs?: number;
  /** Tiempo antes de expirar para mostrar advertencia en ms (por defecto 1 minuto antes) */
  avisoPrevioMs?: number;
}

export default function InactivityHandler({
  timeoutMs = 15 * 60 * 1000, // 15 min
  avisoPrevioMs = 60 * 1000,    // 1 min aviso previo
}: InactivityHandlerProps) {
  const router = useRouter();
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(60);

  const timerInactividadRef = useRef<NodeJS.Timeout | null>(null);
  const timerAvisoRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloCuentaRef = useRef<NodeJS.Timeout | null>(null);

  const cerrarSesion = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continuar con redirección
    }
    router.push("/login?motivo=inactividad");
  }, [router]);

  const reiniciarTimers = useCallback(() => {
    // Limpiar temporizadores existentes
    if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
    if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current);
    if (intervaloCuentaRef.current) clearInterval(intervaloCuentaRef.current);

    setMostrarAviso(false);
    setSegundosRestantes(Math.round(avisoPrevioMs / 1000));

    // Timer para mostrar advertencia previa
    const tiempoHastaAviso = Math.max(0, timeoutMs - avisoPrevioMs);
    timerAvisoRef.current = setTimeout(() => {
      setMostrarAviso(true);
      let s = Math.round(avisoPrevioMs / 1000);
      setSegundosRestantes(s);

      intervaloCuentaRef.current = setInterval(() => {
        s -= 1;
        setSegundosRestantes(Math.max(0, s));
        if (s <= 0 && intervaloCuentaRef.current) {
          clearInterval(intervaloCuentaRef.current);
        }
      }, 1000);
    }, tiempoHastaAviso);

    // Timer para cierre definitivo de sesión
    timerInactividadRef.current = setTimeout(() => {
      cerrarSesion();
    }, timeoutMs);
  }, [timeoutMs, avisoPrevioMs, cerrarSesion]);

  useEffect(() => {
    const eventos = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handler = () => {
      // Si ya está mostrando el aviso, el usuario debe interactuar con el botón explícitamente
      // Si no está mostrando el aviso, reinicia silenciosamente
      if (!mostrarAviso) {
        reiniciarTimers();
      }
    };

    eventos.forEach((evento) => {
      window.addEventListener(evento, handler, { passive: true });
    });

    reiniciarTimers();

    return () => {
      eventos.forEach((evento) => {
        window.removeEventListener(evento, handler);
      });
      if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
      if (timerAvisoRef.current) clearTimeout(timerAvisoRef.current);
      if (intervaloCuentaRef.current) clearInterval(intervaloCuentaRef.current);
    };
  }, [reiniciarTimers, mostrarAviso]);

  if (!mostrarAviso) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-inactividad"
      aria-describedby="desc-inactividad"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-neutral-100 rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h3 id="titulo-inactividad" className="text-lg font-semibold tracking-tight mb-2">
          ¿Sigues ahí?
        </h3>
        <p id="desc-inactividad" className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Por tu seguridad, la sesión se cerrará automáticamente en{" "}
          <strong className="text-neutral-800 dark:text-neutral-200">
            {segundosRestantes} segundos
          </strong>{" "}
          debido a inactividad.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reiniciarTimers}
            className="w-full py-3 px-4 rounded-2xl bg-[#0A2540] hover:bg-[#1a4a8a] text-white font-medium text-sm transition-colors active:scale-[0.98] duration-150"
          >
            Mantener sesión activa
          </button>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full py-2.5 px-4 rounded-2xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm font-medium transition-colors"
          >
            Cerrar sesión ahora
          </button>
        </div>
      </div>
    </div>
  );
}
