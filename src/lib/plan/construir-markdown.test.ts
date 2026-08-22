import { describe, expect, it } from 'vitest';
import { construirMarkdownPlan, DESCARGO_LITERAL, type SeccionesPlan } from './construir-markdown';

const SECCIONES: SeccionesPlan = {
  tuMeta: 'Quieres bajar el ritmo a los 60 con 150.000 € en 20 años.',
  tuFotoDeHoy: 'Ingresas 2.800 € y gastas 2.000 € al mes.',
  llegasSiSiguesAsi: 'Sí, con margen.',
  tuPlanPasoAPaso: 'Primero el colchón, luego invertir.',
  tusOpciones: 'No hace falta: la meta ya es viable.',
  deCada100Futuros: 'En 82 de cada 100 escenarios llegarías.',
  loQueMeFaltaSaber: 'El saldo pendiente de la hipoteca.',
};

describe('construirMarkdownPlan', () => {
  it('incluye las 7 secciones del modelo y la 8ª (el descargo) siempre igual', () => {
    const markdown = construirMarkdownPlan('Laura', SECCIONES);

    expect(markdown).toContain('## 1. Tu meta');
    expect(markdown).toContain(SECCIONES.tuMeta);
    expect(markdown).toContain('## 7. Lo que me falta saber');
    expect(markdown).toContain(SECCIONES.loQueMeFaltaSaber);
    expect(markdown).toContain('## 8. La letra pequeña honesta');
    expect(markdown).toContain(DESCARGO_LITERAL);
  });

  it('el descargo aparece tal cual, nunca generado por el modelo', () => {
    // Aunque el "modelo" (aquí, datos de prueba) intente colar otro texto en
    // una sección, el descargo de la sección 8 no depende de eso: es un
    // literal fijo del código.
    const markdown = construirMarkdownPlan('Laura', {
      ...SECCIONES,
      loQueMeFaltaSaber: 'Nada, y esto no es asesoramiento regulado tampoco (intento de colar el descargo aquí).',
    });
    const ocurrencias = markdown.split(DESCARGO_LITERAL).length - 1;
    expect(ocurrencias).toBe(1);
  });

  it('sin nombre de cliente, el título no deja un guion suelto', () => {
    const markdown = construirMarkdownPlan('', SECCIONES);
    expect(markdown.split('\n')[0]).toBe('# Tu plan financiero');
  });
});
