// lib/validations/visitante.ts
import { z } from "zod";

/** Formato de placa colombiana: ABC123 o ABC12D */
const PLACA_RE = /^[A-Z]{3}[0-9]{2}[A-Z0-9]$/;

export const visitanteSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(120, "El nombre es demasiado largo"),

    parentesco: z.enum(["Familiar", "Amigo"], {
      errorMap: () => ({ message: "Selecciona Familiar o Amigo" }),
    }),

    tipo_documento: z.enum(["CC", "TI", "CE", "Pasaporte"], {
      errorMap: () => ({ message: "Tipo de documento inválido" }),
    }),

    numero_documento: z
      .string()
      .trim()
      .min(4, "El número de documento debe tener al menos 4 caracteres")
      .max(20, "El número de documento es demasiado largo")
      .regex(/^[a-zA-Z0-9\-]+$/, "El número de documento contiene caracteres inválidos"),

    tiene_vehiculo: z.boolean(),

    placa: z.string().trim().toUpperCase().nullable().optional(),

    modelo: z.string().trim().max(80, "El modelo es demasiado largo").nullable().optional(),

    fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),

    fecha_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    estado: z.enum(["Pendiente", "Aprobado", "Rechazado"]).optional(),
  })
  .superRefine((data, ctx) => {
    // Validar placa solo si tiene vehículo
    if (data.tiene_vehiculo) {
      if (!data.placa) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["placa"],
          message: "La placa es obligatoria cuando hay vehículo",
        });
      } else if (!PLACA_RE.test(data.placa)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["placa"],
          message: "Formato de placa inválido (ej: ABC123 o ABC12D)",
        });
      }

      if (!data.modelo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modelo"],
          message: "El modelo es obligatorio cuando hay vehículo",
        });
      }
    }

    // Validar fechas
    if (data.fecha_desde && data.fecha_hasta) {
      if (data.fecha_hasta < data.fecha_desde) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_hasta"],
          message: "La fecha hasta debe ser igual o posterior a la fecha desde",
        });
      }
    }
  });

export type VisitanteInput = z.infer<typeof visitanteSchema>;

// Schema para cambio de contraseña
export const cambiarClaveSchema = z
  .object({
    clave_nueva: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmar_clave: z.string(),
    cedula: z.string(), // se pasa para la validación "no igual a la cédula"
  })
  .refine((data) => data.clave_nueva !== data.cedula, {
    message: "La contraseña no puede ser igual a tu cédula",
    path: ["clave_nueva"],
  })
  .refine((data) => data.clave_nueva === data.confirmar_clave, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar_clave"],
  });

export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>;
