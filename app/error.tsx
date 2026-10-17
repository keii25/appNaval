"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-center shadow-xl space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Ocurrió un error inesperado</h2>
        <p className="text-sm text-slate-400">
          No te preocupes, puedes reintentar la acción o volver al inicio del sistema.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium text-sm transition-colors text-slate-200"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
