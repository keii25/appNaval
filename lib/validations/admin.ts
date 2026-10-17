// lib/validations/admin.ts — Validaciones Zod para el módulo de Administración
import { z } from "zod";

export const escuelaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre de la escuela debe tener al menos 3 caracteres.")
    .max(120, "El nombre de la escuela no puede superar los 120 caracteres."),
  activa: z.boolean().default(true),
});

export const editarEscuelaSchema = z.object({
  id: z.string().uuid("Identificador de escuela inválido."),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre de la escuela debe tener al menos 3 caracteres.")
    .max(120, "El nombre de la escuela no puede superar los 120 caracteres.")
    .optional(),
  activa: z.boolean().optional(),
});

export const usuarioStaffSchema = z.object({
  cedula: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "La cédula debe contener solo números (entre 6 y 12 dígitos)."),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre completo debe tener al menos 3 caracteres.")
    .max(100, "El nombre no puede exceder 100 caracteres."),
  unidad: z
    .string()
    .trim()
    .min(2, "La dependencia o unidad es requerida.")
    .default("Atención y Registro"),
  rol: z.enum(["auxiliar", "porteria"], {
    errorMap: () => ({ message: "El rol debe ser 'auxiliar' o 'porteria'." }),
  }),
  debe_cambiar_clave: z.boolean().default(false),
});

export const editarUsuarioStaffSchema = z.object({
  id: z.string().uuid("Identificador de usuario inválido."),
  nombre: z.string().trim().min(3, "El nombre completo debe tener al menos 3 caracteres.").max(100).optional(),
  cedula: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "La cédula debe contener solo números (entre 6 y 12 dígitos).")
    .optional(),
  unidad: z.string().trim().min(2, "La dependencia debe tener al menos 2 caracteres.").optional(),
  activo: z.boolean().optional(),
  debe_cambiar_clave: z.boolean().optional(),
});

export const resetClaveSchema = z.object({
  userId: z.string().uuid("Identificador de usuario inválido."),
  debe_cambiar_clave: z.boolean().default(false),
});

export const configuracionAdminSchema = z.object({
  limite_visitantes: z
    .number()
    .int("El límite debe ser un número entero.")
    .min(1, "El límite mínimo es 1.")
    .max(50, "El límite máximo es 50."),
  fecha_limite: z.string().nullable().optional(),
});
