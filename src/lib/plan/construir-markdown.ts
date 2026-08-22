// Fase 8 · "El plan en cristiano". Parte pura y determinista (a diferencia
// de la redacción del modelo): ensambla las 7 secciones que devuelve
// `guardar_plan` más la sección 8, que es SIEMPRE este texto literal —
// docs/criterio/instrucciones-agente-v2.md § Fase 4, punto 8, y CLAUDE.md
// § "Qué NO hacer": "no omitas el descargo... en ningún plan emitido". Al no
// pedírselo al modelo, el descargo nunca puede faltar ni salir reformulado.

export const DESCARGO_LITERAL =
  'Esto es orientación educativa hecha con tus números y supuestos prudentes, ' +
  'no asesoramiento financiero regulado ni una promesa de rentabilidad. Para ' +
  'ejecutar (elegir productos concretos, temas fiscales), contrasta con un ' +
  'asesor autorizado.';

export interface SeccionesPlan {
  tuMeta: string;
  tuFotoDeHoy: string;
  llegasSiSiguesAsi: string;
  tuPlanPasoAPaso: string;
  tusOpciones: string;
  deCada100Futuros: string;
  loQueMeFaltaSaber: string;
}

const TITULOS: [keyof SeccionesPlan, string][] = [
  ['tuMeta', '1. Tu meta'],
  ['tuFotoDeHoy', '2. Tu foto de hoy'],
  ['llegasSiSiguesAsi', '3. ¿Llegas si sigues así?'],
  ['tuPlanPasoAPaso', '4. Tu plan, paso a paso'],
  ['tusOpciones', '5. Si los números no salen: tus opciones'],
  ['deCada100Futuros', '6. De cada 100 futuros posibles…'],
  ['loQueMeFaltaSaber', '7. Lo que me falta saber'],
];

/** Ensambla el markdown completo del plan a partir de las 7 secciones del modelo + el descargo fijo. */
export function construirMarkdownPlan(nombreCliente: string, secciones: SeccionesPlan): string {
  const partes = [`# Tu plan financiero${nombreCliente ? ` — ${nombreCliente}` : ''}`, ''];

  for (const [clave, titulo] of TITULOS) {
    partes.push(`## ${titulo}`, '', secciones[clave].trim(), '');
  }

  partes.push('## 8. La letra pequeña honesta', '', DESCARGO_LITERAL);

  return partes.join('\n');
}
