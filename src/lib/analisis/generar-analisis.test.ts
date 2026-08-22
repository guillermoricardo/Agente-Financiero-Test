import { describe, expect, it } from 'vitest';
import { fusionarDato, type FichaParcial } from '@/lib/claude/ficha-entrevista';
import {
  colchonObjetivoMeses,
  cuotasIncluidasEnGasto,
  generarAnalisis,
  normalizarFicha,
  resumenDeudas,
} from './generar-analisis';

// La ficha completa del Guion A de material-clase/GUION-CLIENTE-PRUEBA.md
// (Laura Ferrer): mismos datos que ya reproduce
// src/lib/claude/ficha-entrevista.test.ts para el progreso de 8/8 bloques.
function fichaCompletaLaura(): FichaParcial {
  let datos: FichaParcial = {};
  const capturas: [string, unknown, string][] = [
    ['objetivo_descripcion', 'bajar el ritmo a los 60', 'confirmado'],
    ['objetivo_cifra', 150000, 'confirmado'],
    ['objetivo_plazo', 20, 'confirmado'],
    ['ingresos_netos_mes', 2800, 'confirmado'],
    ['ingresos_estabilidad', 'fijos', 'confirmado'],
    ['gasto_total_mes', 2000, 'confirmado'],
    ['aportacion_mensual_actual', 150, 'confirmado'],
    ['patrimonio_total', 22000, 'confirmado'],
    ['patrimonio_distribucion', '12.000 cuenta, 10.000 fondo indexado', 'confirmado'],
    ['deudas', { tipo: 'lista', deudas: [{ tipo: 'hipoteca', saldo: null, cuota: 620, interes: 1.9 }] }, 'confirmado'],
    ['colchon_meses', 5, 'confirmado'],
    ['riesgo_experiencia', 'invirtió en 2020, aguantó la caída', 'confirmado'],
    ['riesgo_escenario', 'aguantar', 'confirmado'],
    ['riesgo_perfil_derivado', 'moderado', 'confirmado'],
  ];
  for (const [clave, valor, etiqueta] of capturas) {
    datos = fusionarDato(datos, { clave, valor, etiqueta });
  }
  return datos;
}

describe('resumenDeudas', () => {
  it('lista con interés bajo no cuenta como deuda cara', () => {
    const ficha = normalizarFicha(fichaCompletaLaura());
    const resumen = resumenDeudas(ficha.deudas);
    expect(resumen.cuotaTotalMensual).toBe(620);
    expect(resumen.interesMaximoPct).toBe(1.9);
    expect(resumen.hayDeudaCara).toBe(false);
  });

  it('un interés por encima del umbral cuenta como deuda cara', () => {
    const datos = fusionarDato(
      {},
      { clave: 'deudas', valor: { tipo: 'lista', deudas: [{ tipo: 'tarjeta', saldo: 2000, cuota: 100, interes: 19.9 }] }, etiqueta: 'confirmado' },
    );
    const ficha = normalizarFicha(datos);
    expect(resumenDeudas(ficha.deudas).hayDeudaCara).toBe(true);
  });

  it('negativa del cliente no tiene cuotas ni intereses que sumar', () => {
    const datos = fusionarDato({}, { clave: 'deudas', valor: { tipo: 'pendiente', motivo: 'negativa_cliente' }, etiqueta: 'pendiente' });
    const ficha = normalizarFicha(datos);
    expect(resumenDeudas(ficha.deudas)).toEqual({
      cuotaTotalMensual: 0,
      interesMaximoPct: null,
      hayDeudaCara: false,
      saldoTotalConocido: null,
    });
  });
});

describe('colchonObjetivoMeses', () => {
  it('3-6 meses con ingresos fijos', () => {
    expect(colchonObjetivoMeses('fijos')).toEqual([3, 6]);
  });

  it('6-12 meses con ingresos variables o sin dato (sesgo prudente)', () => {
    expect(colchonObjetivoMeses('variables')).toEqual([6, 12]);
    expect(colchonObjetivoMeses(null)).toEqual([6, 12]);
  });
});

describe('cuotasIncluidasEnGasto', () => {
  it('sin cuotas de deuda, no hay nada que decidir', () => {
    expect(cuotasIncluidasEnGasto(2800, 2000, 150, 0).incluidas).toBe(true);
  });

  it('remanente que coincide con lo que dice ahorrar: el gasto ya incluye las cuotas', () => {
    // ingresos 3000, gasto 2400 → remanente 600, aportación 600.
    expect(cuotasIncluidasEnGasto(3000, 2400, 600, 620).incluidas).toBe(true);
  });

  it('remanente que no coincide: por prudencia se asume que NO las incluye', () => {
    // caso Laura: remanente 800, aportación 150 — no coincide.
    expect(cuotasIncluidasEnGasto(2800, 2000, 150, 620).incluidas).toBe(false);
  });
});

