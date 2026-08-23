import type { AnalisisResultado } from '@/lib/analisis/generar-analisis';

// Visualización 4 de 4: "Prioridades de R1 — checklist del orden del
// ahorro, con lo cumplido marcado" (docs/design-system.md).
// docs/criterio/reglas-recomendacion.md § R1, orden estricto de 5 pasos.
//
// El paso 1 ("cuotas mínimas al día") no tiene un dato propio en la
// entrevista — nunca se pregunta si hay impagos — así que se marca cumplido
// por defecto: no hay ninguna señal en contra, y R9 solo pide prudencia
// cuando el propio dato es la fuente de la duda, no aquí. El paso 5 se
// marca cumplido si hay margen propuesto para invertir más. Es una lectura
// propia de esta fase, no un cálculo del motor — documentada en el
// changelog, no en reglas-recomendacion.md.
export default function ChecklistR1({ resultado }: { resultado: AnalisisResultado }) {
  const { situacionActual, proyeccion } = resultado;
  const propuesta = proyeccion?.aportacionPropuesta.propuesta;
  const hayMargenParaInvertir =
    typeof propuesta === 'number' ? propuesta > 0 : Array.isArray(propuesta) ? propuesta[1] > 0 : false;

  const pasos = [
    {
      etiqueta: 'Cuotas mínimas de todas las deudas al día',
      cumplido: true,
      nota: 'La entrevista no pregunta por impagos: se asume al día salvo indicación contraria.',
    },
    {
      etiqueta: 'Colchón inicial de 1 mes de gastos',
      cumplido: (situacionActual.colchonMeses ?? 0) >= 1,
      nota: `Colchón actual: ${situacionActual.colchonMeses ?? 'sin dato'} mes(es).`,
    },
    {
      etiqueta: 'Deudas caras canceladas',
      cumplido: !situacionActual.deudas.hayDeudaCara,
      nota: situacionActual.deudas.hayDeudaCara
        ? `Hay deuda con TAE por encima del umbral (> 7 %).`
        : 'Sin deuda cara detectada.',
    },
    {
      etiqueta: `Fondo de emergencia completo (${situacionActual.colchonObjetivoMeses[0]}–${situacionActual.colchonObjetivoMeses[1]} meses)`,
      cumplido: situacionActual.colchonCompleto,
      nota: situacionActual.colchonCompleto ? 'Objetivo de colchón alcanzado.' : 'Todavía no llega al mínimo del rango.',
    },
    {
      etiqueta: 'Margen para aumentar la inversión',
      cumplido: hayMargenParaInvertir,
      nota: proyeccion ? 'Calculado a partir de la aportación propuesta.' : 'Sin proyección calculada.',
    },
  ];

  return (
    <ul className="space-y-2.5">
      {pasos.map((paso, i) => (
        <li key={paso.etiqueta} className="flex items-start gap-2.5 text-sm">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              paso.cumplido ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {paso.cumplido ? '✓' : i + 1}
          </span>
          <span>
            <span className={paso.cumplido ? 'text-zinc-900' : 'text-zinc-500'}>{paso.etiqueta}</span>
            <span className="block text-xs text-zinc-400">{paso.nota}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
