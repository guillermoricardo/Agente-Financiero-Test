/**
 * calculos.ts — Motor de cálculo. Port de `motor-python/motor-calculos.py`.
 *
 * Módulo PURO: sin acceso a red, a base de datos ni al modelo de lenguaje.
 * Entra la ficha, salen números. Es el cumplimiento en código del límite duro
 * de las reglas: «todo número sale de código ejecutado».
 *
 * Los nombres de función se mantienen en castellano y calcados del original
 * para que la trazabilidad con `docs/instrucciones-motor.md` sea directa.
 */

import {
  BANDAS_PROBABILIDAD,
  CARTERAS_BASE,
  COSTES_ANUALES,
  INFLACION,
  N_TRAYECTORIAS,
  RETORNO_NOMINAL,
  SEMILLA,
  TASA_RETIRADA,
  TOPE_APORTACION,
  VOLATILIDAD,
  correlacion,
  type BandaProbabilidad,
  type Cartera,
  type ClaseActivo,
  type HorizonteRetirada,
  type PerfilRiesgo,
} from './supuestos';
import { normalesEstandar } from './aleatorio';
import { percentil, redondear } from './numerico';

/** Clases presentes en una cartera, tipadas. */
function clases(pesos: Cartera): ClaseActivo[] {
  return Object.keys(pesos) as ClaseActivo[];
}

/**
 * R3 · La regla del plazo prevalece sobre el perfil.
 * C2: un plazo en la frontera de banda (p. ej. exactamente 3 años) cae en la
 * banda más conservadora. C3: los puntos de renta variable retirados van a
 * renta fija de corta duración. [estimado]
 */
export function ajustarCarteraPorPlazo(perfil: PerfilRiesgo, plazoAnios: number): Cartera {
  const base: Cartera = { ...CARTERAS_BASE[perfil] };
  const rv = base.renta_variable ?? 0;

  let recorte: number;
  if (plazoAnios <= 3) {
    // < 3 años y la frontera de 3 (C2): renta variable al 10 % como máximo.
    recorte = Math.max(0, rv - 0.1);
  } else if (plazoAnios <= 7) {
    // Rango −10..−20 puntos: se aplica el extremo prudente, −10.
    recorte = 0.1;
  } else {
    recorte = 0;
  }

  base.renta_variable = redondear(rv - recorte, 4);
  base.renta_fija = redondear((base.renta_fija ?? 0) + recorte, 4);

  const suma = clases(base).reduce((acc, c) => acc + (base[c] ?? 0), 0);
  if (Math.abs(suma - 1) > 1e-9) {
    throw new Error(`ajustarCarteraPorPlazo: los pesos suman ${suma}, no 1`);
  }
  return base;
}

/**
 * R5 · Rentabilidad esperada DERIVADA de la composición (media ponderada),
 * neta de costes. Nunca se asigna una cifra fija al perfil.
 */
export function rentabilidadCartera(pesos: Cartera): number {
  const bruta = clases(pesos).reduce((acc, c) => acc + (pesos[c] ?? 0) * RETORNO_NOMINAL[c], 0);
  return bruta - COSTES_ANUALES;
}

/** R10 · Volatilidad anual de la cartera con las correlaciones entre clases. */
export function volatilidadCartera(pesos: Cartera): number {
  const cs = clases(pesos);
  let varianza = 0;
  for (const a of cs) {
    for (const b of cs) {
      varianza +=
        (pesos[a] ?? 0) * (pesos[b] ?? 0) * VOLATILIDAD[a] * VOLATILIDAD[b] * correlacion(a, b);
    }
  }
  return Math.sqrt(varianza);
}

/**
 * R2 + C1 · Flujo libre mensual.
 * `cuotasIncluidasEnGasto` responde a C1: si no puede determinarse, se pasa
 * `false` (flujo menor = prudente, R9) y se declara el supuesto en el informe.
 */
export function flujoLibre(
  ingresos: number,
  gasto: number,
  cuotasIncluidasEnGasto: boolean,
  cuotas = 0,
): number {
  return ingresos - gasto - (cuotasIncluidasEnGasto ? 0 : cuotas);
}

export interface AportacionPropuesta {
  /** Cifra concreta si la meta cabe (C14); si no, el rango sostenible. */
  propuesta: number | [number, number];
  rangoSostenible: [number, number];
  tope: number;
  viable: boolean;
}

/**
 * R2 · Manda la meta, acotada al tope sostenible.
 * C14: si la aportación requerida cabe bajo el tope, se propone la requerida
 * (no el máximo porque sí).
 *
 * OJO — comportamiento heredado del motor original: con `requerida = null`
 * devuelve `viable: true`. Ahí `viable` no significa «la meta se alcanza»,
 * sino «no hay meta que evaluar». Se conserva por paridad; quien consuma este
 * resultado debe comprobar antes si hay meta convertible.
 */
