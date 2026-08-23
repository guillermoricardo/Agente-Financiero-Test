import 'server-only';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { PROXY_YAHOO, type ClaseMercado } from './proxies';
import { proveedorYahoo, type Cierre } from './proveedor-precios';

// Fase 11 · Cachea los cierres diarios en `precios_mercado` para no repetir
// la petición a Yahoo Finance por cada cliente: se pide una sola vez por
// clase de activo el rango que cubre a todos los clientes que hay que
// revisar hoy, y cada cliente lee de la caché el tramo que le corresponde
// desde su propia fecha de análisis.

/**
 * Descarga los cierres de una clase desde `desde` hasta hoy y los guarda en
 * `precios_mercado` (upsert por fecha). Si Yahoo falla, propaga el error:
 * sin dato fiable, no hay caché que actualizar para esa clase hoy (R9).
 */
export async function actualizarCachePrecios(clase: ClaseMercado, desde: Date, hasta: Date): Promise<void> {
  const cierres = await proveedorYahoo.obtenerCierres(PROXY_YAHOO[clase], desde, hasta);
  if (cierres.length === 0) return;

  const { error } = await supabaseServidor
    .from('precios_mercado')
    .upsert(
      cierres.map((c) => ({ clase_activo: clase, fecha: c.fecha, cierre: c.cierre })),
      { onConflict: 'clase_activo,fecha' },
    );

  if (error) throw new Error(`No se pudo guardar la caché de precios de "${clase}": ${error.message}`);
}

/** Cierres cacheados de una clase desde una fecha (inclusive) hasta hoy. */
export async function cierresDesde(clase: ClaseMercado, desde: Date): Promise<Cierre[]> {
  const { data, error } = await supabaseServidor
    .from('precios_mercado')
    .select('fecha, cierre')
    .eq('clase_activo', clase)
    .gte('fecha', desde.toISOString().slice(0, 10))
    .order('fecha', { ascending: true });

  if (error) throw new Error(`No se pudo leer la caché de precios de "${clase}": ${error.message}`);
  return (data ?? []) as Cierre[];
}
