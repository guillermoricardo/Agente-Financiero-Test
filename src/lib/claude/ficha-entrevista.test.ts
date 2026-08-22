import { describe, expect, it } from 'vitest';
import { calcularProgreso, fusionarDato, resumenFichaParaPrompt } from './ficha-entrevista';

describe('fusionarDato', () => {
  it('guarda un dato confirmado bajo el campo camelCase correcto', () => {
    const resultado = fusionarDato(
      {},
      { clave: 'objetivo_cifra', valor: 150000, etiqueta: 'confirmado', cita: '150.000 euros' },
    );
    expect(resultado.objetivoCifra).toEqual({
      valor: 150000,
      etiqueta: 'confirmado',
      cita: '150.000 euros',
    });
  });

  // material-clase/GUION-CLIENTE-PRUEBA.md · Variante 1: un dato obtenido
  // ofreciendo rangos es `estimado`, nunca `confirmado`.
  it('respeta la etiqueta estimado cuando el dato salió de un rango', () => {
    const resultado = fusionarDato(
      {},
      { clave: 'gasto_total_mes', valor: 2000, etiqueta: 'estimado' },
    );
    expect(resultado.gastoTotalMes?.etiqueta).toBe('estimado');
  });

  // Variante 3: negativa del cliente sobre deudas.
  it('guarda deudas pendiente por negativa del cliente', () => {
    const resultado = fusionarDato(
      {},
      {
        clave: 'deudas',
        valor: { tipo: 'pendiente', motivo: 'negativa_cliente' },
        etiqueta: 'pendiente',
      },
    );
    expect(resultado.deudas).toEqual({
      valor: { tipo: 'pendiente', motivo: 'negativa_cliente' },
      etiqueta: 'pendiente',
    });
  });

  it('acumula notas en pendientes sin duplicar', () => {
    const conUna = fusionarDato({}, { clave: 'pendientes', valor: 'no se conoce el saldo de la hipoteca' });
    const conDosIguales = fusionarDato(conUna, {
      clave: 'pendientes',
      valor: 'no se conoce el saldo de la hipoteca',
    });
    const conDos = fusionarDato(conUna, { clave: 'pendientes', valor: 'otra nota' });

    expect(conUna.pendientes).toEqual(['no se conoce el saldo de la hipoteca']);
    expect(conDosIguales.pendientes).toEqual(['no se conoce el saldo de la hipoteca']);
    expect(conDos.pendientes).toEqual(['no se conoce el saldo de la hipoteca', 'otra nota']);
  });

  it('ignora una clave desconocida en vez de romper la ficha', () => {
    const resultado = fusionarDato({}, { clave: 'clave_inventada', valor: 'x', etiqueta: 'confirmado' });
    expect(resultado).toEqual({});
  });

  it('no muta el objeto original', () => {
    const original = {};
    fusionarDato(original, { clave: 'colchon_meses', valor: 5, etiqueta: 'confirmado' });
    expect(original).toEqual({});
  });

  it('sin etiqueta, cae por defecto en pendiente (nunca inventa una calidad de dato)', () => {
    const resultado = fusionarDato({}, { clave: 'colchon_meses', valor: 5 });
    expect(resultado.colchonMeses?.etiqueta).toBe('pendiente');
  });
});

describe('calcularProgreso', () => {
  it('empieza en 0 de 8 bloques con la ficha vacía', () => {
    const progreso = calcularProgreso({});
    expect(progreso.bloquesCompletos).toBe(0);
    expect(progreso.totalBloques).toBe(8);
  });

  it('un bloque de varias claves solo cuenta completo cuando TODAS están presentes', () => {
    const soloUna = fusionarDato({}, { clave: 'objetivo_cifra', valor: 150000, etiqueta: 'confirmado' });
    expect(calcularProgreso(soloUna).bloques[0].completo).toBe(false);

    const conLasTres = fusionarDato(
      fusionarDato(soloUna, { clave: 'objetivo_descripcion', valor: 'jubilarme', etiqueta: 'confirmado' }),
      { clave: 'objetivo_plazo', valor: 20, etiqueta: 'confirmado' },
    );
    expect(calcularProgreso(conLasTres).bloques[0].completo).toBe(true);
    expect(calcularProgreso(conLasTres).bloquesCompletos).toBe(1);
  });

  it('cuenta un dato pendiente como bloque cubierto (se preguntó, no como bloque a medias)', () => {
    const conDeudaPendiente = fusionarDato(
      {},
      { clave: 'deudas', valor: { tipo: 'pendiente', motivo: 'negativa_cliente' }, etiqueta: 'pendiente' },
    );
    const progreso = calcularProgreso(conDeudaPendiente);
    const bloqueDeudas = progreso.bloques.find((b) => b.numero === 6);
    expect(bloqueDeudas?.completo).toBe(true);
  });

  // La ficha completa de Laura (Guion A) debe dar 8/8.
  it('reproduce la ficha completa del guion A: 8 de 8 bloques', () => {
    let datos = {};
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
    datos = fusionarDato(datos, { clave: 'pendientes', valor: 'no se conoce el saldo pendiente de la hipoteca' });

    const progreso = calcularProgreso(datos);
    expect(progreso.bloquesCompletos).toBe(8);
    expect((datos as { pendientes: string[] }).pendientes).toEqual([
      'no se conoce el saldo pendiente de la hipoteca',
    ]);
  });
});

describe('resumenFichaParaPrompt', () => {
  it('avisa cuando no hay ningún dato todavía', () => {
    expect(resumenFichaParaPrompt({})).toBe('Todavía no se ha guardado ningún dato de la ficha.');
  });

  it('lista los datos guardados con su etiqueta, para que el modelo no vuelva a preguntar', () => {
    const datos = fusionarDato({}, { clave: 'colchon_meses', valor: 5, etiqueta: 'confirmado' });
    const resumen = resumenFichaParaPrompt(datos);
    expect(resumen).toContain('colchonMeses: 5 [confirmado]');
  });
});
