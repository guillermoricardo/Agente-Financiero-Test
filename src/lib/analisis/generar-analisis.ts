// Fase 7 · "Diagnóstico". Conecta el motor de cálculo verificado
// (`src/lib/motor/`, intocable — CLAUDE.md § "Qué NO hacer") con la ficha
// cerrada de un cliente. Este archivo NO decide ningún criterio financiero
// nuevo: solo traduce la ficha a las llamadas que pide
// `docs/criterio/instrucciones-motor.md` §5, siguiendo las reglas R1–R10 de
// `docs/criterio/reglas-recomendacion.md`. Cualquier valor de criterio vive
// en `src/lib/motor/supuestos.ts`; aquí solo se orquesta y se documentan las
// decisiones que la documentación no fija con un número exacto.

import {
  ajustarCarteraPorPlazo,
  aniosHastaMeta,
  aportacionPropuesta,
  aEurosActuales,
  convertirMetaRenta,
  flujoLibre,
  monteCarlo,
  rentabilidadCartera,
  vfDeterminista,
  volatilidadCartera,
  type AportacionPropuesta,
  type ResultadoMonteCarlo,
} from '@/lib/motor/calculos';
import { redondear } from '@/lib/motor/numerico';
import { INFLACION, type Cartera, type HorizonteRetirada, type PerfilRiesgo } from '@/lib/motor/supuestos';
import {
  determinarModo,
  type Dato,
  type Deudas,
  type EstabilidadIngresos,
  type Ficha,
  type ModoInforme,
  type RespuestaCaida,
} from '@/lib/motor/ficha';
import type { FichaParcial } from '@/lib/claude/ficha-entrevista';
import { clasificarMeta, type ClasificacionMeta } from './clasificar-meta';

// docs/data-model.md § "Por qué analisis guarda versión de motor y de
// reglas": sin esto un análisis viejo es irreproducible. version_reglas usa
// la fecha que el propio reglas-recomendacion.md declara como vigente desde.
export const VERSION_MOTOR = '1.0.0';
export const VERSION_REGLAS = 'reglas-recomendacion.md · vigente desde 2026-08-06';

const DATO_PENDIENTE: Dato<unknown> = { valor: null, etiqueta: 'pendiente' };

/**
 * `fichas.datos` llega parcial: un campo que el chat nunca tocó no existe en
 * el jsonb, ni siquiera como `pendiente` — `fusionarDato` (Fase 5) solo
 * escribe una clave la primera vez que se captura. `determinarModo()`
 * (src/lib/motor/ficha.ts) espera la ficha completa, así que antes de
 * usarla se rellenan los huecos con `pendiente`: es exactamente lo que son,
 * un dato que nunca se preguntó o nunca se contestó.
 */
export function normalizarFicha(datos: FichaParcial): Ficha {
  return {
    nombre: datos.nombre ?? '',
    fechaEntrevista: datos.fechaEntrevista ?? '',
    objetivoDescripcion: datos.objetivoDescripcion ?? (DATO_PENDIENTE as Dato<string>),
    objetivoCifra: datos.objetivoCifra ?? (DATO_PENDIENTE as Dato<number>),
    objetivoPlazo: datos.objetivoPlazo ?? (DATO_PENDIENTE as Dato<number>),
    ingresosNetosMes: datos.ingresosNetosMes ?? (DATO_PENDIENTE as Dato<number>),
    ingresosEstabilidad: datos.ingresosEstabilidad ?? (DATO_PENDIENTE as Dato<EstabilidadIngresos>),
    gastoTotalMes: datos.gastoTotalMes ?? (DATO_PENDIENTE as Dato<number>),
    aportacionMensualActual: datos.aportacionMensualActual ?? (DATO_PENDIENTE as Dato<number>),
    patrimonioTotal: datos.patrimonioTotal ?? (DATO_PENDIENTE as Dato<number>),
    patrimonioDistribucion: datos.patrimonioDistribucion ?? (DATO_PENDIENTE as Dato<string>),
    deudas: datos.deudas ?? (DATO_PENDIENTE as Dato<Deudas>),
    colchonMeses: datos.colchonMeses ?? (DATO_PENDIENTE as Dato<number>),
    riesgoExperiencia: datos.riesgoExperiencia ?? (DATO_PENDIENTE as Dato<string>),
    riesgoEscenario: datos.riesgoEscenario ?? (DATO_PENDIENTE as Dato<RespuestaCaida>),
    riesgoPerfilDerivado: datos.riesgoPerfilDerivado ?? (DATO_PENDIENTE as Dato<PerfilRiesgo>),
    pendientes: datos.pendientes ?? [],
  };
}

