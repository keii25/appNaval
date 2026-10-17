"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-center shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Error global de la aplicación</h2>
          <p className="text-sm text-slate-400">
            Se produjo un problema al cargar la estructura principal.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors text-white"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
