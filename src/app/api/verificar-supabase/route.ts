import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';

// ⚠️ RUTA TEMPORAL — solo para confirmar a mano que la Fase 2 quedó
// conectada de verdad. No forma parte del producto: bórrala (o el panel de
// la Fase 9 la sustituye) una vez confirmado que responde "conectado: true".
// No expone datos sensibles: solo cuenta filas, no las lee.
export async function GET() {
  // Nota: se pide `count: 'exact'` sin `head: true` porque, contra este
  // proyecto, la variante `head: true` (petición HEAD, sin cuerpo) devolvía
  // el conteo como `null` en vez de un número — pedir también los datos
  // (aunque la tabla esté vacía) hace que Supabase sí calcule y devuelva el
  // conteo de forma consistente.
  const { data, count, error } = await supabaseServidor
    .from('asesores')
    .select('id', { count: 'exact' });

  if (error) {
    return NextResponse.json(
      { conectado: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    conectado: true,
    mensaje:
      'La aplicación conectó con Supabase y pudo consultar la tabla "asesores".',
    filas_en_asesores: count ?? data.length,
  });
}