export interface ResumenDeudas {
  cuotaTotalMensual: number;
  interesMaximoPct: number | null;
  hayDeudaCara: boolean;
  saldoTotalConocido: number | null;
}

// R1: "TAE > 7–8 % es deuda cara". Se usa el extremo prudente del rango
// (7, no 8): detecta como "cara" a más deudas, que es la dirección de sesgo
// que R9 pide para los supuestos que afectan a la prioridad del ahorro.
const UMBRAL_DEUDA_CARA_PCT = 7;

/** Traduce la unión `Deudas` de la ficha a las cifras que el motor necesita. */
export function resumenDeudas(dato: Dato<Deudas>): ResumenDeudas {
  const deudas = dato.valor;

  if (!deudas || deudas.tipo === 'pendiente') {
    return { cuotaTotalMensual: 0, interesMaximoPct: null, hayDeudaCara: false, saldoTotalConocido: null };
  }
  if (deudas.tipo === 'ninguna') {
    return { cuotaTotalMensual: 0, interesMaximoPct: null, hayDeudaCara: false, saldoTotalConocido: 0 };
  }
  if (deudas.tipo === 'solo_flag') {
    return { cuotaTotalMensual: 0, interesMaximoPct: null, hayDeudaCara: deudas.hayInteresAlto, saldoTotalConocido: null };
  }

  const cuotaTotalMensual = deudas.deudas.reduce((acc, d) => acc + (d.cuota ?? 0), 0);
  const intereses = deudas.deudas.map((d) => d.interes).filter((i): i is number => i !== null);
  const interesMaximoPct = intereses.length > 0 ? Math.max(...intereses) : null;
  const saldos = deudas.deudas.map((d) => d.saldo);
  const saldoTotalConocido = saldos.every((s) => s !== null) ? (saldos as number[]).reduce((a, b) => a + b, 0) : null;

  return {
    cuotaTotalMensual,
    interesMaximoPct,
    hayDeudaCara: interesMaximoPct !== null && interesMaximoPct > UMBRAL_DEUDA_CARA_PCT,
    saldoTotalConocido,
  };
}

/**
 * R1: colchón objetivo de 3–6 meses con ingresos fijos, 6–12 si son
 * variables. Sin dato de estabilidad, se asume el rango más exigente
 * (variables): R9 pide que lo no confirmado se trate con el sesgo prudente,
 * y dar por bueno un colchón más corto de lo necesario sería el sesgo
 * contrario.
 */
export function colchonObjetivoMeses(estabilidad: EstabilidadIngresos | null): [number, number] {
  return estabilidad === 'fijos' ? [3, 6] : [6, 12];
}

/**
 * C1: ¿el gasto ya incluye las cuotas de deuda? Si el remanente
 * (ingresos − gasto) coincide, con un margen razonable, con lo que el
 * cliente dice apartar, es que ese remanente es real y el gasto ya las
 * incluye. Si no coincide, no puede determinarse con certeza — y C1 dicta
 * asumir que NO las incluye (flujo libre menor, el sesgo prudente de R9).
 * El margen (50 € o 15 % del remanente, el mayor) es una interpretación
 * propia: la documentación no fija un número para "coincide".
 */