describe('generarAnalisis', () => {
  it('una ficha completa (Guion A) produce modo completo con probabilidad y banda', () => {
    const resultado = generarAnalisis(fichaCompletaLaura());

    expect(resultado.modo).toBe('completo');
    expect(resultado.faltantes).toEqual([]);
    expect(resultado.recomendacionSuspendida).toBe(false);
    expect(resultado.tipoMeta.tipo).toBe('patrimonio');

    expect(resultado.cartera).not.toBeNull();
    expect(resultado.proyeccion).not.toBeNull();
    expect(resultado.monteCarlo).not.toBeNull();
    expect(resultado.monteCarlo?.probCumplimiento).toBeGreaterThanOrEqual(0);
    expect(resultado.monteCarlo?.probCumplimiento).toBeLessThanOrEqual(1);
    expect(['Alta', 'Razonable', 'Frágil', 'Baja']).toContain(resultado.monteCarlo?.banda);
    expect(resultado.monteCarlo!.p10).toBeLessThanOrEqual(resultado.monteCarlo!.p50);
    expect(resultado.monteCarlo!.p50).toBeLessThanOrEqual(resultado.monteCarlo!.p90);
  });

  it('es determinista: la misma ficha produce siempre el mismo resultado (semilla fija de R10)', () => {
    const a = generarAnalisis(fichaCompletaLaura());
    const b = generarAnalisis(fichaCompletaLaura());
    expect(a.monteCarlo?.p50).toBe(b.monteCarlo?.p50);
    expect(a.monteCarlo?.probCumplimiento).toBe(b.monteCarlo?.probCumplimiento);
  });

  it('deudas pendiente por negativa del cliente deja la recomendación suspendida (R9)', () => {
    let datos = fichaCompletaLaura();
    datos = fusionarDato(datos, { clave: 'deudas', valor: { tipo: 'pendiente', motivo: 'negativa_cliente' }, etiqueta: 'pendiente' });

    const resultado = generarAnalisis(datos);

    expect(resultado.modo).toBe('suspendido');
    expect(resultado.recomendacionSuspendida).toBe(true);
    expect(resultado.cartera).toBeNull();
    expect(resultado.proyeccion).toBeNull();
    expect(resultado.monteCarlo).toBeNull();
  });

  it('falta una variable crítica → modo condicionado, sin propuesta ejecutable', () => {
    const datos = fichaCompletaLaura();
    // Se quita el colchón: vuelve a quedar sin capturar.
    delete (datos as Record<string, unknown>).colchonMeses;

    const resultado = generarAnalisis(datos);

    expect(resultado.modo).toBe('condicionado');
    expect(resultado.faltantes).toContain('colchonMeses');
    expect(resultado.cartera).toBeNull();
    expect(resultado.proyeccion).toBeNull();
  });

  it('perfil de riesgo pendiente se trata como conservador (R5, C5)', () => {
    const datos = fichaCompletaLaura();
    delete (datos as Record<string, unknown>).riesgoPerfilDerivado;

    const resultado = generarAnalisis(datos);

    // Sin perfil, riesgoPerfilDerivado queda pendiente → también condicionado
    // (es variable crítica), pero la situación actual ya refleja conservador.
    expect(resultado.situacionActual.perfilRiesgo).toBe('conservador');
    expect(resultado.situacionActual.perfilEsSupuesto).toBe(true);
  });

  it('meta de renta de negocio no se convierte a patrimonio (R6): sin objetivo real ni probabilidad', () => {
    let datos: FichaParcial = fichaCompletaLaura();
    datos = fusionarDato(datos, {
      clave: 'objetivo_descripcion',
      valor: 'hacer crecer mi negocio hasta poder vivir de su facturación',
      etiqueta: 'confirmado',
    });

    const resultado = generarAnalisis(datos);

    expect(resultado.modo).toBe('completo');
    expect(resultado.tipoMeta.tipo).toBe('renta_negocio');
    expect(resultado.proyeccion).toBeNull();
    expect(resultado.monteCarlo?.probCumplimiento).toBeUndefined();
  });
});
