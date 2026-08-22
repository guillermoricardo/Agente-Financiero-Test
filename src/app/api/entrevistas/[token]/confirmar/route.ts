import { NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { aplicarCorrecciones, extraerDenormalizados, type FichaParcial } from '@/lib/claude/ficha-entrevista';
import { generarAnalisis, normalizarFicha, VERSION_MOTOR, VERSION_REGLAS } from '@/lib/analisis/generar-analisis';
import { clasificarMeta } from '@/lib/analisis/clasificar-meta';

// Fase 6 · "Confirmación y cierre". docs/data-model.md § "Por qué las fichas
// se versionan": una ficha CERRADA nunca se sobrescribe. Antes de este
// momento, la ficha de la Fase 5 vivía "en curso" en `version = 1`,
// actualizándose en el sitio (ver el comentario de VERSION_FICHA_EN_CURSO en
// la ruta del chat) — nada se había cerrado todavía. Confirmar aquí ES el
// momento de cierre: la primera vez, se cierra esa misma fila en curso; si
// alguien vuelve a llamar a esta ruta sobre una entrevista que YA estaba
// `completada` (una corrección después del cierre), se crea una fila nueva
// con la siguiente versión en vez de tocar la que ya se cerró.
//
// Fase 7 · "Diagnóstico". docs/roadmap.md no dice CUÁNDO se dispara el
// cálculo — solo que una ficha completa debe producir un análisis. Todavía
// no existe el panel de Marta (Fase 9) desde el que lanzarlo a mano, así
// que se decidió dispararlo aquí mismo, en el instante en que la ficha
// queda cerrada: es el primer momento en que hay una ficha "de verdad" (ni
// en curso, ni corregible sin más) sobre la que calcular. Un fallo en el
// análisis NO impide que el cliente vea su confirmación — la ficha y el
// cierre de la entrevista ya se guardaron antes de intentarlo — pero sí se
// avisa en la respuesta para que quede constancia.
export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const { data: entrevista, error: errorEntrevista } = await supabaseServidor
    .from('entrevistas')
    .select('id, cliente_id, expira_en, estado')
    .eq('token', token)
    .maybeSingle();

  if (errorEntrevista || !entrevista) {
    return NextResponse.json({ error: 'Entrevista no encontrada.' }, { status: 404 });
  }

  if (!entrevista.cliente_id) {
    return NextResponse.json(
      { error: 'Todavía no hay nada que confirmar en esta entrevista.' },
      { status: 400 },
    );
  }

  if (new Date(entrevista.expira_en) < new Date()) {
    return NextResponse.json({ error: 'Este enlace ya caducó.' }, { status: 410 });
  }

  let cuerpo: { valores?: unknown };
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 });
  }

  const valores =
    cuerpo.valores && typeof cuerpo.valores === 'object'
      ? (cuerpo.valores as Record<string, string | number | null>)
      : null;

  if (!valores) {
    return NextResponse.json({ error: 'Faltan los datos a confirmar.' }, { status: 400 });
  }

  const { data: fichas, error: errorFichas } = await supabaseServidor
    .from('fichas')
    .select('id, version, datos')
    .eq('entrevista_id', entrevista.id)
    .order('version', { ascending: false })
    .limit(1);

  if (errorFichas) {
    return NextResponse.json({ error: 'No se pudo leer la ficha.' }, { status: 500 });
  }

  const fichaActual = fichas?.[0];

  if (!fichaActual) {
    return NextResponse.json(
      { error: 'Todavía no hay ninguna ficha para esta entrevista.' },
      { status: 400 },
    );
  }

  const datosCorregidos = aplicarCorrecciones((fichaActual.datos as FichaParcial) ?? {}, valores);
  // Fase 7: docs/data-model.md § "Campos denormalizados" reserva
  // `tipo_de_meta` en `fichas` para que el panel de Marta pueda filtrar sin
  // abrir el jsonb — hasta ahora nada lo escribía. §3 de
  // instrucciones-motor.md es la misma clasificación que usa el análisis.
  const tipoMeta = clasificarMeta(normalizarFicha(datosCorregidos));
  const denormalizados = { ...extraerDenormalizados(datosCorregidos), tipo_de_meta: tipoMeta.tipo };
  const yaEstabaCerrada = entrevista.estado === 'completada';

  // Fase 7: se necesita saber sobre qué `fichas.id` referenciar el análisis
  // — la misma fila si se actualizó en el sitio, o la fila nueva si se
  // versionó por ser una corrección posterior al cierre.
  let fichaId = fichaActual.id;

  if (yaEstabaCerrada) {
    // Corrección posterior al cierre: se versiona, no se pisa la fila
    // cerrada — ver el comentario de arriba.
    const { data: fichaNueva, error: errorInsertar } = await supabaseServidor
      .from('fichas')
      .insert({
        cliente_id: entrevista.cliente_id,
        entrevista_id: entrevista.id,
        version: fichaActual.version + 1,
        datos: datosCorregidos,
        ...denormalizados,
      })
      .select('id')
      .single();

    if (errorInsertar || !fichaNueva) {
      return NextResponse.json({ error: 'No se pudo guardar la corrección.' }, { status: 500 });
    }
    fichaId = fichaNueva.id;
  } else {
    const { error: errorActualizar } = await supabaseServidor
      .from('fichas')
      .update({ datos: datosCorregidos, ...denormalizados })
      .eq('id', fichaActual.id);

    if (errorActualizar) {
      return NextResponse.json({ error: 'No se pudo guardar la ficha.' }, { status: 500 });
    }
  }

  const { error: errorCerrar } = await supabaseServidor
    .from('entrevistas')
    .update({ estado: 'completada', completada_en: new Date().toISOString() })
    .eq('id', entrevista.id);

  if (errorCerrar) {
    return NextResponse.json({ error: 'La ficha se guardó, pero no se pudo cerrar la entrevista.' }, { status: 500 });
  }

  // Fase 7: calcular el diagnóstico ahora que la ficha está cerrada. Nunca
  // bloquea la confirmación del cliente — ya se guardó todo lo de arriba —
  // pero un fallo aquí sí se avisa en la respuesta.
  let analisisGuardado = true;
  try {
    const resultado = generarAnalisis(datosCorregidos);
    const { error: errorAnalisis } = await supabaseServidor.from('analisis').insert({
      ficha_id: fichaId,
      modo: resultado.modo,
      resultado,
      version_motor: VERSION_MOTOR,
      version_reglas: VERSION_REGLAS,
    });
    if (errorAnalisis) {
      analisisGuardado = false;
      console.error('No se pudo guardar el análisis:', errorAnalisis);
    }
  } catch (error) {
    analisisGuardado = false;
    console.error('Error calculando el análisis:', error);
  }

  return NextResponse.json({ ok: true, analisisGuardado });
}
