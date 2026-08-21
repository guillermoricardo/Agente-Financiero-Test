/**
 * caso-alex.test.ts — Regresión end-to-end del caso real ya analizado.
 *
 * Reproduce en TypeScript el bloque `__main__` de `motor-calculos.py`
 * (ficha-alex, 2026-08-04) y comprueba, cifra a cifra y con el mismo formato,
 * que sale el mismo informe que salió con el motor Python.
 *
 * Es la red de seguridad de todo el port: si alguien toca una regla, un peso o
 * un supuesto, este test dice exactamente qué número del informe se movió.
 */

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
import { eur, redondear } from './numerico';
import { COSTES_ANUALES, RETORNO_NOMINAL } from './supuestos';

// ── Datos de la ficha ────────────────────────────────────────────────
const ingresos = 3000;
const gasto = 2200;
const liquidezCuenta = 10000;
const invertible = 5000; // acciones concentradas en un índice (RV)
const colchonMeses = 4; // rango 4-5 → extremo prudente (R9)
const perfil = 'conservador' as const;
const plazo = 3; // frontera de banda → conservadora (C2)

describe('caso Alex · regresión end-to-end contra el informe original', () => {
  // C1: la aportación actual coincide con ingresos − gasto, luego el gasto ya
  // incluye las cuotas de deuda y no se restan otra vez.
  const fl = flujoLibre(ingresos, gasto, true);
  const cartera = ajustarCarteraPorPlazo(perfil, plazo);
  const r = rentabilidadCartera(cartera);
  const ap = aportacionPropuesta(null, fl, true, false);
  const [lo, hi] = ap.rangoSostenible;

  it('calcula un flujo libre de 800 €/mes y un colchón de 8.800 €', () => {
    expect(eur(fl)).toBe('800 €');
    expect(eur(colchonMeses * gasto)).toBe('8.800 €');
  });

  it('R3/C2 · a 3 años deja la cartera en 10 / 70 / 20', () => {
    expect(cartera).toEqual({ renta_variable: 0.1, renta_fija: 0.7, liquidez: 0.2 });
  });

  it('R5 · deriva 2,75 % de rentabilidad neta y 3,94 % de volatilidad', () => {
    expect(redondear(r * 100, 2)).toBe(2.75);
    expect(redondear(volatilidadCartera(cartera) * 100, 2)).toBe(3.94);
  });

  it('R2 · propone un rango sostenible de 560 – 640 €/mes', () => {
    expect(eur(lo)).toBe('560 €');
    expect(eur(hi)).toBe('640 €');
    expect(eur(ap.tope)).toBe('640 €');
  });

  it('R6 · la ilustración de 5.000 €/mes equivale a 2.000.000 € de cartera', () => {
    const equivalente = convertirMetaRenta(5000, '>=40');
    expect(eur(equivalente)).toBe('2.000.000 €');
    // Camino recorrido: 0,8 % de esa cifra ilustrativa.
    expect(redondear((15000 / equivalente) * 100, 1)).toBe(0.8);
  });

  it('proyecta el statu quo a 3 años en 42.190 € de hoy', () => {
    const rRv = RETORNO_NOMINAL.renta_variable - COSTES_ANUALES;
    const cuenta = aEurosActuales(vfDeterminista(liquidezCuenta, 800, 0, plazo), plazo);
    const rv = aEurosActuales(vfDeterminista(invertible, 0, rRv, plazo), plazo);
    expect(eur(cuenta)).toBe('36.562 €');
    expect(eur(rv)).toBe('5.628 €');
    expect(eur(cuenta + rv)).toBe('42.190 €');
  });

  it('proyecta la propuesta en 24.880 € (560 €/mes) y 27.705 € (640 €/mes)', () => {
    expect(eur(aEurosActuales(vfDeterminista(invertible, lo, r, plazo), plazo))).toBe('24.880 €');
    expect(eur(aEurosActuales(vfDeterminista(invertible, hi, r, plazo), plazo))).toBe('27.705 €');
  });

  it('R10 · la meta ilustrativa a 3 años es inalcanzable, banda Baja', () => {
    const equivalente = convertirMetaRenta(5000, '>=40');
    for (const aportacion of [hi, fl]) {
      const mc = monteCarlo(invertible, aportacion, cartera, plazo, equivalente);
      expect(mc.probCumplimiento).toBe(0);
      expect(mc.banda).toBe('Baja');
    }
  });

  it('R4 · ni con el 100 % del flujo se alcanza la cifra en menos de 100 años', () => {
    expect(aniosHastaMeta(invertible, fl, r, convertirMetaRenta(5000, '>=40'))).toBeNull();
  });

  it('R7 · las aportaciones nuevas diluyen la concentración al 43 % / 39 % en 12 meses', () => {
    expect(redondear((invertible / (invertible + lo * 12)) * 100)).toBe(43);
    expect(redondear((invertible / (invertible + hi * 12)) * 100)).toBe(39);
  });

  it('el Monte Carlo encaja con la proyección central del escenario base', () => {
    // El p50 debe quedar pegado al determinista: si se separan, hay un error
    // de deriva en la simulación.
    const central = aEurosActuales(vfDeterminista(invertible, hi, r, plazo), plazo);
    const mc = monteCarlo(invertible, hi, cartera, plazo);
    expect(Math.abs(mc.p50 / central - 1)).toBeLessThan(0.01);
    expect(mc.p10).toBeLessThan(central);
    expect(mc.p90).toBeGreaterThan(central);
  });
});
