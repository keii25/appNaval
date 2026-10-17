import type { Metadata, Viewport } from "next";
import "./globals.css";
import DomPatch from "@/components/DomPatch";

export const metadata: Metadata = {
  title: "Control de Ingreso — Escuela Naval",
  description:
    "Sistema de control de ingreso de visitantes para la Escuela Naval de Cadetes Almirante Padilla",
  manifest: "/manifest.json",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A2540",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="notranslate" suppressHydrationWarning>
        <DomPatch />
        {children}
      </body>
    </html>
  );
}
