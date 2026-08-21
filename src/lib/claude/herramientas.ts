import type Anthropic from '@anthropic-ai/sdk';

// Fase 4: la única herramienta es guardar_contacto. docs/architecture.md §
// "Los datos se extraen turno a turno" pide que la captura estructurada pase
// por herramientas, no por parsear el texto de la conversación después — el
// mismo principio que en la Fase 5 se aplica a `guardar_dato` para las 8
// variables financieras, aquí se aplica al nombre y el correo.
export const HERRAMIENTA_GUARDAR_CONTACTO: Anthropic.Tool = {
  name: 'guardar_contacto',
  description:
    'Guarda el nombre y el correo del cliente en cuanto los tengas ambos con ' +
    'claridad. Llámala una sola vez por entrevista, justo después de la ' +
    'apertura y antes de empezar el bloque 1 (el objetivo). No la llames si ' +
    'todavía falta uno de los dos datos.',
  input_schema: {
    type: 'object',
    properties: {
      nombre: {
        type: 'string',
        description: 'Nombre con el que se presentó el cliente.',
      },
      email: {
        type: 'string',
        description: 'Correo electrónico que dio el cliente.',
      },
    },
    required: ['nombre', 'email'],
  },
};
