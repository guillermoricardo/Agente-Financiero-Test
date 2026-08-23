/**
 * proveedor-precios.ts — Adaptador a la fuente de precios de mercado.
 *
 * Yahoo Finance no ofrece una API pública documentada para esto (decisión
 * consciente del usuario, ver docs/architecture.md § "Trampas conocidas del
 * stack"): el endpoint puede cambiar de forma o dejar de responder sin
 * aviso. Por eso vive detrás de esta interfaz — cambiar de fuente el día que
 * haga falta es sustituir este archivo, no reescribir `revaluar.ts`.
 *
 * Si Yahoo no responde o el formato cambia, esta función LANZA en vez de
 * devolver un dato inventado: sin precio de mercado fiable, no hay
 * revaluación ese día (R9: nunca inventar un dato).
 */

export interface Cierre {
  fecha: string; // 'YYYY-MM-DD'
  cierre: number;
}

export interface ProveedorPrecios {
  obtenerCierres(simbolo: string, desde: Date, hasta: Date): Promise<Cierre[]>;
}

export const proveedorYahoo: ProveedorPrecios = {
  async obtenerCierres(simbolo, desde, hasta) {
    const period1 = Math.floor(desde.getTime() / 1000);
    const period2 = Math.floor(hasta.getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?period1=${period1}&period2=${period2}&interval=1d`;

    const respuesta = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; clase-agente-financiero/1.0)' },
    });
    if (!respuesta.ok) {
      throw new Error(`Yahoo Finance respondió ${respuesta.status} para "${simbolo}"`);
    }

    const json = (await respuesta.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
        error?: unknown;
      };
    };

    const resultado = json.chart?.result?.[0];
    if (!resultado || json.chart?.error) {
      throw new Error(`Yahoo Finance sin datos utilizables para "${simbolo}"`);
    }

    const timestamps = resultado.timestamp ?? [];
    const cierres = resultado.indicators?.quote?.[0]?.close ?? [];

    return timestamps
      .map((t, i) => ({ fecha: new Date(t * 1000).toISOString().slice(0, 10), cierre: cierres[i] }))
      .filter((c): c is Cierre => typeof c.cierre === 'number');
  },
};
