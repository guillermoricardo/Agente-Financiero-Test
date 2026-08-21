import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { hashearIp, obtenerIpDeLaPeticion } from '@/lib/limites/ip';

// docs/roadmap.md Fase 3 y docs/architecture.md § "Protección del flujo
// público" piden un límite de entrevistas nuevas por IP y hora, pero no fijan
// la cifra exacta. 5 por hora es un punto de partida razonable — de sobra
// para que alguien reintente si algo falla, y suficientemente bajo para que
// recargar la página en bucle no vacíe el saldo de la API. Si en producción
// resulta muy restrictivo o muy laxo, se ajusta aquí.
const LIMITE_ENTREVISTAS_POR_HORA = 5;

export async function POST() {
  const ip = await obtenerIpDeLaPeticion();
  const ipHash = hashearIp(ip);

  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error: errorConteo } = await supabaseServidor
    .from('limites_uso')
    .select('id', { count: 'exact' })
    .eq('ip_hash', ipHash)
    .eq('accion', 'crear_entrevista')
    .gte('creado_en', haceUnaHora);

  if (errorConteo) {
    return NextResponse.json(
      { error: 'No se pudo comprobar el límite de uso. Intenta de nuevo.' },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= LIMITE_ENTREVISTAS_POR_HORA) {
    return NextResponse.json(
      {
        error:
          'Se alcanzó el límite de diagnósticos nuevos desde tu conexión. Vuelve a intentarlo en un rato.',
      },
      { status: 429 },
    );
  }

  // consentimiento_en, iniciada_en y expira_en toman su default de la base
  // de datos (now(), now(), now() + 30 días) — se crea en el momento exacto
  // de aceptar, tal como exige docs/data-model.md.
  const { data: entrevista, error: errorCrear } = await supabaseServidor
    .from('entrevistas')
    .insert({})
    .select('token')
    .single();

  if (errorCrear || !entrevista) {
    return NextResponse.json(
      { error: 'No se pudo crear la entrevista. Intenta de nuevo.' },
      { status: 500 },
    );
  }

  const { error: errorRegistroLimite } = await supabaseServidor
    .from('limites_uso')
    .insert({ ip_hash: ipHash, accion: 'crear_entrevista' });

  if (errorRegistroLimite) {
    // La entrevista ya se creó: no tiene sentido bloquear al visitante por
    // esto. Se deja constancia para revisar logs, pero se sigue el flujo.
    console.error('No se pudo registrar el límite de uso:', errorRegistroLimite);
  }

  return NextResponse.json({ token: entrevista.token });
}