export function aportacionPropuesta(
  requerida: number | null,
  flujo: number,
  colchonCompleto: boolean,
  provisionesOk: boolean,
): AportacionPropuesta {
  const tope = flujo * (colchonCompleto && provisionesOk ? 1 : TOPE_APORTACION[1]);
  const rangoSostenible: [number, number] = [flujo * TOPE_APORTACION[0], flujo * TOPE_APORTACION[1]];

  if (requerida !== null && requerida <= tope) {
    return { propuesta: requerida, rangoSostenible, tope, viable: true };
  }
  return {
    propuesta: rangoSostenible,
    rangoSostenible,
    tope,
    viable: requerida === null,
  };
}

/** Proyección central: valor futuro nominal con capitalización mensual. */
export function vfDeterminista(
  patrimonio: number,
  aportacionMes: number,
  rAnual: number,
  anios: number,
): number {
  const rM = (1 + rAnual) ** (1 / 12) - 1;
  const m = redondear(anios * 12);
  if (rM === 0) return patrimonio + aportacionMes * m;
  return patrimonio * (1 + rM) ** m + (aportacionMes * ((1 + rM) ** m - 1)) / rM;
}

/** R5 · Los resultados se presentan en euros de hoy. */
export function aEurosActuales(valorNominal: number, anios: number): number {
  return valorNominal / (1 + INFLACION) ** anios;
}

/** En cuántos años se alcanza el objetivo (en euros actuales). null si nunca. */
export function aniosHastaMeta(
  patrimonio: number,
  aportacionMes: number,
  rAnual: number,
  objetivoReal: number,
  maxAnios = 100,
): number | null {
  for (let m = 1; m <= maxAnios * 12; m++) {
    const anios = m / 12;
    if (aEurosActuales(vfDeterminista(patrimonio, aportacionMes, rAnual, anios), anios) >= objetivoReal) {
      return redondear(anios, 1);
    }
  }
  return null;
}

/**
 * R6 · Convierte una meta de renta en patrimonio objetivo.
 * Solo la renta que debe generar LA CARTERA: pensiones, alquileres y otros
 * ingresos previsibles se descuentan ANTES de llamar aquí. Nunca el 4 %
 * automático — la tasa depende del horizonte de retirada.
 */
export function convertirMetaRenta(
  rentaMesCartera: number,
  horizonteRetirada: HorizonteRetirada,
): number {
  return (rentaMesCartera * 12) / TASA_RETIRADA[horizonteRetirada];
}

export interface ResultadoMonteCarlo {
  p10: number;
  p50: number;
  p90: number;
  n: number;
  muCartera: number;
  sigmaCartera: number;
  probCumplimiento?: number;
  banda?: BandaProbabilidad;
}

/**
 * R10 · ≥10.000 trayectorias mensuales lognormales a nivel cartera.
 * Salida en euros actuales: percentiles p10/p50/p90 y, si hay objetivo,
 * probabilidad de cumplimiento con su banda.
 *
 * Nunca se presenta una cifra determinista única: esta función existe para
 * que el plan hable de horquillas.
 */
export function monteCarlo(
  patrimonio: number,
  aportacionMes: number,
  pesos: Cartera,
  anios: number,
  objetivoReal: number | null = null,
  opciones: { nTrayectorias?: number; semilla?: number } = {},
): ResultadoMonteCarlo {
  const n = opciones.nTrayectorias ?? N_TRAYECTORIAS;
  const semilla = opciones.semilla ?? SEMILLA;

  const mu = rentabilidadCartera(pesos);
  const sigma = volatilidadCartera(pesos);
  const m = redondear(anios * 12);

  // Log-retorno mensual del escenario central y su desviación.
  const muM = Math.log(1 + mu) / 12;
  const sigmaM = sigma / Math.sqrt(12);
  const deriva = muM - 0.5 * sigmaM * sigmaM;

  const z = normalesEstandar(n * m, semilla);
  const valores = new Float64Array(n).fill(patrimonio);

  for (let t = 0; t < m; t++) {
    const desplazamiento = t * n;
    for (let i = 0; i < n; i++) {
      valores[i] = valores[i] * Math.exp(deriva + sigmaM * z[desplazamiento + i]) + aportacionMes;
    }
  }

  const deflactor = (1 + INFLACION) ** anios;
  const reales = Array.from(valores, (v) => v / deflactor);

  const salida: ResultadoMonteCarlo = {
    p10: percentil(reales, 10),
    p50: percentil(reales, 50),
    p90: percentil(reales, 90),
    n,
    muCartera: mu,
    sigmaCartera: sigma,
  };

  if (objetivoReal !== null) {
    const p = reales.filter((v) => v >= objetivoReal).length / reales.length;
    salida.probCumplimiento = p;
    salida.banda = BANDAS_PROBABILIDAD.find(([umbral]) => p >= umbral)![1];
  }

  return salida;
}
