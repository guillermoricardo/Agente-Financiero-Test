/**
 * rendimiento.ts — Código puro: de una serie de cierres al rendimiento
 * observado entre el primero y el último. Sin red, sin fecha "de hoy"
 * implícita — recibe exactamente los datos con los que tiene que trabajar,
 * igual que src/lib/motor/calculos.ts.
 */

import type { Cierre } from './proveedor-precios';

/**
 * Rendimiento simple entre el cierre más antiguo y el más reciente de la
 * serie. `null` si no hay al menos dos puntos o si el primer cierre es
 * inválido — nunca se inventa un rendimiento con datos insuficientes (R9).
 */
export function rendimientoDesdePrimerCierre(cierres: readonly Cierre[]): number | null {
  if (cierres.length < 2) return null;

  const ordenados = [...cierres].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primero = ordenados[0].cierre;
  const ultimo = ordenados[ordenados.length - 1].cierre;

  if (!(primero > 0)) return null;
  return ultimo / primero - 1;
}
