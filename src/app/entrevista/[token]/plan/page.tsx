import { notFound } from 'next/navigation';
import Link from 'next/link';
import type Anthropic from '@anthropic-ai/sdk';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { claude, MODELO_ENTREVISTA } from '@/lib/claude/cliente';
import { HERRAMIENTA_GUARDAR_PLAN } from '@/lib/claude/herramienta-plan';
import { construirPromptPlan } from '@/lib/claude/prompt-plan';
import { construirMarkdownPlan, DESCARGO_LITERAL, type SeccionesPlan } from '@/lib/plan/construir-markdown';
import type { AnalisisResultado } from '@/lib/analisis/generar-analisis';
import PlanCliente from '@/components/PlanCliente';

// Fase 8 · "El plan en cristiano". docs/user-flows.md § Flujo 1:
// Confirmación → Cálculo → Plan. El cálculo (Fase 7) ya pasó, en la propia
// ruta de confirmar. Esta página es el paso "Plan": la primera vez que
// alguien la visita, redacta el plan con el modelo a partir del JSON de
// `analisis` (nunca antes — no tiene sentido gastar una llamada al modelo
// si nadie va a leer el plan) y lo guarda; las siguientes visitas solo lo
// leen. El propio render de la página, mientras espera la llamada al
// modelo, ES la "pantalla de espera" que pide user-flows.md — no hace
// falta una ruta ni un estado de carga aparte.
export default async function PlanEntrevista({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: entrevista } = await supabaseServidor
    .from('entrevistas')
    .select('id, cliente_id, estado, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    notFound();
  }

  if (new Date(entrevista.expira_en) < new Date()) {
    return <Aviso titulo="Este enlace ya caducó">Las entrevistas duran 30 días. Empieza una nueva desde el inicio.</Aviso>;
  }

  if (entrevista.estado !== 'completada' || !entrevista.cliente_id) {
    return (
      <Aviso titulo="Todavía no hay plan que ver">
        Primero hay que terminar y confirmar tu resumen.{' '}
        <Link href={`/entrevista/${token}`} className="underline">
          Volver a la entrevista
        </Link>
        .
      </Aviso>
    );
  }

  const { data: cliente } = await supabaseServidor
    .from('clientes')
    .select('nombre')
    .eq('id', entrevista.cliente_id)
    .maybeSingle();
  const nombreCliente = cliente?.nombre ?? '';

  const { data: fichas } = await supabaseServidor
    .from('fichas')
    .select('id')
    .eq('entrevista_id', entrevista.id)
    .order('version', { ascending: false })
    .limit(1);
  const fichaId = fichas?.[0]?.id as string | undefined;

  if (!fichaId) {
    return <Aviso titulo="Todavía no hay plan que ver">Primero hay que terminar y confirmar tu resumen.</Aviso>;
  }

  const { data: analisisFilas } = await supabaseServidor
    .from('analisis')
    .select('id, resultado')
    .eq('ficha_id', fichaId)
    .order('calculado_en', { ascending: false })
    .limit(1);
  const analisisFila = analisisFilas?.[0];

  if (!analisisFila) {
    return (
      <Aviso titulo="Estamos calculando tu diagnóstico">
        Dale unos segundos y recarga esta página.
      </Aviso>
    );
  }

  const { data: planesExistentes } = await supabaseServidor
    .from('planes')
    .select('secciones, markdown')
    .eq('analisis_id', analisisFila.id)
    .order('generado_en', { ascending: false })
    .limit(1);

  let plan = planesExistentes?.[0] as { secciones: SeccionesPlan; markdown: string } | undefined;

  if (!plan) {
    const resultado = analisisFila.resultado as AnalisisResultado;

    let respuesta: Anthropic.Message;
    try {
      respuesta = await claude.messages.create({
        model: MODELO_ENTREVISTA,
        max_tokens: 2048,
        tools: [HERRAMIENTA_GUARDAR_PLAN],
        tool_choice: { type: 'tool', name: 'guardar_plan' },
        messages: [{ role: 'user', content: construirPromptPlan(resultado, nombreCliente) }],
      });
    } catch (error) {
      console.error('Error redactando el plan:', error);
      return <Aviso titulo="No se pudo preparar tu plan">Intenta recargar esta página en un momento.</Aviso>;
    }

    const bloquePlan = respuesta.content.find(
      (bloque): bloque is Anthropic.ToolUseBlock => bloque.type === 'tool_use' && bloque.name === 'guardar_plan',
    );

    if (!bloquePlan) {
      return <Aviso titulo="No se pudo preparar tu plan">Intenta recargar esta página en un momento.</Aviso>;
    }

    const secciones = bloquePlan.input as SeccionesPlan;
    const markdown = construirMarkdownPlan(nombreCliente, secciones);

    const { data: planNuevo, error: errorPlan } = await supabaseServidor
      .from('planes')
      .insert({ analisis_id: analisisFila.id, secciones, markdown, descargo: DESCARGO_LITERAL })
      .select('secciones, markdown')
      .single();

    if (errorPlan || !planNuevo) {
      console.error('No se pudo guardar el plan:', errorPlan);
      return <Aviso titulo="No se pudo guardar tu plan">Intenta recargar esta página en un momento.</Aviso>;
    }

    plan = planNuevo as { secciones: SeccionesPlan; markdown: string };
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-8">
      <PlanCliente nombreCliente={nombreCliente} secciones={plan.secciones} markdown={plan.markdown} />
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">{titulo}</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">{children}</p>
      </div>
    </div>
  );
}
