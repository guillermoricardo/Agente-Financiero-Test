// Fase 7 · "Diagnóstico". §3 de docs/criterio/instrucciones-motor.md:
// clasificar la meta antes de poder proyectarla. La ficha nunca trae un
// campo "tipo de meta" explícito — el cliente lo cuenta con sus palabras en
// `objetivo_descripcion` durante la entrevista — así que esto es una
// clasificación por palabras clave sobre ese texto: determinista, con motivo
// trazable (el motor aplica las reglas literalmente, y una clasificación sin
// razón visible no se puede auditar en la reunión).

import type { Ficha, TipoMeta } from '@/lib/motor/ficha';

export interface ClasificacionMeta {
  tipo: TipoMeta;
  razon: string;
}

const PALABRAS_NEGOCIO = [
  'negocio',
  'empresa',
  'facturacion',
  'facturación',
  'autonomo',
  'autónomo',
  'mi consulta',
  'mis clientes',
  'mi tienda',
];

const PALABRAS_RENTA = [
  'renta',
  'rentas',
  'alquiler',
  'alquileres',
  'vivir de',
  'ingreso mensual',
  'ingresos mensuales',
  'dejar de depender de la nomina',
  'dejar de depender de la nómina',
];

function contieneAlguna(texto: string, palabras: string[]): boolean {
  return palabras.some((palabra) => texto.includes(palabra));
}

/**
 * §3: sin cifra o sin plazo, no hay nada que clasificar como convertible —
 * cae directo en "mixta / ambigua" ("sin proyección: solo situación actual +
 * escenarios condicionados"), antes incluso de mirar el texto.
 */
export function clasificarMeta(ficha: Ficha): ClasificacionMeta {
  if (ficha.objetivoCifra.valor === null || ficha.objetivoPlazo.valor === null) {
    return {
      tipo: 'mixta',
      razon: 'Falta la cifra o el plazo del objetivo: sin eso no hay proyección posible (§3, fila "mixta / ambigua").',
    };
  }

  const texto = (ficha.objetivoDescripcion.valor ?? '').toLowerCase();

  if (contieneAlguna(texto, PALABRAS_NEGOCIO)) {
    return {
      tipo: 'renta_negocio',
      razon: `La descripción del objetivo menciona un negocio o actividad propia ("${ficha.objetivoDescripcion.valor}"): la meta no se convierte a patrimonio (R6).`,
    };
  }

  if (contieneAlguna(texto, PALABRAS_RENTA)) {
    return {
      tipo: 'renta_cartera',
      razon: `La descripción del objetivo habla de renta o de vivir de las rentas ("${ficha.objetivoDescripcion.valor}"): se convierte a patrimonio con la tasa de retirada de R6.`,
    };
  }

  return {
    tipo: 'patrimonio',
    razon: 'Sin señales de renta ni de negocio en la descripción: se trata `objetivo_cifra` como patrimonio total (§3, caso por defecto).',
  };
}
