import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { claude, MODELO_ENTREVISTA } from '@/lib/claude/cliente';
import { HERRAMIENTA_GUARDAR_ALERTA } from '@/lib/claude/herramienta-alerta';
import { construirPromptAlerta } from '@/lib/claude/prompt-alerta';
import { enviarAlertaMercado } from '@/lib/correo/plantillas-alerta';
import type { AnalisisResultado } from '@/lib/analisis/generar-analisis';
import { CLASES_MERCADO, type ClaseMercado } from '@/lib/mercado/proxies';
import { actualizarCachePrecios, cierresDesde } from '@/lib/mercado/precios-cache';
import { rendimientoDesdePrimerCierre } from '@/lib/mercado/rendimiento';
import { revaluarBanda, type RendimientosPorClase } from '@/lib/mercado/revaluar';
import type { BandaProbabilidad } from '@/lib/motor/supuestos';

// Fase 11 · R11 de docs/criterio/reglas-recomendacion.md. Disparada a diario
// por Vercel Cron (ver vercel.json). Recorre cada cliente con diagnóstico
// `completo`, revalúa su banda con el mercado real, y avisa si cambió.
//
// Nunca calcula "de cabeza": todo número sale de src/lib/mercado/revaluar.ts
// (código puro, reutiliza el motor). El modelo solo redacta el texto de la
// alerta a partir de ese resultado ya calculado — mismo principio que el
// plan (Fase 8).

export const maxDuration = 300;

