import { crearClienteSesion } from '@/lib/supabase/cliente-sesion';
import TablaListado from '@/components/panel/TablaListado';
import type { FilaListado } from '@/lib/panel/tipos';

// Fase 9 · Listado del panel (docs/user-flows.md § Flujo 2, paso 2). Lee de
// la vista `panel_listado` (supabase/migrations/0002_panel_vista_listado.sql)
// con el cliente de sesión — no el de service role — así que si por lo que
// sea la sesión no está en `asesores`, RLS devuelve cero filas en vez de
// filtrar aquí "a mano".
export default async function ListadoPanel() {
  const supabase = await crearClienteSesion();

  const { data: filas, error } = await supabase
    .from('panel_listado')
    .select('*')
    .order('completada_en', { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm leading-6 text-red-700 shadow-sm">
        No se pudo cargar el listado: {error.message}
      </p>
    );
  }

  // Fase 11 · qué análisis del listado tienen al menos una alerta de mercado
  // (R11), para marcarlos con una señal. No distingue "vista"/"no vista"
  // todavía: eso queda para cuando haga falta de verdad.
  const analisisIds = ((filas as FilaListado[]) ?? []).map((f) => f.analisis_id).filter((id): id is string => id !== null);
  const { data: alertas } = await supabase.from('alertas_mercado').select('analisis_id').in('analisis_id', analisisIds);
  const analisisConAlerta = new Set((alertas ?? []).map((a) => a.analisis_id as string));

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900">Tus leads</h1>
      <p className="mt-1 text-sm leading-6 text-zinc-600">
        Ordenado por banda de probabilidad: arriba, quien más necesita que le
        llames.
      </p>
      <div className="mt-6">
        <TablaListado filas={(filas as FilaListado[]) ?? []} analisisConAlerta={analisisConAlerta} />
      </div>
    </div>
  );
}
