"use client";

// app/(auth)/aceptar-datos/page.tsx — Aceptación de política de datos personales (Ley 1581 de 2012)
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, FileText, Check, AlertCircle, LogOut } from "lucide-react";

export default function AceptarDatosPage() {
  const router = useRouter();

  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acepto) {
      setError("Debes marcar la casilla de aceptación para continuar.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/aceptar-datos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acepto: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No fue posible registrar la autorización.");
        setCargando(false);
        return;
      }

      router.push(data.redireccion || "/deportista");
      router.refresh();
    } catch {
      setError("Error de comunicación con el servidor.");
      setCargando(false);
    }
  };

  const handleCerrarSesion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <main className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F2F2F7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="w-full max-w-[560px] my-auto flex flex-col items-center">
        {/* Cabecera */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative w-24 h-24 mb-3 drop-shadow-md transition-transform hover:scale-105 duration-300">
            <Image
              src="/images/logo-interescuelas-2026.png"
              alt="Logo Oficial XXX Juegos Interescuelas 2026"
              fill
              priority
              className="object-contain"
              sizes="96px"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Tratamiento de Datos Personales
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-[420px]">
            Ley Estatutaria 1581 de 2012 de Protección de Datos Personales de la República de Colombia
          </p>
        </div>

        {/* Tarjeta Principal */}
        <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-200/70 dark:border-neutral-800/80 backdrop-blur-md flex flex-col gap-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Caja con texto legal y scroll interno estilo Apple */}
          <div className="h-64 sm:h-72 overflow-y-auto pr-2 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-200/60 dark:border-neutral-800/70 text-xs sm:text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300 space-y-3.5">
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">
              AUTORIZACIÓN EXPRESA PARA LA RECOLECCIÓN Y TRATAMIENTO DE DATOS PERSONALES
            </p>

            <p>
              En cumplimiento de la <strong>Ley 1581 de 2012</strong>, su Decreto Reglamentario 1377 de 2013 y demás normas concordantes, informamos que la <strong>Escuela Naval de Cadetes &ldquo;Almirante Padilla&rdquo;</strong> actuará como Responsable del Tratamiento de los datos personales suministrados a través de este sistema.
            </p>

            <div>
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                1. Finalidad del Tratamiento:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
                <li>Gestionar el registro y acreditación de visitantes (familiares y amigos) de los deportistas participantes en los Juegos Inter Escuelas.</li>
                <li>Validar la identidad del personal en portería y puestos de guardia para el acceso seguro a las instalaciones militares navales.</li>
                <li>Llevar control de vehículos autorizados (placas y modelos) que ingresen al recinto naval.</li>
                <li>Garantizar la seguridad física y el orden dentro de la jurisdicción de la Escuela Naval.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                2. Declaración del Deportista / Usuario:
              </p>
              <p>
                Al registrar información de terceros (familiares o amigos visitantes), usted declara bajo gravedad de juramento que cuenta con la debida autorización previa e informada de dichos titulares para suministrar sus datos de identificación y vehículos para los fines exclusivos del control de ingreso.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                3. Derechos del Titular (Habeas Data):
              </p>
              <p>
                Usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos personales, así como a revocar la autorización otorgada en los términos previstos por la normatividad colombiana vigente.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Casilla de aceptación estilo Apple */}
            <label className="flex items-start gap-3.5 cursor-pointer select-none group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  id="acepto-terminos"
                  checked={acepto}
                  onChange={(e) => {
                    setAcepto(e.target.checked);
                    if (error) setError(null);
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-lg border transition-all duration-150 flex items-center justify-center ${
                    acepto
                      ? "bg-[#0A2540] dark:bg-blue-600 border-[#0A2540] dark:border-blue-600 text-white"
                      : "border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 group-hover:border-neutral-400"
                  }`}
                >
                  {acepto && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
              <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                He leído, comprendo y <strong>autorizo el tratamiento de mis datos personales</strong> y los de mis visitantes para los fines de control de ingreso a la Escuela Naval.
              </span>
            </label>

            {/* Botones de acción */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="submit"
                disabled={!acepto || cargando}
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
                    <span>Guardando autorización...</span>
                  </>
                ) : (
                  "Autorizar y Continuar al Panel"
                )}
              </button>

              <button
                type="button"
                onClick={handleCerrarSesion}
                className="w-full py-2.5 px-4 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>No acepto / Salir</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
