/**
 * revaluar.ts — R11 de docs/criterio/reglas-recomendacion.md.
 *
 * Código PURO: sin red, sin base de datos, sin modelo de lenguaje. Entra un
 * análisis ya calculado más el rendimiento de mercado observado, sale la
 * banda revaluada. Mismo principio que src/lib/motor/: todo número sale de
 * código ejecutado, nunca "de cabeza" — y este módulo reutiliza las
 * funciones del motor (monteCarlo) importándolas, nunca copiándolas ni
 * reescribiéndolas.
 *
 * Supuestos explícitos de esta regla (documentados también en R11):
 *  - Se revaloriza la cartera que el motor CALCULÓ (R3 ajustada por plazo),
 *    no la que el cliente pueda haber ejecutado de verdad. Es la única
 *    cifra de la que el sistema dispone.
 *  - La liquidez no se revaloriza: ni con su rentabilidad nominal de R5 ni
 *    con un rendimiento de mercado — no hay mercado que observar para ella,
 *    y omitirla es la opción prudente (R9): nunca sobreestima el patrimonio.
 */

import { monteCarlo } from '@/lib/motor/calculos';
import type { AnalisisResultado } from '@/lib/analisis/generar-analisis';
import type { BandaProbabilidad, Cartera } from '@/lib/motor/supuestos';
import { CLASES_MERCADO, type ClaseMercado } from './proxies';

export type RendimientosPorClase = Partial<Record<ClaseMercado, number>>;

export interface DetalleRevaluacion {
  rendimientosPorClase: RendimientosPorClase;
  rendimientoCartera: number;
  patrimonioAnterior: number;
  patrimonioRevalorizado: number;
  aniosTranscurridos: number;
  aniosRestantes: number;
}

export interface ResultadoRevaluacion {
  /** false si el análisis no tiene cartera/banda que revaluar (R9: fuera de modo `completo`, o meta no convertible — R6). */
  aplica: boolean;
  motivo?: string;
  bandaAnterior?: BandaProbabilidad;
  bandaNueva?: BandaProbabilidad;
  probabilidadAnterior?: number;
  probabilidadNueva?: number;
  cambioBanda: boolean;
  detalle?: DetalleRevaluacion;
}

const ANIOS_RESTANTES_MINIMO = 1 / 12;
const MS_POR_ANIO = 1000 * 60 * 60 * 24 * 365.25;

const SIN_CARTERA: ResultadoRevaluacion = {
  aplica: false,
  motivo: 'Sin cartera, proyección u objetivo convertible que revaluar (R9/R6/R11).',
  cambioBanda: false,
};

/**
 * R11 · Recalcula la banda de probabilidad de cumplimiento de un análisis
 * `completo` con el rendimiento real de mercado observado desde que se
 * calculó, y dice si cambió respecto a la banda ya guardada.
 */
export function revaluarBanda(
  analisis: AnalisisResultado,
  rendimientos: RendimientosPorClase,
  fechaAnalisis: Date,
  fechaHoy: Date,
  /**
   * Banda y probabilidad contra las que comparar. Por defecto, las del
   * propio `analisis` — pero si ya existe una alerta previa para él (Fase
   * 11: "no se reabre el mismo aviso cada mañana"), quien llama pasa aquí
   * la banda de esa última alerta en vez de repetir la comparación contra
   * el análisis original.
   */
  referencia?: { banda: BandaProbabilidad; probabilidad: number },
): ResultadoRevaluacion {
  if (analisis.modo !== 'completo' || !analisis.cartera || !analisis.proyeccion || !analisis.monteCarlo?.banda) {
    return SIN_CARTERA;
  }

  const bandaAnterior = referencia?.banda ?? analisis.monteCarlo.banda;
  const probabilidadAnterior = referencia?.probabilidad ?? analisis.monteCarlo.probCumplimiento;

  const { pesos } = analisis.cartera;
  const patrimonioAnterior = analisis.situacionActual.patrimonioTotal ?? 0;

  const propuesta = analisis.proyeccion.aportacionPropuesta.propuesta;
  const aportacionMes = typeof propuesta === 'number' ? propuesta : propuesta[1];

  const aniosTranscurridos = Math.max(0, (fechaHoy.getTime() - fechaAnalisis.getTime()) / MS_POR_ANIO);
  const aniosRestantes = Math.max(analisis.proyeccion.anios - aniosTranscurridos, ANIOS_RESTANTES_MINIMO);

  const rendimientoCartera = CLASES_MERCADO.reduce(
    (acumulado, clase) => acumulado + (pesos[clase] ?? 0) * (rendimientos[clase] ?? 0),
    0,
  );
  const patrimonioRevalorizado = patrimonioAnterior * (1 + rendimientoCartera);

  const resultado = monteCarlo(
    patrimonioRevalorizado,
    aportacionMes,
    pesos as Cartera,
    aniosRestantes,
    analisis.proyeccion.objetivoReal,
  );

  const bandaNueva = resultado.banda;
  if (!bandaNueva) return SIN_CARTERA;

  return {
    aplica: true,
    bandaAnterior,
    bandaNueva,
    probabilidadAnterior,
    probabilidadNueva: resultado.probCumplimiento,
    cambioBanda: bandaAnterior !== bandaNueva,
    detalle: {
      rendimientosPorClase: rendimientos,
      rendimientoCartera,
      patrimonioAnterior,
      patrimonioRevalorizado,
      aniosTranscurridos,
      aniosRestantes,
    },
  };
}
