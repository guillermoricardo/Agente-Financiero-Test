import type { ResultadoRevaluacion } from '@/lib/mercado/revaluar';

// Fase 11 · R11. Mismo principio que construir-prompt-plan.ts: el modelo
// traduce un JSON ya calculado, nunca inventa ni calcula un número. Aquí
// además hay un límite extra propio de esta regla: nunca sugerir una
// acción concreta ni nombrar un producto o índice — ni siquiera los que
// aparecen como claves internas ("renta_variable", no un ticker) del JSON.
export function construirPromptAlerta(
  resultado: ResultadoRevaluacion,
  nombreCliente: string,
  objetivoDescripcion: string,
): string {
  const direccion =
    resultado.probabilidadNueva! > resultado.probabilidadAnterior!
      ? 'MEJORÓ (la probabilidad subió)'
      : 'EMPEORÓ (la probabilidad bajó)';

  return `Eres el redactor de una alerta de mercado para ${nombreCliente || 'este cliente'}, cuya meta es: "${objetivoDescripcion || '(sin descripción)'}".

# Qué pasó
El sistema recalcula cada mañana la probabilidad de que este cliente llegue a su meta, usando el rendimiento real de mercado desde el último cálculo. Hoy esa probabilidad cruzó de banda: ${direccion}.

- Banda anterior: "${resultado.bandaAnterior}" (probabilidad ${(resultado.probabilidadAnterior! * 100).toFixed(1)} %)
- Banda nueva: "${resultado.bandaNueva}" (probabilidad ${(resultado.probabilidadNueva! * 100).toFixed(1)} %)

# La regla que nunca se rompe
CADA CIFRA que escribas tiene que estar literalmente en el JSON de abajo. Nunca calcules, nunca inventes un número. Nunca nombres un producto, entidad, índice o ticker concreto — ni siquiera los que veas como claves internas del JSON ("renta_variable", "renta_fija", "oro" son categorías, no productos). Nunca sugieras una acción concreta ("vende", "compra más", "cambia tu cartera"): esto es una alerta informativa, no una gestión activa de la cartera de nadie — el mensaje al cliente remite siempre a hablar con su asesora, y menciona en una frase que es orientación educativa, no asesoramiento regulado. Nunca subas el nivel de riesgo ni sugieras hacerlo.

# JSON de la revaluación (única fuente de cifras — no hay otra)
\`\`\`json
${JSON.stringify(resultado, null, 2)}
\`\`\`

Llama a \`guardar_alerta_mercado\` una sola vez, con los dos mensajes completos.`;
}
