// Fase 9 · Formato numérico compartido del panel. No hay ningún criterio
// financiero aquí, solo presentación — por eso vive fuera de `src/lib/motor/`.

// El resto de la aplicación (el plan, Fase 8) ya usa el símbolo € en el
// texto que redacta el modelo, así que el panel se mantiene consistente con
// eso aunque docs/business.md tenga pendiente fijar la divisa final.
const FORMATO_NUMERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

export function euros(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${FORMATO_NUMERO.format(valor)} €`;
}

export function porcentaje(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${(valor * 100).toFixed(decimales)} %`;
}

export function anios(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `${valor} ${valor === 1 ? 'año' : 'años'}`;
}
