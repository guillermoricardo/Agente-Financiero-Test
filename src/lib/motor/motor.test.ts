/**
 * motor.test.ts — Verificación del port TypeScript contra el motor Python.
 *
 * El oráculo es `motor-python/baseline.json`, generado ejecutando el motor
 * original. Regenerarlo con:  python3 motor-python/baseline.py
 *
 * Dos niveles de exigencia, deliberadamente distintos:
 *
 *  · Funciones deterministas → paridad al bit (tolerancia relativa 1e-12,
 *    solo para absorber el último ulp de `pow` entre libm y V8).
 *
 *  · Monte Carlo → NO se compara número a número. numpy usa PCG64, que no es
 *    reproducible fuera de numpy, así que las trayectorias son necesariamente
 *    distintas. Se verifica de dos formas independientes: contra la solución
 *    analítica lognormal (exacta, sin oráculo de por medio) y contra los
 *    percentiles del original dentro de la tolerancia del error de muestreo.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  aEurosActuales,
  ajustarCarteraPorPlazo,
  aniosHastaMeta,
  aportacionPropuesta,
  convertirMetaRenta,
  flujoLibre,
  monteCarlo,
  rentabilidadCartera,
  vfDeterminista,
  volatilidadCartera,
} from './calculos';
import { determinarModo, type Ficha } from './ficha';
import { percentil, redondear } from './numerico';
import {
  CARTERAS_BASE,
  COSTES_ANUALES,
  INFLACION,
  N_TRAYECTORIAS,
  RETORNO_NOMINAL,
  TASA_RETIRADA,
  TOPE_APORTACION,
  VOLATILIDAD,
  type Cartera,
  type HorizonteRetirada,
  type PerfilRiesgo,
} from './supuestos';

const aqui = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(
  readFileSync(join(aqui, '../../../motor-python/baseline.json'), 'utf8'),
);

/** Igualdad con tolerancia relativa: compara cifras grandes y pequeñas igual. */
function esperarIgual(actual: number, esperado: number, tolerancia = 1e-12) {
  const escala = Math.max(Math.abs(esperado), 1);
  expect(Math.abs(actual - esperado) / escala).toBeLessThan(tolerancia);
}

describe('supuestos · las constantes de criterio no se han alterado en el port', () => {
  const s = baseline.supuestos;

  it('mantiene las rentabilidades y costes de R5', () => {
    expect(RETORNO_NOMINAL).toEqual(s.RETORNO_NOMINAL);
    expect(COSTES_ANUALES).toBe(s.COSTES_ANUALES);
    expect(INFLACION).toBe(s.INFLACION);
  });

  it('mantiene las carteras de R3 y las volatilidades de R10', () => {
    expect(CARTERAS_BASE).toEqual(s.CARTERAS_BASE);
    expect(VOLATILIDAD).toEqual(s.VOLATILIDAD);
  });

  it('mantiene las tasas de retirada de R6 y el tope de R2', () => {
    expect(TASA_RETIRADA).toEqual(s.TASA_RETIRADA);
    expect([...TOPE_APORTACION]).toEqual(s.TOPE_APORTACION);
    expect(N_TRAYECTORIAS).toBe(s.N_TRAYECTORIAS);
  });
});

describe('R3 · cartera ajustada por plazo', () => {
  it.each(baseline.carteras as Array<Record<string, never>>)(
    'perfil $perfil a $plazo años reproduce la cartera del original',
    (caso) => {
      const c = caso as unknown as {
        perfil: PerfilRiesgo;
        plazo: number;
        pesos: Cartera;
        rentabilidad: number;
        volatilidad: number;
      };
      const pesos = ajustarCarteraPorPlazo(c.perfil, c.plazo);
      expect(pesos).toEqual(c.pesos);
      esperarIgual(rentabilidadCartera(pesos), c.rentabilidad);
      esperarIgual(volatilidadCartera(pesos), c.volatilidad);
    },
  );

  it('aplica la banda conservadora en la frontera de 3 años (C2)', () => {
    // A 3 años exactos manda la banda de «menos de 3»: renta variable ≤ 10 %.
    expect(ajustarCarteraPorPlazo('dinamico', 3).renta_variable).toBe(0.1);
    // A 3,01 años ya es la banda 3–7: recorte de 10 puntos sobre el 80 %.
    expect(ajustarCarteraPorPlazo('dinamico', 3.01).renta_variable).toBe(0.7);
  });

  it('a plazo largo deja la cartera base intacta', () => {
    for (const perfil of ['conservador', 'moderado', 'dinamico'] as const) {
      expect(ajustarCarteraPorPlazo(perfil, 20)).toEqual(CARTERAS_BASE[perfil]);
    }
  });

  it('devuelve siempre pesos que suman 1', () => {
    for (const perfil of ['conservador', 'moderado', 'dinamico'] as const) {
      for (const plazo of [0.5, 1, 3, 5, 7, 8, 15, 40]) {
        const pesos = ajustarCarteraPorPlazo(perfil, plazo);
        const suma = Object.values(pesos).reduce((a, b) => a + b, 0);
        esperarIgual(suma, 1);
      }
    }
  });
});

