'use client';

import { DESCARGO_LITERAL, type SeccionesPlan } from '@/lib/plan/construir-markdown';

const TITULOS: [keyof SeccionesPlan, string][] = [
  ['tuMeta', '1. Tu meta'],
  ['tuFotoDeHoy', '2. Tu foto de hoy'],
  ['llegasSiSiguesAsi', '3. ¿Llegas si sigues así?'],
  ['tuPlanPasoAPaso', '4. Tu plan, paso a paso'],
  ['tusOpciones', '5. Si los números no salen: tus opciones'],
  ['deCada100Futuros', '6. De cada 100 futuros posibles…'],
  ['loQueMeFaltaSaber', '7. Lo que me falta saber'],
];

// Fase 8: se renderiza directamente desde `secciones` (el jsonb tipado que
// ya se guardó en `planes`), no reparseando el markdown — evita añadir una
// librería de Markdown solo para esto. El markdown completo se guarda
// igualmente para la descarga.
export default function PlanCliente({
  nombreCliente,
  secciones,
  markdown,
}: {
  nombreCliente: string;
  secciones: SeccionesPlan;
  markdown: string;
}) {
  function descargar() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'tu-plan-financiero.md';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900">
          {nombreCliente ? `Tu plan financiero, ${nombreCliente}` : 'Tu plan financiero'}
        </h1>
        <button
          type="button"
          onClick={descargar}
          className="shrink-0 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Descargar
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {TITULOS.map(([clave, titulo]) => (
          <section key={clave}>
            <h2 className="text-sm font-semibold text-zinc-900">{titulo}</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-7 text-zinc-700">{secciones[clave]}</p>
          </section>
        ))}

        <section className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">8. La letra pequeña honesta</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-zinc-600">{DESCARGO_LITERAL}</p>
        </section>
      </div>
    </div>
  );
}
