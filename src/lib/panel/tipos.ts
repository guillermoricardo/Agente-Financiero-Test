import type { BandaProbabilidad } from '@/lib/motor/supuestos';

// Fase 9 · Forma de una fila de la vista `panel_listado`
// (supabase/migrations/0002_panel_vista_listado.sql). Ninguna clave se
// renombra respecto a la columna SQL: es más fácil de auditar así.
export interface FilaListado {
  cliente_id: string;
  cliente_nombre: string;
  cliente_email: string;
  entrevista_id: string;
  entrevista_estado: 'en_curso' | 'pendiente_confirmacion' | 'completada' | 'abandonada';
  completada_en: string | null;
  ficha_id: string | null;
  objetivo_descripcion: string | null;
  objetivo_cifra: number | null;
  objetivo_plazo: number | null;
  perfil: 'conservador' | 'moderado' | 'dinamico' | null;
  tipo_de_meta: 'patrimonio' | 'renta_cartera' | 'renta_negocio' | 'mixta' | null;
  pendientes: string[] | null;
  analisis_id: string | null;
  analisis_modo: 'completo' | 'condicionado' | 'suspendido' | null;
  calculado_en: string | null;
  probabilidad_cumplimiento: number | null;
  banda: BandaProbabilidad | null;
}

// docs/design-system.md § Color: "La escala de R10 (Alta/Razonable/
// Frágil/Baja) es el único sitio donde se usa semáforo." Orden de mayor a
// menor probabilidad — el mismo de `BANDAS_PROBABILIDAD` en supuestos.ts.
export const ORDEN_BANDA: Record<BandaProbabilidad, number> = {
  Alta: 3,
  Razonable: 2,
  Frágil: 1,
  Baja: 0,
};

export const COLOR_BANDA: Record<BandaProbabilidad, string> = {
  Alta: 'bg-emerald-100 text-emerald-800',
  Razonable: 'bg-sky-100 text-sky-800',
  Frágil: 'bg-amber-100 text-amber-800',
  Baja: 'bg-red-100 text-red-800',
};

/**
 * Rango numérico para ordenar el listado de "quién necesita que le llame
 * primero" a "quién va mejor" (docs/user-flows.md § Flujo 2). Sin banda
 * (todavía no hay análisis, o quedó `suspendido`) se trata como lo más
 * urgente de revisar: es justo el caso en que Marta tiene menos información,
 * no menos motivo de atención. Decisión propia, no está en la documentación.
 */
export function rangoUrgencia(fila: FilaListado): number {
  if (fila.entrevista_estado !== 'completada') return -2;
  if (!fila.banda) return -1;
  return ORDEN_BANDA[fila.banda];
}

export const ETIQUETA_ESTADO: Record<FilaListado['entrevista_estado'], string> = {
  en_curso: 'En curso',
  pendiente_confirmacion: 'Sin confirmar',
  completada: 'Completada',
  abandonada: 'Abandonada',
};

export const ETIQUETA_MODO: Record<NonNullable<FilaListado['analisis_modo']>, string> = {
  completo: 'Completo',
  condicionado: 'Condicionado',
  suspendido: 'Suspendido',
};