describe('R5 · rentabilidad derivada de la composición', () => {
  it.each(baseline.carteras_base as Array<Record<string, never>>)(
    'la cartera base $perfil reproduce rentabilidad y volatilidad',
    (caso) => {
      const c = caso as unknown as {
        pesos: Cartera;
        rentabilidad: number;
        volatilidad: number;
      };
      esperarIgual(rentabilidadCartera(c.pesos), c.rentabilidad);
      esperarIgual(volatilidadCartera(c.pesos), c.volatilidad);
    },
  );

  /**
   * R5 cita las resultantes como «≈3,1 · 4,3 · 5,4 %». Los valores exactos que
   * salen de la media ponderada son 3,10 · 4,25 · 5,35 %: las cifras del
   * documento son su redondeo comercial. Se afirma sobre el valor exacto, que
   * es el que entra en las proyecciones; el redondeo es solo presentación.
   */
  it('deriva las resultantes exactas de las carteras base de R3', () => {
    esperarIgual(rentabilidadCartera(CARTERAS_BASE.conservador), 0.031);
    esperarIgual(rentabilidadCartera(CARTERAS_BASE.moderado), 0.0425);
    esperarIgual(rentabilidadCartera(CARTERAS_BASE.dinamico), 0.0535);
  });

  it('deriva la rentabilidad de la composición, no del perfil', () => {
    // Una cartera moderada acortada por plazo NO rinde el 4,25 % de la base:
    // hay que recalcular la ponderada. Es el error que R5 prohíbe expresamente.
    const acortada = ajustarCarteraPorPlazo('moderado', 5);
    expect(rentabilidadCartera(acortada)).toBeLessThan(
      rentabilidadCartera(CARTERAS_BASE.moderado),
    );
  });
});

describe('R2 + C1 · flujo libre', () => {
  it.each(baseline.flujo_libre as Array<{ args: [number, number, boolean, number]; resultado: number }>)(
    'reproduce el flujo libre de $args',
    ({ args, resultado }) => {
      esperarIgual(flujoLibre(...args), resultado);
    },
  );

  it('no vuelve a restar las cuotas si el gasto ya las incluye (C1)', () => {
    expect(flujoLibre(3000, 2200, true, 1000)).toBe(800);
    expect(flujoLibre(3000, 2200, false, 1000)).toBe(-200);
  });
});

describe('R2 · aportación propuesta', () => {
  it.each(
    baseline.aportacion_propuesta as Array<{
      args: [number | null, number, boolean, boolean];
      resultado: {
        propuesta: number | [number, number];
        rango_sostenible: [number, number];
        tope: number;
        viable: boolean;
      };
    }>,
  )('reproduce la aportación de $args', ({ args, resultado }) => {
    const r = aportacionPropuesta(...args);
    expect(r.tope).toBeCloseTo(resultado.tope, 10);
    expect(r.rangoSostenible[0]).toBeCloseTo(resultado.rango_sostenible[0], 10);
    expect(r.rangoSostenible[1]).toBeCloseTo(resultado.rango_sostenible[1], 10);
    expect(r.viable).toBe(resultado.viable);
    if (Array.isArray(resultado.propuesta)) {
      expect(r.propuesta).toEqual(expect.any(Array));
    } else {
      expect(r.propuesta).toBeCloseTo(resultado.propuesta, 10);
    }
  });

  it('C14 · si la requerida cabe bajo el tope, propone la requerida', () => {
    const r = aportacionPropuesta(500, 800, true, false);
    expect(r.propuesta).toBe(500);
    expect(r.viable).toBe(true);
  });

  it('R2 · sin colchón completo el tope se queda en el 80 % del flujo', () => {
    expect(aportacionPropuesta(null, 800, true, false).tope).toBe(640);
    expect(aportacionPropuesta(null, 800, false, true).tope).toBe(640);
  });

  it('R2 · solo llega al 100 % con colchón y provisiones cubiertos', () => {
    expect(aportacionPropuesta(null, 800, true, true).tope).toBe(800);
  });

  it('si la meta exige más de lo sostenible, no fuerza la aportación (R4)', () => {
    const r = aportacionPropuesta(700, 800, true, false);
    expect(r.propuesta).toEqual([560, 640]);
    expect(r.viable).toBe(false);
  });
});

