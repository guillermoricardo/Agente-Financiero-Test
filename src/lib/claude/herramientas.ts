import type Anthropic from '@anthropic-ai/sdk';
import { CLAVES_DATO } from './ficha-entrevista';

// docs/architecture.md § "Los datos se extraen turno a turno" pide que la
// captura estructurada pase por herramientas, no por parsear el texto de la
// conversación después. guardar_contacto lo aplica al nombre y el correo
// (Fase 4); guardar_dato lo aplica a las 8 variables financieras (Fase 5).
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

// Fase 5. Las claves son el enum de docs/criterio/plantilla-entrevista.md
// (mismos nombres que docs/data-model.md § "El contrato de la ficha" y
// docs/criterio/instrucciones-motor.md §2 — no se renombran). La traducción
// a los campos camelCase del tipo `Ficha` de src/lib/motor/ficha.ts vive en
// src/lib/claude/ficha-entrevista.ts, no aquí: esta herramienta solo declara
// el contrato que ve el modelo.
export const HERRAMIENTA_GUARDAR_DATO: Anthropic.Tool = {
  name: 'guardar_dato',
  description:
    'Guarda UN dato de la ficha financiera en el momento exacto en que lo ' +
    'captures — no esperes a terminar toda la entrevista. Llámala una vez ' +
    'por cada dato, incluso si llega fuera de orden (captura al vuelo): si ' +
    'el cliente menciona algo de un bloque futuro antes de tiempo, guárdalo ' +
    'igual y no lo vuelvas a preguntar cuando llegues a ese bloque. La ' +
    'etiqueta importa tanto como el valor: "confirmado" es un dato que el ' +
    'cliente dio con claridad; "estimado" es un dato que salió de ofrecerle ' +
    'rangos o de una aproximación explícita suya; "pendiente" es que se ' +
    'preguntó, hubo como mucho un rebote, y sigue sin haber dato claro. ' +
    'Para deudas, el valor es un objeto: {"tipo":"ninguna"} si no tiene, ' +
    '{"tipo":"lista","deudas":[{"tipo":"...","saldo":n|null,"cuota":n|null,' +
    '"interes":n|null}]} si las detalla (usa null en lo que no haya dado, ' +
    'nunca inventes una cifra), o {"tipo":"pendiente","motivo":' +
    '"negativa_cliente"} con etiqueta "pendiente" si se niega a hablar del ' +
    'tema. Si un dato queda incompleto de un modo que afecta al diagnóstico ' +
    '(por ejemplo: dio la cuota y el interés de la hipoteca pero no el ' +
    'saldo pendiente), además de guardar lo que sí tienes llama otra vez a ' +
    'esta herramienta con clave "pendientes" y el valor como una frase ' +
    'corta describiendo qué falta — nunca inventes el dato que falta para ' +
    'rellenar el hueco. Llamar a esta herramienta es interno: nunca lo ' +
    'anuncies ni lo confirmes por escrito al cliente.',
  input_schema: {
    type: 'object',
    properties: {
      clave: {
        type: 'string',
        enum: CLAVES_DATO,
        description:
          'Qué variable de la ficha estás guardando, o "pendientes" para ' +
          'anotar una nota de algo que falta sin forzarlo a una variable.',
      },
      valor: {
        description:
          'El valor tal cual lo darías al motor: número para cifras y ' +
          'plazos, texto para descripciones, "fijos"/"variables" para ' +
          'ingresos_estabilidad, "vender"/"aguantar"/"comprar" para ' +
          'riesgo_escenario, "conservador"/"moderado"/"dinamico" para ' +
          'riesgo_perfil_derivado, el objeto de deudas descrito arriba ' +
          'para deudas, o una frase corta si la clave es "pendientes".',
      },
      etiqueta: {
        type: 'string',
        enum: ['confirmado', 'estimado', 'pendiente'],
        description:
          'Calidad del dato. Obligatoria salvo cuando clave es "pendientes".',
      },
      cita: {
        type: 'string',
        description: 'Palabras textuales del cliente que respaldan el valor, si ayudan a justificarlo.',
      },
      supuesto: {
        type: 'string',
        description:
          'Si el cliente dio un rango y elegiste un extremo prudente, qué extremo y por qué (ej: "eligió el extremo bajo del rango porque dudaba").',
      },
    },
    required: ['clave', 'valor'],
  },
};
