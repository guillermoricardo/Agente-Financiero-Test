/**
 * proxies.ts — Símbolos de mercado usados como proxy de cada clase de activo
 * de R3/R5 para la vigilancia de mercado (R11).
 *
 * LÍMITE DURO (R11): estos símbolos son un detalle interno de cálculo y
 * nunca aparecen en un texto que llegue a Marta o al cliente — igual que
 * las clases de activo de R3/R5 no son nunca un producto concreto.
 *
 * La liquidez no tiene proxy: R5 la trata con rentabilidad nominal plana,
 * no de mercado, así que no hay nada que observar para ella.
 */

import type { ClaseActivo } from '@/lib/motor/supuestos';

export type ClaseMercado = Extract<ClaseActivo, 'renta_variable' | 'renta_fija' | 'oro'>;

export const CLASES_MERCADO: readonly ClaseMercado[] = ['renta_variable', 'renta_fija', 'oro'];

/**
 * Un ETF representativo por clase, usado como proxy del índice de esa clase.
 * Ver docs/architecture.md § "Vigilancia de mercado" para el porqué de cada
 * elección y el riesgo aceptado de la fuente (Yahoo Finance, no oficial).
 */
export const PROXY_YAHOO: Record<ClaseMercado, string> = {
  renta_variable: 'URTH', // iShares MSCI World — proxy de renta variable global.
  renta_fija: 'AGG', // iShares Core U.S. Aggregate Bond — proxy de renta fija.
  oro: 'GLD', // SPDR Gold Shares — proxy de oro.
};
