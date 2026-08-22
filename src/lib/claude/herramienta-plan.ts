import type Anthropic from '@anthropic-ai/sdk';

// Fase 8 · "El plan en cristiano". Igual que guardar_dato (Fase 5) obliga a
// una captura estructurada en vez de parsear texto suelto, esta herramienta
// obliga a que la redacción del plan salga en las 8 secciones fijas de
// docs/criterio/instrucciones-agente-v2.md § Fase 4 — nunca un texto libre
// que alguien tendría que trocear después. La sección 8 (la letra pequeña)
// NO se le pide al modelo: es un texto literal fijo en el código
// (`src/lib/plan/construir-markdown.ts`), para que el descargo nunca dependa
// de que el modelo lo redacte bien o se le olvide.
export const HERRAMIENTA_GUARDAR_PLAN: Anthropic.Tool = {
  name: 'guardar_plan',
  description:
    'Guarda las 7 secciones del plan financiero en lenguaje llano, ya ' +
    'traducidas del JSON de análisis. Llámala UNA sola vez, con las 7 ' +
    'secciones completas.',
  input_schema: {
    type: 'object',
    properties: {
      tuMeta: {
        type: 'string',
        description: 'Sección 1: la meta del cliente en sus propias palabras, con su cifra y su fecha.',
      },
      tuFotoDeHoy: {
        type: 'string',
        description:
          'Sección 2: 4-6 líneas — lo que entra, lo que sale, lo que sobra, lo que tiene y dónde, deudas, colchón. Solo hechos, en llano.',
      },
      llegasSiSiguesAsi: {
        type: 'string',
        description:
          'Sección 3: la respuesta honesta y directa a si llega a su meta, con el número que la sostiene. Si el modo no es "completo", explica con honestidad por qué todavía no se puede responder (qué falta o por qué quedó en suspenso) en vez de inventar una respuesta.',
      },
      tuPlanPasoAPaso: {
        type: 'string',
        description:
          'Sección 4: checklist accionable en el orden de R1 (cuotas al día, colchón, deudas caras, completar el fondo de emergencia, invertir), cada paso con su porqué en una frase. Los porcentajes de cartera SIEMPRE en formato "de cada 100 € que inviertas: X a bolsa mundial...". Si el modo no es "completo", no hay checklist ejecutable: explica en llano qué se necesita saber primero.',
      },
      tusOpciones: {
        type: 'string',
        description:
          'Sección 5: solo si la meta no es viable con la aportación sostenible. Nunca subas el riesgo para cuadrarla. Si no aplica (meta viable, o no hay datos para saberlo), dilo en una frase corta y sigue.',
      },
      deCada100Futuros: {
        type: 'string',
        description:
          'Sección 6: la probabilidad del Monte Carlo en palabras ("en X de cada 100 escenarios simulados llegarías..."). Si no hay un número de probabilidad en el JSON, dilo en una frase corta explicando por qué (meta no convertible, modo distinto de "completo", etc.) — nunca inventes un porcentaje.',
      },
      loQueMeFaltaSaber: {
        type: 'string',
        description:
          'Sección 7: los pendientes y datos estimados, y cómo cambiarían el plan si se confirman. Invita a dárselos. Si no hay pendientes, dilo en una frase.',
      },
    },
    required: [
      'tuMeta',
      'tuFotoDeHoy',
      'llegasSiSiguesAsi',
      'tuPlanPasoAPaso',
      'tusOpciones',
      'deCada100Futuros',
      'loQueMeFaltaSaber',
    ],
  },
};