export function cuotasIncluidasEnGasto(
  ingresos: number,
  gasto: number,
  aportacionActual: number,
  cuotaTotalMensual: number,
): { incluidas: boolean; nota: string } {
  if (cuotaTotalMensual === 0) {
    return { incluidas: true, nota: 'No hay cuotas de deuda que considerar en el flujo (C1).' };
  }

  const remanente = ingresos - gasto;
  const tolerancia = Math.max(50, Math.abs(remanente) * 0.15);

  if (Math.abs(remanente - aportacionActual) <= tolerancia) {
    return {
      incluidas: true,
      nota: 'El remanente (ingresos − gasto) coincide con lo que el cliente dice apartar: el gasto ya incluye las cuotas de deuda (C1).',
    };
  }

  return {
    incluidas: false,
    nota: 'No puede determinarse con certeza si el gasto ya incluye las cuotas de deuda; por prudencia (R9) se asume que NO las incluye y se restan aparte del flujo libre (C1).',
  };
}

/**
 * Inversión de `vfDeterminista`: la aportación mensual que, sumada al
 * patrimonio actual, alcanza `objetivoReal` (en euros de hoy) en `anios`.
 * Es "la aportación que exige la meta" que pide R2 como punto de partida
 * antes de acotarla al tope sostenible con `aportacionPropuesta`.
 */
export function aportacionMensualRequerida(
  patrimonio: number,
  rentabilidadAnual: number,
  anios: number,
  objetivoReal: number,
): number {
  const objetivoNominal = objetivoReal * (1 + INFLACION) ** anios;
  const rM = (1 + rentabilidadAnual) ** (1 / 12) - 1;
  const m = redondear(anios * 12);

  if (m <= 0) return 0;

  const valorFuturoPatrimonio = patrimonio * (1 + rM) ** m;
  if (rM === 0) {
    return (objetivoNominal - valorFuturoPatrimonio) / m;
  }
  return ((objetivoNominal - valorFuturoPatrimonio) * rM) / ((1 + rM) ** m - 1);
}

export interface SituacionActual {
  ingresosNetosMes: number | null;
  gastoTotalMes: number | null;
  flujoLibre: number | null;
  aportacionMensualActual: number | null;
  patrimonioTotal: number | null;
  patrimonioDistribucion: string | null;
  colchonMeses: number | null;
  colchonObjetivoMeses: [number, number];
  colchonCompleto: boolean;
  deudas: ResumenDeudas;
  perfilRiesgo: PerfilRiesgo;
  perfilEsSupuesto: boolean;
}

export interface Proyeccion {
  objetivoReal: number;
  anios: number;
  vfActualEurosHoy: number;
  aniosHastaMetaRitmoActual: number | null;
  aportacionPropuesta: AportacionPropuesta;
  vfPropuestaEurosHoy: number;
  aniosHastaMetaRitmoPropuesto: number | null;
  gapEuros: number;
}

export interface AnalisisResultado {
  modo: ModoInforme;
  tipoMeta: ClasificacionMeta;
  faltantes: string[];
  situacionActual: SituacionActual;
  supuestos: string[];
  cartera: { pesos: Cartera; rentabilidadEsperadaAnual: number; volatilidadAnual: number } | null;
  proyeccion: Proyeccion | null;
  monteCarlo: ResultadoMonteCarlo | null;
  recomendacionSuspendida: boolean;
  pendientes: string[];
}

/**
 * Punto de entrada de la Fase 7: de la ficha cerrada de un cliente a los
 * números del informe. Sigue el pipeline de
 * `docs/criterio/instrucciones-motor.md` §1: parsear (ya lo hizo la Fase 5),
 * clasificar la meta (§3), evaluar la calidad del dato (§4) y calcular con
 * código (§5) — nunca "de cabeza".
 */
