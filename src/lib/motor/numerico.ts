/**
 * numerico.ts — Utilidades numéricas con paridad exacta frente al motor Python.
 *
 * Python y JavaScript no redondean igual: `round()` de Python usa redondeo
 * bancario (los empates van al par: round(0.5) == 0, round(1.5) == 2) mientras
 * que `Math.round()` de JavaScript siempre sube (0.5 → 1). En un motor
 * financiero esa diferencia se propaga, así que aquí se replica el de Python.
 */

/** Redondeo bancario ("half to even"), como el `round()` de Python. */
export function redondear(x: number, decimales = 0): number {
  const factor = 10 ** decimales;
  const escalado = x * factor;
  const suelo = Math.floor(escalado);
  const resto = escalado - suelo;

  // La comparación es exacta a propósito: un empate solo cuenta como tal si el
  // double vale .5 exactamente, que es también el criterio de Python. Con
  // tolerancia difusa, valores como 1.5000000000000002 se tratarían como
  // empate y el redondeo divergiría del motor original.
  let redondeado: number;
  if (resto === 0.5) {
    redondeado = suelo % 2 === 0 ? suelo : suelo + 1;
  } else {
    redondeado = Math.round(escalado);
  }
  // El `+ 0` evita devolver -0, que rompe comparaciones estrictas en los tests.
  return redondeado / factor + 0;
}

/**
 * Percentil por interpolación lineal, el método por defecto de
 * `numpy.percentile`. Necesario para que los p10/p50/p90 del Monte Carlo
 * sean comparables con los del motor original.
 */
export function percentil(valores: number[], q: number): number {
  if (valores.length === 0) throw new Error('percentil: array vacío');
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicion = (q / 100) * (ordenados.length - 1);
  const inferior = Math.floor(posicion);
  const superior = Math.ceil(posicion);
  if (inferior === superior) return ordenados[inferior];
  const peso = posicion - inferior;
  return ordenados[inferior] * (1 - peso) + ordenados[superior] * peso;
}

/**
 * Formato de euros del informe: entero, con punto de millar. Ej. «24.880 €».
 *
 * `useGrouping: 'always'` no es opcional aquí. Por defecto el locale es-ES
 * sigue la convención tipográfica española y NO separa los números de cuatro
 * cifras («8800 €»), mientras que el motor Python siempre agrupa («8.800 €»).
 * Se conserva el criterio del original para que los informes ya emitidos y los
 * nuevos se lean igual.
 */
const FORMATO_EUROS = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

export function eur(x: number): string {
  return `${FORMATO_EUROS.format(redondear(x))} €`;
}