describe('proyección determinista', () => {
  it.each(baseline.vf_determinista as Array<{ args: [number, number, number, number]; resultado: number }>)(
    'reproduce el valor futuro de $args',
    ({ args, resultado }) => {
      esperarIgual(vfDeterminista(...args), resultado);
    },
  );

  it.each(baseline.a_euros_actuales as Array<{ args: [number, number]; resultado: number }>)(
    'reproduce el deflactado de $args',
    ({ args, resultado }) => {
      esperarIgual(aEurosActuales(...args), resultado);
    },
  );

  it.each(
    baseline.anios_hasta_meta as Array<{
      args: [number, number, number, number];
      resultado: number | null;
    }>,
  )('reproduce los años hasta meta de $args', ({ args, resultado }) => {
    const r = aniosHastaMeta(...args);
    if (resultado === null) expect(r).toBeNull();
    else esperarIgual(r as number, resultado);
  });

  it('maneja la rama de tasa cero sin dividir por cero', () => {
    expect(vfDeterminista(10000, 800, 0, 3)).toBe(10000 + 800 * 36);
  });
});

describe('R6 · conversión de metas de renta', () => {
  it.each(
    baseline.convertir_meta_renta as Array<{
      args: [number, HorizonteRetirada];
      resultado: number;
    }>,
  )('reproduce la conversión de $args', ({ args, resultado }) => {
    esperarIgual(convertirMetaRenta(...args), resultado);
  });

  it('nunca aplica el 4 % automático: la tasa depende del horizonte', () => {
    // 2.000 €/mes son 24.000 €/año. A +40 años la tasa es 3 % (×400), no 4 %.
    expect(convertirMetaRenta(2000, '>=40')).toBe(800000);
    expect(convertirMetaRenta(2000, '~20')).toBe(600000);
    expect(convertirMetaRenta(2000, '>=40')).toBeGreaterThan(convertirMetaRenta(2000, '~20'));
  });
});

describe('R10 · Monte Carlo', () => {
  /**
   * Verificación sin oráculo: sin aportaciones, el valor final es lognormal
   * puro y sus percentiles tienen forma cerrada. Si la simulación se desvía de
   * ella, el fallo está en el motor y no en el muestreo.
   */
  it('coincide con la solución analítica lognormal cuando no hay aportaciones', () => {
    const pesos = CARTERAS_BASE.moderado;
    const patrimonio = 100000;
    const anios = 15;

    const mc = monteCarlo(patrimonio, 0, pesos, anios, null, { nTrayectorias: 200000 });

    const mu = rentabilidadCartera(pesos);
    const sigma = volatilidadCartera(pesos);
    const m = anios * 12;
    const sigmaM = sigma / Math.sqrt(12);
    const deriva = Math.log(1 + mu) / 12 - 0.5 * sigmaM ** 2;

    const analitico = (z: number) =>
      (patrimonio * Math.exp(m * deriva + sigmaM * Math.sqrt(m) * z)) / (1 + INFLACION) ** anios;

    const Z10 = -1.2815515655446004;
    const Z90 = 1.2815515655446004;

    // 1,5 % de margen: con 200.000 trayectorias el error de muestreo de un
    // percentil de cola queda holgadamente por debajo.
    expect(Math.abs(mc.p10 / analitico(Z10) - 1)).toBeLessThan(0.015);
    expect(Math.abs(mc.p50 / analitico(0) - 1)).toBeLessThan(0.015);
    expect(Math.abs(mc.p90 / analitico(Z90) - 1)).toBeLessThan(0.015);
  });

  it.each(
    baseline.monte_carlo as Array<{
      caso: {
        patrimonio: number;
        aportacion: number;
        perfil: PerfilRiesgo;
        plazo: number;
        objetivo: number | null;
      };
      resultado: {
        p10: number;
        p50: number;
        p90: number;
        mu_cartera: number;
        sigma_cartera: number;
        prob_cumplimiento?: number;
        banda?: string;
      };
    }>,
  )(
    'reproduce los percentiles del original para $caso.perfil a $caso.plazo años',
    ({ caso, resultado }) => {
      const pesos = ajustarCarteraPorPlazo(caso.perfil, caso.plazo);
      const mc = monteCarlo(caso.patrimonio, caso.aportacion, pesos, caso.plazo, caso.objetivo);

      // Los parámetros de la cartera sí son deterministas: paridad exacta.
      esperarIgual(mc.muCartera, resultado.mu_cartera);
      esperarIgual(mc.sigmaCartera, resultado.sigma_cartera);

      // Los percentiles son estimaciones muestrales de dos generadores
      // distintos: se exige coincidencia dentro del error de muestreo.
      const TOLERANCIA = 0.025;
      expect(Math.abs(mc.p10 / resultado.p10 - 1)).toBeLessThan(TOLERANCIA);
      expect(Math.abs(mc.p50 / resultado.p50 - 1)).toBeLessThan(TOLERANCIA);
      expect(Math.abs(mc.p90 / resultado.p90 - 1)).toBeLessThan(TOLERANCIA);

      if (resultado.prob_cumplimiento !== undefined) {
        expect(Math.abs(mc.probCumplimiento! - resultado.prob_cumplimiento)).toBeLessThan(0.03);
        expect(mc.banda).toBe(resultado.banda);
      }
    },
  );

  it('es reproducible: misma semilla y mismos datos, mismo informe', () => {
    const pesos = CARTERAS_BASE.moderado;
    const a = monteCarlo(10000, 500, pesos, 10, 200000);
    const b = monteCarlo(10000, 500, pesos, 10, 200000);
    expect(a).toEqual(b);
  });

  it('cambia de resultado al cambiar la semilla, pero no de orden de magnitud', () => {
    const pesos = CARTERAS_BASE.moderado;
    const a = monteCarlo(10000, 500, pesos, 10, null, { semilla: 1 });
    const b = monteCarlo(10000, 500, pesos, 10, null, { semilla: 2 });
    expect(a.p50).not.toBe(b.p50);
    expect(Math.abs(a.p50 / b.p50 - 1)).toBeLessThan(0.02);
  });

  it('mantiene el orden p10 < p50 < p90', () => {
    const mc = monteCarlo(15000, 640, CARTERAS_BASE.dinamico, 20);
    expect(mc.p10).toBeLessThan(mc.p50);
    expect(mc.p50).toBeLessThan(mc.p90);
  });

  it('asigna las bandas de probabilidad de R10 en sus umbrales', () => {
    // Una meta trivialmente alcanzable cae en Alta; una imposible, en Baja.
    const pesos = CARTERAS_BASE.moderado;
    expect(monteCarlo(100000, 500, pesos, 10, 1000).banda).toBe('Alta');
    expect(monteCarlo(100000, 500, pesos, 10, 100_000_000).banda).toBe('Baja');
  });
});

