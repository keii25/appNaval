// lib/marca/defaults.ts — Valores por defecto oficiales e inmutables de la aplicación
import type { ConfiguracionMarca } from "@/types/database";

export const DEFAULT_MARCA: ConfiguracionMarca = {
  id: 1,
  nombre_actividad: "XXX Juegos Interescuelas 2026",
  nombre_corto: "Inter Escuelas 2026",
  lema: "¡Bienvenidos a la fiesta deportiva naval!",
  organizacion: 'Escuela Naval de Cadetes "Almirante Padilla"',
  lugar: "Cartagena de Indias",
  logo_claro_url: "/images/logo-interescuelas-2026.png",
  logo_oscuro_url: null,
  icono_url: "/images/logo-interescuelas-2026.png",
  mascota_url: "/images/mascota-interescuelas-2026.png",
  color_acento: "#0A2540",
  textos_login: {
    badge: "XXX Juegos Interescuelas 2026",
    titulo_hero: "Escuela Naval de Cadetes",
    subtitulo_hero: "“Almirante Padilla” • Cartagena de Indias",
    lema: "¡Bienvenidos a la fiesta deportiva naval!",
    seguridad: "Control Seguro y Acreditación",
    ubicacion_pie: "Cartagena 2026",
    titulo_formulario: "Control de Ingreso",
    subtitulo_formulario: "Plataforma Oficial de Acreditación y Seguridad",
    label_usuario: "Usuario",
    placeholder_usuario: "Ej. 1098765432 o usuario",
    label_password: "Contraseña",
    ayuda_password: "Tu contraseña asignada",
    placeholder_password: "••••••••",
    boton_login: "Iniciar Sesión",
    aviso_legal_corto:
      "Autorización obligatoria de datos personales (Ley 1581 de 2012) para ingreso y acreditación.",
    pie_pagina:
      "© Escuela Naval de Cadetes “Almirante Padilla” — Cartagena de Indias 2026",
  },
  aviso_datos: `En cumplimiento de la Ley 1581 de 2012, su Decreto Reglamentario 1377 de 2013 y demás normas concordantes, informamos que la Escuela Naval de Cadetes “Almirante Padilla” actuará como Responsable del Tratamiento de los datos personales suministrados a través de este sistema.

Los datos recolectados (nombres, cédula, teléfono, entidad de procedencia y datos de vehículos) serán utilizados exclusivamente para:
1. Gestionar el registro y acreditación de visitantes (familiares y amigos) de los deportistas participantes en los Juegos Inter Escuelas.
2. Garantizar la seguridad física y el orden dentro de la jurisdicción de la Escuela Naval.
3. Verificar el cumplimiento de cupos máximos de acompañantes y fechas autorizadas de ingreso.

Sus datos no serán transferidos a terceros con fines comerciales ni divulgados fuera del marco de la operación de seguridad del evento. Como titular, usted tiene derecho a conocer, actualizar y rectificar sus datos personales.`,
  aviso_actualizado_en: "2026-01-01T00:00:00.000Z",
  vocabulario: {
    participante: {
      singular: "deportista",
      plural: "deportistas",
      genero: "m",
      titulo: "Deportista",
      titulo_plural: "Deportistas",
      sinonimo: "atleta",
      sinonimo_plural: "atletas",
    },
    entidad: {
      singular: "escuela",
      plural: "escuelas",
      genero: "f",
      titulo: "Escuela",
      titulo_plural: "Escuelas",
      sinonimo: "institución militar",
      sinonimo_plural: "instituciones",
    },
    visitante: {
      singular: "visitante",
      plural: "visitantes",
      genero: "m",
      titulo: "Visitante",
      titulo_plural: "Visitantes",
      sinonimo: "acompañante",
      sinonimo_plural: "acompañantes",
    },
    parentescos: ["Familiar", "Amigo"],
  },
  flag_marca_dinamica: false,
  actualizado_por: null,
  actualizado_en: "2026-01-01T00:00:00.000Z",
};
