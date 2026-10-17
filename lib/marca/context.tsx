"use client";

// lib/marca/context.tsx — Proveedor y hook de cliente para marca y vocabulario dinámico
import React, { createContext, useContext, useMemo } from "react";
import type {
  ConfiguracionMarca,
  TerminoVocabulario,
  VocabularioConfig,
  TextosLoginConfig,
} from "@/types/database";
import { DEFAULT_MARCA } from "./defaults";

export type TipoTermino = "participante" | "entidad" | "visitante";
export type FormaTermino = "singular" | "plural" | "titulo" | "titulo_plural";

export interface MarcaContextType {
  marca: ConfiguracionMarca;
  flagActivo: boolean;
  vocabulario: VocabularioConfig;
  textosLogin: TextosLoginConfig;
  parentescos: string[];
  t: (accionOPlantilla: string, termino?: TipoTermino, plural?: boolean) => string;
  getTermino: (termino: TipoTermino, forma?: FormaTermino) => string;
}

const MarcaContext = createContext<MarcaContextType | null>(null);

function concordar(
  prefijo: string,
  termino: TerminoVocabulario,
  plural = false,
  capitalizar = true
): string {
  const esFemenino = termino.genero === "f";
  const sustantivo = plural ? termino.plural : termino.singular;

  let articuloOAdjetivo = "";

  switch (prefijo.toLowerCase()) {
    case "el":
    case "la":
      articuloOAdjetivo = plural
        ? esFemenino ? "las" : "los"
        : esFemenino ? "la" : "el";
      break;

    case "del":
    case "de la":
      articuloOAdjetivo = plural
        ? esFemenino ? "de las" : "de los"
        : esFemenino ? "de la" : "del";
      break;

    case "al":
    case "a la":
      articuloOAdjetivo = plural
        ? esFemenino ? "a las" : "a los"
        : esFemenino ? "a la" : "al";
      break;

    case "un":
    case "una":
      articuloOAdjetivo = plural
        ? esFemenino ? "unas" : "unos"
        : esFemenino ? "una" : "un";
      break;

    case "nuevo":
    case "nueva":
      articuloOAdjetivo = plural
        ? esFemenino ? "nuevas" : "nuevos"
        : esFemenino ? "nueva" : "nuevo";
      break;

    case "este":
    case "esta":
      articuloOAdjetivo = plural
        ? esFemenino ? "estas" : "estos"
        : esFemenino ? "esta" : "este";
      break;

    case "todos":
    case "todas":
      articuloOAdjetivo = esFemenino ? "Todas las" : "Todos los";
      break;

    case "otro":
    case "otra":
      articuloOAdjetivo = plural
        ? esFemenino ? "otras" : "otros"
        : esFemenino ? "otra" : "otro";
      break;

    default:
      articuloOAdjetivo = prefijo;
  }

  const resultado = `${articuloOAdjetivo} ${sustantivo}`.trim();
  if (capitalizar && resultado.length > 0) {
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  }
  return resultado;
}

export function MarcaProvider({
  children,
  initialMarca,
}: {
  children: React.ReactNode;
  initialMarca?: ConfiguracionMarca | null;
}) {
  const marca = initialMarca || DEFAULT_MARCA;
  const flagActivo = Boolean(marca.flag_marca_dinamica);

  const value = useMemo<MarcaContextType>(() => {
    const vocab = marca.vocabulario || DEFAULT_MARCA.vocabulario;

    const getTermino = (termino: TipoTermino, forma: FormaTermino = "singular"): string => {
      const cfg = vocab[termino] || DEFAULT_MARCA.vocabulario[termino];
      switch (forma) {
        case "plural":
          return cfg.plural;
        case "titulo":
          return cfg.titulo || cfg.singular.charAt(0).toUpperCase() + cfg.singular.slice(1);
        case "titulo_plural":
          return cfg.titulo_plural || cfg.plural.charAt(0).toUpperCase() + cfg.plural.slice(1);
        case "singular":
        default:
          return cfg.singular;
      }
    };

    const t = (
      accionOPlantilla: string,
      termino?: TipoTermino,
      plural = false
    ): string => {
      // 1. Acceso directo por palabra clave
      switch (accionOPlantilla) {
        case "participante":
          return getTermino("participante", "singular");
        case "participantes":
          return getTermino("participante", "plural");
        case "Participante":
          return getTermino("participante", "titulo");
        case "Participantes":
          return getTermino("participante", "titulo_plural");

        case "entidad":
          return getTermino("entidad", "singular");
        case "entidades":
          return getTermino("entidad", "plural");
        case "Entidad":
          return getTermino("entidad", "titulo");
        case "Entidades":
          return getTermino("entidad", "titulo_plural");

        case "visitante":
          return getTermino("visitante", "singular");
        case "visitantes":
          return getTermino("visitante", "plural");
        case "Visitante":
          return getTermino("visitante", "titulo");
        case "Visitantes":
          return getTermino("visitante", "titulo_plural");
      }

      // 2. Concordancia de plantillas
      if (termino && vocab[termino]) {
        const item = vocab[termino];
        switch (accionOPlantilla) {
          case "nuevo":
          case "nueva":
            return concordar("nuevo", item, plural, true);

          case "el":
          case "la":
            return concordar("el", item, plural, false);

          case "del":
          case "de_la":
            return concordar("del", item, plural, false);

          case "al":
          case "a_la":
            return concordar("al", item, plural, false);

          case "este":
          case "esta":
            return concordar("este", item, plural, false);

          case "todos":
          case "todas":
            return concordar("todos", item, true, true);

          case "padron":
            return `Padrón de ${item.plural}`;

          case "padron_titulo":
            return `Padrón de ${item.titulo_plural || item.plural}`;

          case "portal":
            return `Portal del ${item.titulo || item.singular}`;

          case "no_encontrados":
            return `No se encontraron ${item.plural}`;

          case "sin_registros":
            return `No hay ${item.plural} registrados`;

          case "buscar_placeholder":
            return `Buscar por documento o nombre de ${item.singular}...`;

          case "registrar_nuevo":
            return `Registrar ${concordar("nuevo", item, false, false)}`;

          case "editar":
            return `Editar Datos ${concordar("del", item, false, false)}`;

          default:
            return `${accionOPlantilla} ${plural ? item.plural : item.singular}`;
        }
      }

      return accionOPlantilla;
    };

    return {
      marca,
      flagActivo,
      vocabulario: vocab,
      textosLogin: marca.textos_login || DEFAULT_MARCA.textos_login,
      parentescos: vocab.parentescos || DEFAULT_MARCA.vocabulario.parentescos,
      t,
      getTermino,
    };
  }, [marca, flagActivo]);

  return <MarcaContext.Provider value={value}>{children}</MarcaContext.Provider>;
}

export function useLabels(): MarcaContextType {
  const context = useContext(MarcaContext);
  if (!context) {
    // Fallback pasivo seguro si se llama fuera de Provider (nunca crash)
    return {
      marca: DEFAULT_MARCA,
      flagActivo: false,
      vocabulario: DEFAULT_MARCA.vocabulario,
      textosLogin: DEFAULT_MARCA.textos_login,
      parentescos: DEFAULT_MARCA.vocabulario.parentescos,
      t: (clave) => clave,
      getTermino: (termino) => DEFAULT_MARCA.vocabulario[termino]?.singular || termino,
    };
  }
  return context;
}

export function useMarca(): MarcaContextType {
  return useLabels();
}
