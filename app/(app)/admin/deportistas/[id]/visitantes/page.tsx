"use client";

// app/(app)/admin/deportistas/[id]/visitantes/page.tsx — Gestión de Visitantes desde Admin
import React from "react";
import AdaptiveLayout from "@/components/layout/AdaptiveLayout";
import ToastProvider from "@/components/ui/Toast";
import VisitantesManager from "@/components/visitantes/VisitantesManager";

interface PageProps {
  params: { id: string };
}

export default function AdminDeportistaVisitantesPage({ params }: PageProps) {
  return (
    <ToastProvider>
      <AdaptiveLayout
        userName="Administrador Naval"
        userSubtitle="Comando General"
        userRole="admin"
      >
        <VisitantesManager
          deportistaId={params.id}
          rolUsuario="admin"
          rutaRetorno="/admin"
        />
      </AdaptiveLayout>
    </ToastProvider>
  );
}