export function generarAnalisis(datosParciales: FichaParcial): AnalisisResultado {
  const ficha = normalizarFicha(datosParciales);
  const { modo, faltantes } = determinarModo(ficha);
  const tipoMeta = clasificarMeta(ficha);
  const deudas = resumenDeudas(ficha.deudas);

  const perfilPendiente = ficha.riesgoPerfilDerivado.etiqueta === 'pendiente' || !ficha.riesgoPerfilDerivado.valor;
  // R5 / C5: perfil pendiente → conservador, señalado.
  const perfilRiesgo: PerfilRiesgo = perfilPendiente ? 'conservador' : (ficha.riesgoPerfilDerivado.valor as PerfilRiesgo);

  const rangoColchon = colchonObjetivoMeses(ficha.ingresosEstabilidad.valor);
  const colchonMesesValor = ficha.colchonMeses.valor;
  // C4: cubierto si es igual o mayor que el límite inferior del rango aplicable.
  const colchonCompleto = colchonMesesValor !== null && colchonMesesValor >= rangoColchon[0];

  const ingresos = ficha.ingresosNetosMes.valor;
  const gasto = ficha.gastoTotalMes.valor;

  const supuestos: string[] = [];
  if (perfilPendiente) {
    supuestos.push('Perfil de riesgo sin dato: se trata como conservador (R5, C5).');
  }
  // R2: "Llegar al 100 % del flujo libre solo si... provisiones para gastos
  // irregulares ya cubiertas." La entrevista (Fase 4/5) nunca pregunta por
  // esas provisiones, así que no hay forma de saberlo — se asume que no
  // están cubiertas, el sesgo prudente: la aportación propuesta nunca llega
  // al 100 % del flujo libre por esta vía, aunque el colchón esté completo.
  supuestos.push(
    'La entrevista no pregunta por "provisiones para gastos irregulares" (R2): se asume que no están cubiertas, así que la aportación propuesta no llega al 100 % del flujo libre aunque el colchón esté completo.',
  );

  let flujo: number | null = null;
  if (ingresos !== null && gasto !== null) {
    const c1 = cuotasIncluidasEnGasto(ingresos, gasto, ficha.aportacionMensualActual.valor ?? 0, deudas.cuotaTotalMensual);
    supuestos.push(c1.nota);
    flujo = flujoLibre(ingresos, gasto, c1.incluidas, deudas.cuotaTotalMensual);
  }

  const situacionActual: SituacionActual = {
    ingresosNetosMes: ingresos,
    gastoTotalMes: gasto,
    flujoLibre: flujo,
    aportacionMensualActual: ficha.aportacionMensualActual.valor,
    patrimonioTotal: ficha.patrimonioTotal.valor,
    patrimonioDistribucion: ficha.patrimonioDistribucion.valor,
    colchonMeses: colchonMesesValor,
    colchonObjetivoMeses: rangoColchon,
    colchonCompleto,
    deudas,
    perfilRiesgo,
    perfilEsSupuesto: perfilPendiente,
  };

  const recomendacionSuspendida = modo === 'suspendido';

  // §4: fuera del modo "completo" no hay propuesta ejecutable — ni cartera,
  // ni proyección, ni Monte Carlo. "Suspendido" (R9) tampoco emite
  // recomendación: solo el diagnóstico descriptivo de la situación actual.
  if (modo !== 'completo') {
    return {
      modo,
      tipoMeta,
      faltantes,
      situacionActual,
      supuestos,
      cartera: null,
      proyeccion: null,
      monteCarlo: null,
      recomendacionSuspendida,
      pendientes: [...ficha.pendientes],
    };
  }

  const plazoAnios = ficha.objetivoPlazo.valor as number;
  const patrimonio = ficha.patrimonioTotal.valor ?? 0;
  const aportacionActual = ficha.aportacionMensualActual.valor ?? 0;

  const cartera = ajustarCarteraPorPlazo(perfilRiesgo, plazoAnios);
  const rentabilidadEsperadaAnual = rentabilidadCartera(cartera);
  const volatilidadAnual = volatilidadCartera(cartera);

  let objetivoReal: number | null = null;
  if (tipoMeta.tipo === 'patrimonio') {
    objetivoReal = ficha.objetivoCifra.valor;
  } else if (tipoMeta.tipo === 'renta_cartera' && ficha.objetivoCifra.valor !== null) {
    // R6: la tasa de retirada depende del horizonte de la retirada, no del
    // plazo hasta la meta — pero la ficha no distingue ambos. Se usa el
    // plazo como aproximación del horizonte (documentado, no es un dato que
    // la entrevista capture hoy): >=35 años → tasa a +40; >=25 → ~30; si no, ~20.
    const horizonte: HorizonteRetirada = plazoAnios >= 35 ? '>=40' : plazoAnios >= 25 ? '~30' : '~20';
    objetivoReal = convertirMetaRenta(ficha.objetivoCifra.valor, horizonte);
    supuestos.push(
      `Meta de renta convertida a patrimonio con la tasa de retirada de horizonte "${horizonte}" (R6), aproximando el horizonte de retirada con el plazo del objetivo — la entrevista no distingue ambos dato a día de hoy.`,
    );
  }
  // renta_negocio / mixta: R6 — no se convierte. objetivoReal queda en null.

  const vfActualEurosHoy = aEurosActuales(
    vfDeterminista(patrimonio, aportacionActual, rentabilidadEsperadaAnual, plazoAnios),
    plazoAnios,
  );

  let proyeccion: Proyeccion | null = null;
  let resultadoMonteCarlo: ResultadoMonteCarlo | null;

  if (objetivoReal !== null) {
    let requerida = aportacionMensualRequerida(patrimonio, rentabilidadEsperadaAnual, plazoAnios, objetivoReal);
    if (requerida < 0) {
      // C13: meta ya alcanzada (o se alcanzaría sin aportar más) — se
      // constata, no se inventa una aportación negativa.
      supuestos.push('La proyección indica que la meta ya se alcanzaría sin aportar más (C13): la aportación requerida se trata como 0.');
      requerida = 0;
    }

    const propuesta = aportacionPropuesta(requerida, flujo ?? 0, colchonCompleto, false);
    const aportacionParaProyeccion = typeof propuesta.propuesta === 'number' ? propuesta.propuesta : propuesta.propuesta[1];

    const vfPropuestaEurosHoy = aEurosActuales(
      vfDeterminista(patrimonio, aportacionParaProyeccion, rentabilidadEsperadaAnual, plazoAnios),
      plazoAnios,
    );

    proyeccion = {
      objetivoReal,
      anios: plazoAnios,
      vfActualEurosHoy,
      aniosHastaMetaRitmoActual: aniosHastaMeta(patrimonio, aportacionActual, rentabilidadEsperadaAnual, objetivoReal),
      aportacionPropuesta: propuesta,
      vfPropuestaEurosHoy,
      aniosHastaMetaRitmoPropuesto: aniosHastaMeta(patrimonio, aportacionParaProyeccion, rentabilidadEsperadaAnual, objetivoReal),
      gapEuros: Math.max(0, redondear(objetivoReal - vfActualEurosHoy)),
    };

    resultadoMonteCarlo = monteCarlo(patrimonio, aportacionParaProyeccion, cartera, plazoAnios, objetivoReal);
  } else {
    // R6, renta de negocio: "se permite UNA ilustración condicionada,
    // claramente rotulada como ilustración, no como objetivo." Sin
    // `objetivoReal` no hay probabilidad de cumplimiento que calcular, pero
    // los percentiles de la cartera actual sí sirven como esa ilustración.
    resultadoMonteCarlo = monteCarlo(patrimonio, aportacionActual, cartera, plazoAnios, null);
    supuestos.push(
      'La meta no se convierte a patrimonio (renta de negocio o meta mixta, R6): los percentiles del Monte Carlo son una ilustración de la cartera, no una probabilidad de cumplir la meta.',
    );
  }

  return {
    modo,
    tipoMeta,
    faltantes,
    situacionActual,
    supuestos,
    cartera: { pesos: cartera, rentabilidadEsperadaAnual, volatilidadAnual },
    proyeccion,
    monteCarlo: resultadoMonteCarlo,
    recomendacionSuspendida,
    pendientes: [...ficha.pendientes],
  };
}
