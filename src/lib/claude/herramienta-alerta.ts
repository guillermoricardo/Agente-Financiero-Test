import type Anthropic from '@anthropic-ai/sdk';

// Fase 11 · R11. Igual que guardar_plan (Fase 8) obliga a las 8 secciones
// fijas, esta herramienta obliga a que la redacción de la alerta de mercado
// salga en dos textos separados y estructurados — nunca un texto libre que
// el redactor podría mezclar entre destinatarios distintos (Marta ve más
// detalle técnico; el cliente, solo lo que le importa a él).
export const HERRAMIENTA_GUARDAR_ALERTA: Anthropic.Tool = {
  name: 'guardar_alerta_mercado',
  description:
    'Guarda los dos mensajes de la alerta de cambio de banda, ya traducidos ' +
    'del JSON de revaluación. Llámala UNA sola vez, con los dos mensajes completos.',
  input_schema: {
    type: 'object',
    properties: {
      mensajeMarta: {
        type: 'string',
        description:
          'Mensaje para la asesora: qué cliente, qué banda tenía y cuál tiene ahora, con la probabilidad de cada una y de dónde sale el cambio (rendimiento de mercado observado). Tono factual, sin recomendar ninguna acción concreta — es una señal para que ella decida si hay que hablar con el cliente.',
      },
      mensajeCliente: {
        type: 'string',
        description:
          'Mensaje para el cliente: en llano, sin jerga, explicando que el mercado se movió y cómo cambió la probabilidad calculada de llegar a su meta. Nunca sugiere una acción concreta ("vende", "compra más", "cambia tu cartera"): remite a hablar con su asesora. Incluye siempre, en una frase, que es orientación educativa y no una gestión activa de su dinero.',
      },
    },
    required: ['mensajeMarta', 'mensajeCliente'],
  },
};
