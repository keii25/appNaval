import type { Metadata, Viewport } from "next";
import "./globals.css";
import DomPatch from "@/components/DomPatch";
import { getMarca } from "@/lib/marca/server";
import { MarcaProvider } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const marca = await getMarca();

  if (!marca.flag_marca_dinamica) {
    return {
      title: "Control de Ingreso — Escuela Naval",
      description:
        "Sistema de control de ingreso de visitantes para la Escuela Naval de Cadetes Almirante Padilla",
      manifest: "/manifest.webmanifest",
      icons: {
        icon: "/images/logo-interescuelas-2026.png",
        shortcut: "/images/logo-interescuelas-2026.png",
        apple: "/images/logo-interescuelas-2026.png",
      },
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Naval App",
      },
    };
  }

  const iconUrl = marca.icono_url || "/images/logo-interescuelas-2026.png";

  return {
    title: {
      template: `%s | ${marca.nombre_corto || marca.nombre_actividad}`,
      default: `${marca.nombre_actividad} — ${marca.organizacion}`,
    },
    description: `Sistema de control de ingreso y acreditación para ${marca.organizacion} — ${marca.nombre_actividad}`,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: marca.nombre_corto || "Acreditación",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const marca = await getMarca();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: marca.flag_marca_dinamica ? (marca.color_acento || "#0A2540") : "#0A2540",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const marca = await getMarca();

  return (
    <html lang="es" className="notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="notranslate" suppressHydrationWarning>
        <DomPatch />
        <MarcaProvider initialMarca={marca}>
          {children}
        </MarcaProvider>
      </body>
    </html>
  );
}
