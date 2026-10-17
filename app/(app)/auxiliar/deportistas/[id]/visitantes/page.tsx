"use client";

// app/(app)/auxiliar/deportistas/[id]/visitantes/page.tsx — Gestión de Visitantes desde Auxiliar
import React, { useState, useEffect } from "react";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import ToastProvider from "@/components/ui/Toast";
import VisitantesManager from "@/components/visitantes/VisitantesManager";
import type { Perfil } from "@/types/database";

interface PageProps {
  params: { id: string };
}

export default function AuxiliarDeportistaVisitantesPage({ params }: PageProps) {
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
        <VisitantesManager
          deportistaId={params.id}
          rolUsuario="auxiliar"
          rutaRetorno="/auxiliar"
        />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
