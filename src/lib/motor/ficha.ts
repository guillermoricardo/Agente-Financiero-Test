/**
 * ficha.ts — El contrato de datos del sistema.
 *
 * En la versión de escritorio el contrato entre módulos era un markdown con
 * claves fijas (`ficha-[nombre].md`). En web ese papel lo hacen estos tipos y
 * la tabla `fichas` de la base de datos. El markdown sigue existiendo, pero
 * como VISTA generada desde aquí para que Marta pueda descargarlo — ya no es
 * la fuente de verdad.
 *
 * Las claves son las mismas de `docs/instrucciones-motor.md` §2. No renombrar:
 * el motor y el redactor del plan dependen de ellas.
 */

import type { PerfilRiesgo } from './supuestos';

/** Calidad del dato (R9). Decide el modo del informe. */
export type Etiqueta = 'confirmado' | 'estimado' | 'pendiente';

/**
 * Un dato de la ficha nunca viaja solo: lleva su calidad y, cuando existe, la
 * cita literal del cliente. Sin la etiqueta no se puede decidir si el informe
 * sale completo, condicionado o suspendido.
 */
export interface Dato<T> {
  valor: T | null;
  etiqueta: Etiqueta;
  /** Palabras textuales del cliente que respaldan el valor. */
  cita?: string;
  /** Si el cliente dio un rango, el extremo prudente aplicado y su dirección. */
  supuesto?: string;
}

export type EstabilidadIngresos = 'fijos' | 'variables';
export type RespuestaCaida = 'vender' | 'aguantar' | 'comprar';

export interface Deuda {
  tipo: string;
  saldo: number | null;
  cuota: number | null;
  /** TAE. R1: > 7–8 % es deuda cara, prioridad absoluta sobre invertir. */
  interes: number | null;
}

/**
 * R9 · Las deudas admiten tres formatos y el tercero es especial: si el
 * cliente se niega a dar el dato, la recomendación queda expresamente
 * suspendida. Modelarlo como unión obliga a tratar ese caso.
 */
export type Deudas =
  | { tipo: 'lista'; deudas: Deuda[] }
  | { tipo: 'ninguna' }
  | { tipo: 'pendiente'; motivo: 'negativa_cliente' | 'no_preguntado' }
  /** Salida del protocolo especial del bloque 6 de la entrevista. */
  | { tipo: 'solo_flag'; hayInteresAlto: boolean };

export interface Ficha {
  nombre: string;
  fechaEntrevista: string;

  objetivoDescripcion: Dato<string>;
  objetivoCifra: Dato<number>;
  /** Plazo en años. */
  objetivoPlazo: Dato<number>;

  ingresosNetosMes: Dato<number>;
  ingresosEstabilidad: Dato<EstabilidadIngresos>;

  gastoTotalMes: Dato<number>;
  aportacionMensualActual: Dato<number>;

  patrimonioTotal: Dato<number>;
  patrimonioDistribucion: Dato<string>;

  deudas: Dato<Deudas>;
  colchonMeses: Dato<number>;

  riesgoExperiencia: Dato<string>;
  riesgoEscenario: Dato<RespuestaCaida>;
  /**
   * R3/C6 · Ya pondera conducta sobre declaración: lo que el cliente HIZO en
   * caídas reales prevalece sobre lo que dice que haría. El motor lo usa tal
   * cual y no vuelve a derivarlo.
   */
  riesgoPerfilDerivado: Dato<PerfilRiesgo>;

  /** Se arrastran íntegros al informe; el motor nunca los resuelve por su cuenta. */
  pendientes: string[];
}

/** §3 · Clasificación de la meta. Determina si es convertible a patrimonio. */
export type TipoMeta = 'patrimonio' | 'renta_cartera' | 'renta_negocio' | 'mixta';

/** §4 · Modo del informe según la calidad del dato (R9). */
export type ModoInforme = 'completo' | 'condicionado' | 'suspendido';

/**
 * R9 · Variables críticas. Si alguna está `pendiente`, el informe no puede
 * emitir propuesta ejecutable, solo escenarios condicionados.
 */
export const VARIABLES_CRITICAS = [
  'ingresosNetosMes',
  'gastoTotalMes',
  'deudas',
  'colchonMeses',
  'patrimonioTotal',
  'objetivoCifra',
  'objetivoPlazo',
  'riesgoPerfilDerivado',
] as const satisfies ReadonlyArray<keyof Ficha>;

/**
 * §4 · Determina el modo del informe.
 * La negativa del cliente a hablar de deudas no es «un dato menos»: suspende
 * la recomendación entera, porque sin ella el plan podría aconsejar invertir
 * a alguien que primero debería cancelar una tarjeta al 20 %.
 */
export function determinarModo(ficha: Ficha): {
  modo: ModoInforme;
  faltantes: string[];
} {
  const deudas = ficha.deudas.valor;
  if (
    ficha.deudas.etiqueta === 'pendiente' &&
    deudas?.tipo === 'pendiente' &&
    deudas.motivo === 'negativa_cliente'
  ) {
    return { modo: 'suspendido', faltantes: ['deudas'] };
  }

  const faltantes = VARIABLES_CRITICAS.filter(
    (clave) => (ficha[clave] as Dato<unknown>).etiqueta === 'pendiente',
  );

  return {
    modo: faltantes.length > 0 ? 'condicionado' : 'completo',
    faltantes: [...faltantes],
  };
}