interface CandidatoFila {
  cliente_id: string;
  cliente_nombre: string;
  cliente_email: string;
  objetivo_descripcion: string | null;
  analisis_id: string;
  calculado_en: string;
}

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  return request.headers.get('authorization') === `Bearer ${secreto}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hoy = new Date();
  const resumen = { revisados: 0, alertas: 0, sinDatosDeMercado: 0, errores: 0 };

  // 1 · Candidatos: clientes con diagnóstico completo, vía panel_listado
  // (ya resuelve "ficha y análisis más recientes por entrevista" — Fase 9).
  const { data: filas, error: errorListado } = await supabaseServidor
    .from('panel_listado')
    .select('cliente_id, cliente_nombre, cliente_email, objetivo_descripcion, analisis_id, calculado_en')
    .eq('entrevista_estado', 'completada')
    .eq('analisis_modo', 'completo')
    .not('analisis_id', 'is', null);

  if (errorListado) {
    console.error('Vigilancia de mercado: no se pudo leer panel_listado:', errorListado);
    return NextResponse.json({ error: 'No se pudo leer el listado de clientes' }, { status: 500 });
  }

  const candidatos = (filas ?? []) as CandidatoFila[];
  if (candidatos.length === 0) {
    return NextResponse.json({ ...resumen, mensaje: 'Sin clientes en modo completo que revisar hoy.' });
  }

  // 2 · Actualizar la caché de precios una sola vez, cubriendo desde el
  // análisis más antiguo de todos los candidatos hasta hoy.
  const fechaMasAntigua = new Date(Math.min(...candidatos.map((c) => new Date(c.calculado_en).getTime())));
  const clasesDisponibles = new Set<ClaseMercado>();

  for (const clase of CLASES_MERCADO) {
    try {
      await actualizarCachePrecios(clase, fechaMasAntigua, hoy);
      clasesDisponibles.add(clase);
    } catch (error) {
      // R9: sin dato fiable, no se inventa un rendimiento para esta clase.
      // Los clientes cuya cartera pesa en ella se saltan hoy (ver abajo).
      console.error(`Vigilancia de mercado: fuente de precios falló para "${clase}":`, error);
    }
  }

  // 3 · Los `resultado` completos de todos los candidatos, en una sola consulta.
  const { data: analisisFilas, error: errorAnalisis } = await supabaseServidor
    .from('analisis')
    .select('id, resultado')
    .in(
      'id',
      candidatos.map((c) => c.analisis_id),
    );

  if (errorAnalisis) {
    console.error('Vigilancia de mercado: no se pudo leer analisis:', errorAnalisis);
    return NextResponse.json({ error: 'No se pudo leer los análisis' }, { status: 500 });
  }

  const resultadoPorAnalisisId = new Map<string, AnalisisResultado>(
    (analisisFilas ?? []).map((f) => [f.id as string, f.resultado as AnalisisResultado]),
  );

  for (const candidato of candidatos) {
    resumen.revisados += 1;
    try {
      const alertaGenerada = await procesarCandidato(candidato, resultadoPorAnalisisId, clasesDisponibles, hoy);
      if (alertaGenerada === 'alerta') resumen.alertas += 1;
      if (alertaGenerada === 'sin_datos') resumen.sinDatosDeMercado += 1;
    } catch (error) {
      resumen.errores += 1;
      console.error(`Vigilancia de mercado: error con el cliente ${candidato.cliente_id}:`, error);
    }
  }

  return NextResponse.json(resumen);
}

async function procesarCandidato(
  candidato: CandidatoFila,
  resultadoPorAnalisisId: Map<string, AnalisisResultado>,
  clasesDisponibles: Set<ClaseMercado>,
  hoy: Date,
): Promise<'alerta' | 'sin_cambio' | 'sin_datos' | 'no_aplica'> {
  const analisis = resultadoPorAnalisisId.get(candidato.analisis_id);
  if (!analisis || !analisis.cartera) return 'no_aplica';

  const pesos = analisis.cartera.pesos;
  const clasesRequeridas = CLASES_MERCADO.filter((clase) => (pesos[clase] ?? 0) > 0);
  const faltaAlguna = clasesRequeridas.some((clase) => !clasesDisponibles.has(clase));
  if (faltaAlguna) return 'sin_datos';

  const fechaAnalisis = new Date(candidato.calculado_en);

  const rendimientos: RendimientosPorClase = {};
  for (const clase of clasesRequeridas) {
    const cierres = await cierresDesde(clase, fechaAnalisis);
    const rendimiento = rendimientoDesdePrimerCierre(cierres);
    if (rendimiento === null) return 'sin_datos';
    rendimientos[clase] = rendimiento;
  }

  // Última alerta ya emitida para este análisis, si existe: se compara
  // contra ella en vez de contra el análisis original (docs/data-model.md
  // § alertas_mercado — no se reabre el mismo aviso cada mañana).
  const { data: alertaPrevia } = await supabaseServidor
    .from('alertas_mercado')
    .select('banda_nueva, probabilidad_nueva')
    .eq('analisis_id', candidato.analisis_id)
    .order('detectada_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  const referencia = alertaPrevia
    ? { banda: alertaPrevia.banda_nueva as BandaProbabilidad, probabilidad: alertaPrevia.probabilidad_nueva as number }
    : undefined;

  const resultado = revaluarBanda(analisis, rendimientos, fechaAnalisis, hoy, referencia);
  if (!resultado.aplica || !resultado.cambioBanda) return 'sin_cambio';

  // Redacción: el modelo solo traduce el JSON ya calculado (nunca calcula).
  const respuesta: Anthropic.Message = await claude.messages.create({
    model: MODELO_ENTREVISTA,
    max_tokens: 1024,
    tools: [HERRAMIENTA_GUARDAR_ALERTA],
    tool_choice: { type: 'tool', name: 'guardar_alerta_mercado' },
    messages: [
      {
        role: 'user',
        content: construirPromptAlerta(resultado, candidato.cliente_nombre, candidato.objetivo_descripcion ?? ''),
      },
    ],
  });

  const bloque = respuesta.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'guardar_alerta_mercado',
  );
  if (!bloque) throw new Error('El modelo no devolvió la alerta redactada.');

  const { mensajeMarta, mensajeCliente } = bloque.input as { mensajeMarta: string; mensajeCliente: string };

  const emailMarta = process.env.EMAIL_ASESORA_ALERTAS;
  if (!emailMarta) throw new Error('Falta EMAIL_ASESORA_ALERTAS: no hay a quién avisar en el panel/correo de Marta.');

  const envio = await enviarAlertaMercado({
    emailMarta,
    nombreCliente: candidato.cliente_nombre,
    emailCliente: candidato.cliente_email,
    mensajeMarta,
    mensajeCliente,
  });

  const { error: errorInsert } = await supabaseServidor.from('alertas_mercado').insert({
    analisis_id: candidato.analisis_id,
    banda_anterior: resultado.bandaAnterior,
    banda_nueva: resultado.bandaNueva,
    probabilidad_anterior: resultado.probabilidadAnterior,
    probabilidad_nueva: resultado.probabilidadNueva,
    detalle: resultado.detalle,
    mensaje_marta: mensajeMarta,
    mensaje_cliente: mensajeCliente,
    enviado_marta_en: envio.enviadoMartaEn,
    enviado_cliente_en: envio.enviadoClienteEn,
  });

  if (errorInsert) throw new Error(`No se pudo guardar la alerta: ${errorInsert.message}`);

  return 'alerta';
}
