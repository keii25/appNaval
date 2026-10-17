// app/manifest.ts — Web App Manifest Dinámico PWA
import { MetadataRoute } from "next";
import { getMarca } from "@/lib/marca/server";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const marca = await getMarca();

  if (!marca.flag_marca_dinamica) {
    return {
      name: "Control de Ingreso Naval",
      short_name: "Naval App",
      description: "Control de ingreso de visitantes — Escuela Naval Almirante Padilla",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0A2540",
      orientation: "portrait-primary",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      categories: ["productivity", "utilities"],
    };
  }

  const iconSrc = marca.icono_url || "/icons/icon-192.png";

  return {
    name: `${marca.nombre_actividad} — ${marca.organizacion}`,
    short_name: marca.nombre_corto || "Acreditación",
    description: `Control de ingreso y acreditación — ${marca.organizacion}`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: marca.color_acento || "#0A2540",
    orientation: "portrait-primary",
    icons: [
      { src: iconSrc, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconSrc, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconSrc, sizes: "180x180", type: "image/png" },
    ],
    categories: ["productivity", "utilities"],
  };
}
