"use client";

// app/(app)/auxiliar/page.tsx — Panel de Trabajo del Auxiliar de Acreditación (Paso 4)
import React, { useState, useEffect } from "react";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import LargeTitleHeader from "@/components/layout/LargeTitleHeader";
import ToastProvider from "@/components/ui/Toast";
import DeportistasManager from "@/components/deportistas/DeportistasManager";
import type { Perfil } from "@/types/database";

function AuxiliarDashboard() {
  return (
    <div className="space-y-6 pb-20">
      <LargeTitleHeader
        title="Registro de Deportistas"
        subtitle="Mesa de acreditación, validación de identidad y registro de visitantes autorizados."
      />

      <DeportistasManager rolUsuario="auxiliar" baseRutaVisitantes="/auxiliar" />
    </div>
  );
}

export default function AuxiliarPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    async function fetchPerfil() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setPerfil(data.perfil);
        }
      } catch {
        // Silencioso
      }
    }
    fetchPerfil();
  }, []);

  return (
    <ToastProvider>
      <AdaptiveLayout
        userName={perfil?.nombre || "Auxiliar de Acreditación"}
        userSubtitle={perfil?.unidad || "Mesa de Registro"}
        userRole="auxiliar"
      >
        <AuxiliarDashboard />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
