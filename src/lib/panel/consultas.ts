import 'server-only';
import { crearClienteSesion } from '@/lib/supabase/cliente-sesion';
import type { AnalisisResultado } from '@/lib/analisis/generar-analisis';
import type { SeccionesPlan } from '@/lib/plan/construir-markdown';
import type { FichaParcial } from '@/lib/claude/ficha-entrevista';

// Fase 9 · Consultas compartidas entre las tres vistas de la ficha del
// cliente (Diagnóstico, Ficha cruda, Plan). Cada página vuelve a llamar a
// las que necesita — es una duplicación consciente (mismo patrón que
// `entrevista/[token]/plan/page.tsx` en la Fase 8): las consultas son
// baratas y así cada vista sigue siendo independiente de las demás.

export interface ContextoCliente {
  entrevistaId: string;
  entrevistaEstado: string;
  clienteNombre: string;
  clienteEmail: string;
}

export async function obtenerContextoCliente(entrevistaId: string): Promise<ContextoCliente | null> {
  const supabase = await crearClienteSesion();

  const { data: entrevista } = await supabase
    .from('entrevistas')
    .select('id, estado, cliente_id')
    .eq('id', entrevistaId)
    .maybeSingle();

  if (!entrevista || !entrevista.cliente_id) return null;

  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, email')
    .eq('id', entrevista.cliente_id)
    .maybeSingle();

  if (!cliente) return null;

  return {
    entrevistaId: entrevista.id,
    entrevistaEstado: entrevista.estado,
    clienteNombre: cliente.nombre,
    clienteEmail: cliente.email,
  };
}

export interface FichaYAnalisis {
  fichaId: string;
  datos: FichaParcial;
  pendientes: string[];
  analisisId: string | null;
  resultado: AnalisisResultado | null;
}

export async function obtenerFichaYAnalisis(entrevistaId: string): Promise<FichaYAnalisis | null> {
  const supabase = await crearClienteSesion();

  const { data: fichas } = await supabase
    .from('fichas')
    .select('id, datos, pendientes')
    .eq('entrevista_id', entrevistaId)
    .order('version', { ascending: false })
    .limit(1);

  const ficha = fichas?.[0];
  if (!ficha) return null;

  const { data: analisisFilas } = await supabase
    .from('analisis')
    .select('id, resultado')
    .eq('ficha_id', ficha.id)
    .order('calculado_en', { ascending: false })
    .limit(1);

  const analisisFila = analisisFilas?.[0];

  return {
    fichaId: ficha.id,
    datos: ficha.datos as FichaParcial,
    pendientes: (ficha.pendientes as string[]) ?? [],
    analisisId: analisisFila?.id ?? null,
    resultado: (analisisFila?.resultado as AnalisisResultado) ?? null,
  };
}

export interface PlanGuardado {
  secciones: SeccionesPlan;
  markdown: string;
  generadoEn: string;
}

export async function obtenerPlan(analisisId: string): Promise<PlanGuardado | null> {
  const supabase = await crearClienteSesion();

  const { data: planes } = await supabase
    .from('planes')
    .select('secciones, markdown, generado_en')
    .eq('analisis_id', analisisId)
    .order('generado_en', { ascending: false })
    .limit(1);

  const plan = planes?.[0];
  if (!plan) return null;

  return {
    secciones: plan.secciones as SeccionesPlan,
    markdown: plan.markdown as string,
    generadoEn: plan.generado_en as string,
  };
}
