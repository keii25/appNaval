// lib/validations/deportista.ts — Esquemas de validación Zod para Deportistas
import { z } from "zod";

export const deportistaSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(3, "El nombre completo debe tener al menos 3 caracteres.")
    .max(120, "El nombre completo no puede superar los 120 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/, "El nombre solo puede contener letras y espacios."),
  cedula: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "El documento debe contener solo números (entre 6 y 12 dígitos)."),
  celular: z
    .string()
    .trim()
    .regex(/^3[0-9]{9}$/, "El celular debe iniciar por 3 y contener exactamente 10 dígitos (ej: 3001234567)."),
  escuela_id: z
    .string()
    .uuid("Debe seleccionar una institución militar/policial válida."),
  observaciones: z
    .string()
    .trim()
    .max(500, "Las observaciones no pueden exceder 500 caracteres.")
    .nullable()
    .optional(),
  autorizacion_datos: z.literal(true, {
    errorMap: () => ({
      message: "Es obligatorio marcar la autorización de tratamiento de datos personales (Ley 1581 de 2012).",
    }),
  }),
});

export const editarDeportistaSchema = z.object({
  id: z.string().uuid("Identificador de deportista inválido."),
  nombre_completo: z
    .string()
    .trim()
    .min(3, "El nombre completo debe tener al menos 3 caracteres.")
    .max(120, "El nombre completo no puede superar los 120 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/, "El nombre solo puede contener letras y espacios.")
    .optional(),
  cedula: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "El documento debe contener solo números (entre 6 y 12 dígitos).")
    .optional(),
  celular: z
    .string()
    .trim()
    .regex(/^3[0-9]{9}$/, "El celular debe iniciar por 3 y contener exactamente 10 dígitos.")
    .optional(),
  escuela_id: z
    .string()
    .uuid("Debe seleccionar una institución válida.")
    .optional(),
  observaciones: z
    .string()
    .trim()
    .max(500, "Las observaciones no pueden exceder 500 caracteres.")
    .nullable()
    .optional(),
});
