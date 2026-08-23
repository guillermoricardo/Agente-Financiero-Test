import { describe, expect, it } from 'vitest';
import { fusionarDato, type FichaParcial } from '@/lib/claude/ficha-entrevista';
import { generarAnalisis } from '@/lib/analisis/generar-analisis';
import { revaluarBanda } from './revaluar';

// Misma ficha completa (perfil moderado, plazo 20 años) que usa
// generar-analisis.test.ts, para no reinventar un caso ya validado contra
// el motor. Modo `completo`: es el único donde R11 aplica.
function fichaCompleta(): FichaParcial {
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

const FECHA_ANALISIS = new Date('2026-01-01T00:00:00Z');

describe('revaluarBanda', () => {
  it('sin movimiento de mercado ni tiempo transcurrido, reproduce la misma banda y probabilidad (misma semilla)', () => {
    const analisis = generarAnalisis(fichaCompleta());
    const resultado = revaluarBanda(analisis, {}, FECHA_ANALISIS, FECHA_ANALISIS);

    expect(resultado.aplica).toBe(true);
    expect(resultado.cambioBanda).toBe(false);
    expect(resultado.bandaNueva).toBe(analisis.monteCarlo?.banda);
    expect(resultado.probabilidadNueva).toBe(analisis.monteCarlo?.probCumplimiento);
  });

  it('una caída fuerte de mercado reduce la probabilidad de cumplimiento', () => {
    const analisis = generarAnalisis(fichaCompleta());
    const unAnioDespues = new Date('2027-01-01T00:00:00Z');

    const resultado = revaluarBanda(
      analisis,
      { renta_variable: -0.5, renta_fija: -0.1, oro: -0.1 },
      FECHA_ANALISIS,
      unAnioDespues,
    );

    expect(resultado.aplica).toBe(true);
    expect(resultado.probabilidadNueva!).toBeLessThan(resultado.probabilidadAnterior!);
    expect(resultado.detalle!.patrimonioRevalorizado).toBeLessThan(resultado.detalle!.patrimonioAnterior);
  });

  it('una subida fuerte de mercado aumenta la probabilidad de cumplimiento', () => {
    const analisis = generarAnalisis(fichaCompleta());
    const unAnioDespues = new Date('2027-01-01T00:00:00Z');

    const resultado = revaluarBanda(
      analisis,
      { renta_variable: 0.5, renta_fija: 0.1, oro: 0.1 },
      FECHA_ANALISIS,
      unAnioDespues,
    );

    expect(resultado.probabilidadNueva!).toBeGreaterThan(resultado.probabilidadAnterior!);
    expect(resultado.detalle!.patrimonioRevalorizado).toBeGreaterThan(resultado.detalle!.patrimonioAnterior);
  });

  it('la liquidez no se revaloriza: un rendimiento de mercado en clases donde la cartera no tiene peso no mueve el patrimonio', () => {
    // Cartera moderada ajustada por plazo de 20 años: sin recorte de plazo,
    // conserva algo de liquidez (R3). Un "rendimiento" de liquidez, si se
    // colara, no debería tener ningún efecto porque no es una clase de
    // mercado (CLASES_MERCADO no la incluye).
    const analisis = generarAnalisis(fichaCompleta());
    const resultado = revaluarBanda(analisis, {}, FECHA_ANALISIS, FECHA_ANALISIS);
    expect(resultado.detalle!.rendimientoCartera).toBe(0);
  });

  it('no aplica si el análisis no está en modo completo (R9)', () => {
    // Ficha sin colchón: falta una variable crítica → modo condicionado.
    let datos = fichaCompleta();
    // No hay forma de "borrar" un dato ya fusionado con fusionarDato, así
    // que se construye una ficha nueva sin esa clave.
    datos = { ...datos };
    delete (datos as Record<string, unknown>).colchonMeses;

    const analisis = generarAnalisis(datos);
    expect(analisis.modo).not.toBe('completo');

    const resultado = revaluarBanda(analisis, {}, FECHA_ANALISIS, FECHA_ANALISIS);
    expect(resultado.aplica).toBe(false);
    expect(resultado.cambioBanda).toBe(false);
  });

  it('no aplica a una meta que R6 no convierte a patrimonio (renta de negocio): no hay banda que revaluar', () => {
    let datos: FichaParcial = {};
    const capturas: [string, unknown, string][] = [
      ['objetivo_descripcion', 'vivir de la facturación del negocio', 'confirmado'],
      ['objetivo_cifra', 3000, 'confirmado'],
      ['objetivo_plazo', 15, 'confirmado'],
      ['ingresos_netos_mes', 2800, 'confirmado'],
      ['ingresos_estabilidad', 'variables', 'confirmado'],
      ['gasto_total_mes', 2000, 'confirmado'],
      ['aportacion_mensual_actual', 150, 'confirmado'],
      ['patrimonio_total', 22000, 'confirmado'],
      ['patrimonio_distribucion', '22.000 en cuenta', 'confirmado'],
      ['deudas', { tipo: 'ninguna' }, 'confirmado'],
      ['colchon_meses', 8, 'confirmado'],
      ['riesgo_experiencia', 'nunca ha invertido', 'confirmado'],
      ['riesgo_escenario', 'aguantar', 'confirmado'],
      ['riesgo_perfil_derivado', 'moderado', 'confirmado'],
    ];
    for (const [clave, valor, etiqueta] of capturas) {
      datos = fusionarDato(datos, { clave, valor, etiqueta });
    }

    const analisis = generarAnalisis(datos);
    expect(analisis.tipoMeta.tipo).toBe('renta_negocio');
    expect(analisis.monteCarlo?.banda).toBeUndefined();

    const resultado = revaluarBanda(analisis, {}, FECHA_ANALISIS, FECHA_ANALISIS);
    expect(resultado.aplica).toBe(false);
  });
});
