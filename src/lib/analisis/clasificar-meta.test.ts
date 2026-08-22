import { describe, expect, it } from 'vitest';
import { fusionarDato, type FichaParcial } from '@/lib/claude/ficha-entrevista';
import { normalizarFicha } from './generar-analisis';
import { clasificarMeta } from './clasificar-meta';

function conObjetivo(descripcion: string, cifra: number | null, plazo: number | null) {
  let datos: FichaParcial = {};
  if (descripcion) {
    datos = fusionarDato(datos, { clave: 'objetivo_descripcion', valor: descripcion, etiqueta: 'confirmado' });
  }
  if (cifra !== null) {
    datos = fusionarDato(datos, { clave: 'objetivo_cifra', valor: cifra, etiqueta: 'confirmado' });
  }
  if (plazo !== null) {
    datos = fusionarDato(datos, { clave: 'objetivo_plazo', valor: plazo, etiqueta: 'confirmado' });
  }
  return normalizarFicha(datos);
}

describe('clasificarMeta', () => {
  it('sin cifra o sin plazo cae en mixta, sin mirar el texto', () => {
    const ficha = conObjetivo('vivir de las rentas de mi cartera', 500000, null);
    expect(clasificarMeta(ficha).tipo).toBe('mixta');
  });

  it('objetivo de negocio propio no se convierte', () => {
    const ficha = conObjetivo('hacer crecer mi negocio hasta poder vivir de su facturación', 300000, 10);
    expect(clasificarMeta(ficha).tipo).toBe('renta_negocio');
  });

  it('objetivo de renta de cartera se detecta por vocabulario de renta', () => {
    const ficha = conObjetivo('quiero vivir de las rentas sin depender de la nómina', 2000, 20);
    expect(clasificarMeta(ficha).tipo).toBe('renta_cartera');
  });

  it('sin señales de renta ni negocio, es patrimonio por defecto (caso Laura del Guion A)', () => {
    const ficha = conObjetivo('bajar el ritmo a los 60', 150000, 20);
    expect(clasificarMeta(ficha).tipo).toBe('patrimonio');
  });

  it('la razón siempre cita el dato que llevó a la clasificación', () => {
    const ficha = conObjetivo('jubilarme tranquilo', 150000, 20);
    const resultado = clasificarMeta(ficha);
    expect(resultado.razon.length).toBeGreaterThan(0);
  });
});
