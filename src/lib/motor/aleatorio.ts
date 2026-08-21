/**
 * aleatorio.ts — Generador pseudoaleatorio con semilla para el Monte Carlo.
 *
 * El motor Python usa el PCG64 de numpy, que no es reproducible bit a bit
 * fuera de numpy. Por eso el port NO intenta clonar sus trayectorias: usa su
 * propio generador con semilla y la equivalencia con el original se verifica
 * estadísticamente (percentiles dentro de tolerancia) y contra la forma
 * cerrada lognormal, no número a número. Ver `motor.test.ts`.
 *
 * Lo que sí se conserva es la garantía que importa para un informe: misma
 * semilla y mismos datos ⇒ mismo resultado, siempre.
 */

/** PRNG mulberry32: rápido, con estado de 32 bits y período suficiente aquí. */
export function generador(semilla: number): () => number {
  let estado = semilla >>> 0;
  return function siguiente(): number {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normales estándar por Box–Muller polar, que consume dos uniformes y
 * devuelve dos normales independientes. Se rellena el array completo de una
 * vez porque el Monte Carlo necesita cientos de miles de muestras.
 */
export function normalesEstandar(n: number, semilla: number): Float64Array {
  const uniforme = generador(semilla);
  const salida = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let u: number;
    let v: number;
    let s: number;
    do {
      u = uniforme() * 2 - 1;
      v = uniforme() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    salida[i++] = u * factor;
    if (i < n) salida[i++] = v * factor;
  }
  return salida;
}
