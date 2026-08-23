import { describe, expect, it } from 'vitest';
import { rendimientoDesdePrimerCierre } from './rendimiento';

describe('rendimientoDesdePrimerCierre', () => {
  it('calcula el rendimiento simple entre el primer y el último cierre', () => {
    const r = rendimientoDesdePrimerCierre([
      { fecha: '2026-01-01', cierre: 100 },
      { fecha: '2026-06-01', cierre: 110 },
    ]);
    expect(r).toBeCloseTo(0.1, 10);
  });

  it('ordena por fecha antes de calcular, no asume que ya vienen ordenados', () => {
    const r = rendimientoDesdePrimerCierre([
      { fecha: '2026-06-01', cierre: 110 },
      { fecha: '2026-01-01', cierre: 100 },
    ]);
    expect(r).toBeCloseTo(0.1, 10);
  });

  it('rendimiento negativo cuando el mercado cae', () => {
    const r = rendimientoDesdePrimerCierre([
      { fecha: '2026-01-01', cierre: 100 },
      { fecha: '2026-06-01', cierre: 80 },
    ]);
    expect(r).toBeCloseTo(-0.2, 10);
  });

  it('null con menos de dos puntos: no hay rendimiento que calcular', () => {
    expect(rendimientoDesdePrimerCierre([])).toBeNull();
    expect(rendimientoDesdePrimerCierre([{ fecha: '2026-01-01', cierre: 100 }])).toBeNull();
  });

  it('null si el primer cierre es cero o negativo: dato inválido, no se inventa un rendimiento', () => {
    expect(
      rendimientoDesdePrimerCierre([
        { fecha: '2026-01-01', cierre: 0 },
        { fecha: '2026-06-01', cierre: 80 },
      ]),
    ).toBeNull();
  });
});