describe('utilidades numéricas', () => {
  it('redondea al par como Python, no hacia arriba como JavaScript', () => {
    expect(redondear(0.5)).toBe(0);
    expect(redondear(1.5)).toBe(2);
    expect(redondear(2.5)).toBe(2);
    expect(redondear(-0.5)).toBe(0);
    expect(redondear(34.8)).toBe(35);
  });

  it('interpola los percentiles como numpy', () => {
    // Con [1..10], el p10 cae entre el primer y el segundo valor.
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentil(v, 0)).toBe(1);
    expect(percentil(v, 100)).toBe(10);
    expect(percentil(v, 50)).toBeCloseTo(5.5, 10);
    expect(percentil(v, 10)).toBeCloseTo(1.9, 10);
  });
});

describe('R9 · modo del informe según la calidad del dato', () => {
  function fichaBase(): Ficha {
    const ok = <T>(valor: T) => ({ valor, etiqueta: 'confirmado' as const });
    return {
      nombre: 'prueba',
      fechaEntrevista: '2026-08-11',
      objetivoDescripcion: ok('jubilarme tranquilo'),
      objetivoCifra: ok(300000),
      objetivoPlazo: ok(20),
      ingresosNetosMes: ok(3000),
      ingresosEstabilidad: ok('fijos'),
      gastoTotalMes: ok(2200),
      aportacionMensualActual: ok(0),
      patrimonioTotal: ok(15000),
      patrimonioDistribucion: ok('cuenta y acciones'),
      deudas: ok({ tipo: 'ninguna' } as const),
      colchonMeses: ok(4),
      riesgoExperiencia: ok('sin experiencia'),
      riesgoEscenario: ok('aguantar'),
      riesgoPerfilDerivado: ok('conservador'),
      pendientes: [],
    };
  }

  it('con las críticas presentes, el informe es completo', () => {
    expect(determinarModo(fichaBase()).modo).toBe('completo');
  });

  it('si falta una variable crítica, el informe queda condicionado', () => {
    const ficha = fichaBase();
    ficha.colchonMeses = { valor: null, etiqueta: 'pendiente' };
    const r = determinarModo(ficha);
    expect(r.modo).toBe('condicionado');
    expect(r.faltantes).toContain('colchonMeses');
  });

  it('un dato estimado no degrada el informe: sigue siendo completo', () => {
    const ficha = fichaBase();
    ficha.gastoTotalMes = { valor: 2200, etiqueta: 'estimado' };
    expect(determinarModo(ficha).modo).toBe('completo');
  });

  it('la negativa del cliente a hablar de deudas suspende la recomendación', () => {
    const ficha = fichaBase();
    ficha.deudas = {
      valor: { tipo: 'pendiente', motivo: 'negativa_cliente' },
      etiqueta: 'pendiente',
    };
    expect(determinarModo(ficha).modo).toBe('suspendido');
  });
});
