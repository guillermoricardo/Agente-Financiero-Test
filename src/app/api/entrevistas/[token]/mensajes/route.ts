import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import { hashearIp, obtenerIpDeLaPeticion } from '@/lib/limites/ip';
import { claude, MODELO_ENTREVISTA } from '@/lib/claude/cliente';
import { construirPromptSistema } from '@/lib/claude/prompt';
import { HERRAMIENTA_GUARDAR_CONTACTO, HERRAMIENTA_GUARDAR_DATO } from '@/lib/claude/herramientas';
import {
  calcularProgreso,
  extraerDenormalizados,
  fusionarDato,
  resumenFichaParaPrompt,
  type FichaParcial,
} from '@/lib/claude/ficha-entrevista';

// docs/architecture.md § "Protección del flujo público" pide un tope de
// mensajes por entrevista además del límite de creación de entrevistas que
// ya existía desde la Fase 3. La propia plantilla (docs/criterio/
// plantilla-entrevista.md) ya le pide al modelo que cierre sola la
// conversación sobre los ~12 intercambios (~24-30 mensajes contando ambos
// roles, apertura y cierre incluidos). Este tope es más alto a propósito: es
// una red de seguridad técnica por si alguien llama a esta ruta directamente
// sin pasar por el chat, no el límite "natural" de una entrevista normal.
const TOPE_MENSAJES_POR_ENTREVISTA = 60;
// Mismo razonamiento que LIMITE_ENTREVISTAS_POR_HORA en
// src/app/api/entrevistas/route.ts: una entrevista normal ronda los 24-30
// mensajes, así que 60 por hora y por IP deja margen de sobra para una
// conversación real (incluso si alguien abre dos) sin dejar la puerta
// abierta a vaciar el saldo de la API recargando en bucle.
const LIMITE_MENSAJES_POR_HORA = 60;

// Fase 5: la ficha se va rellenando fila a fila mientras se conversa, en
// `version = 1`. docs/data-model.md § "Por qué las fichas se versionan"
// habla de fichas CERRADAS: esta versión 1 sigue "en construcción" hasta que
// exista una pantalla de confirmación (Fase 6) que la cierre. Actualizarla
// en el sitio mientras tanto no viola esa regla — nada se sobrescribe
// después de cerrado, porque todavía no se ha cerrado nada.
const VERSION_FICHA_EN_CURSO = 1;

export async function POST(
  peticion: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const { data: entrevista, error: errorEntrevista } = await supabaseServidor
    .from('entrevistas')
    .select('id, expira_en, cliente_id')
    .eq('token', token)
    .maybeSingle();

  if (errorEntrevista || !entrevista) {
    return NextResponse.json({ error: 'Entrevista no encontrada.' }, { status: 404 });
  }

  // Capturado en un const aparte para las funciones anidadas más abajo: TS
  // no propaga el narrowing de `entrevista` (posiblemente null) a través de
  // un closure, aunque nunca se reasigna.
  const entrevistaId = entrevista.id;

  if (new Date(entrevista.expira_en) < new Date()) {
    return NextResponse.json({ error: 'Este enlace ya caducó.' }, { status: 410 });
  }

  let cuerpo: { contenido?: unknown };
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 });
  }

  const contenido = typeof cuerpo.contenido === 'string' ? cuerpo.contenido.trim() : '';
  if (!contenido) {
    return NextResponse.json({ error: 'El mensaje está vacío.' }, { status: 400 });
  }

  const ip = await obtenerIpDeLaPeticion();
  const ipHash = hashearIp(ip);
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: mensajesUltimaHora, error: errorConteoIp } = await supabaseServidor
    .from('limites_uso')
    .select('id', { count: 'exact' })
    .eq('ip_hash', ipHash)
    .eq('accion', 'enviar_mensaje')
    .gte('creado_en', haceUnaHora);

  if (errorConteoIp) {
    return NextResponse.json(
      { error: 'No se pudo comprobar el límite de uso. Intenta de nuevo.' },
      { status: 500 },
    );
  }

  if ((mensajesUltimaHora ?? 0) >= LIMITE_MENSAJES_POR_HORA) {
    return NextResponse.json(
      {
        error:
          'Se alcanzó el límite de mensajes desde tu conexión. Vuelve a intentarlo en un rato.',
      },
      { status: 429 },
    );
  }

  const { count: totalMensajes, error: errorConteoTotal } = await supabaseServidor
    .from('mensajes')
    .select('id', { count: 'exact' })
    .eq('entrevista_id', entrevista.id);

  if (errorConteoTotal) {
    return NextResponse.json(
      { error: 'No se pudo comprobar el estado de la entrevista.' },
      { status: 500 },
    );
  }

  if ((totalMensajes ?? 0) >= TOPE_MENSAJES_POR_ENTREVISTA) {
    return NextResponse.json(
      { error: 'Esta entrevista llegó a su límite de mensajes.' },
      { status: 429 },
    );
  }

  await supabaseServidor
    .from('limites_uso')
    .insert({ ip_hash: ipHash, accion: 'enviar_mensaje' });

  // Se guarda el mensaje del cliente ANTES de llamar al modelo: si la
  // llamada a la API falla después, lo que escribió no se pierde.
  const { error: errorGuardarCliente } = await supabaseServidor.from('mensajes').insert({
    entrevista_id: entrevista.id,
    rol: 'cliente',
    contenido,
  });

  if (errorGuardarCliente) {
    return NextResponse.json({ error: 'No se pudo guardar tu mensaje.' }, { status: 500 });
  }

  // docs/architecture.md § "Por qué los mensajes se guardan desde el primer
  // turno": el modelo no tiene memoria, así que se relee la conversación
  // entera en cada turno.
  const { data: historial, error: errorHistorial } = await supabaseServidor
    .from('mensajes')
    .select('rol, contenido')
    .eq('entrevista_id', entrevista.id)
    .order('id', { ascending: true });

  if (errorHistorial || !historial) {
    return NextResponse.json({ error: 'No se pudo leer la conversación.' }, { status: 500 });
  }

  const mensajesParaClaude: Anthropic.MessageParam[] = historial.map((mensaje) => ({
    role: mensaje.rol === 'agente' ? 'assistant' : 'user',
    content: mensaje.contenido,
  }));

  let clienteIdVinculado = entrevista.cliente_id as string | null;

  // Estado de la ficha en curso. Solo puede existir si ya hay cliente
  // (fichas.cliente_id no admite NULL — docs/data-model.md § invariante
  // deliberado), lo cual siempre pasa después de que se llame a
  // guardar_contacto, antes del bloque 1.
  let fichaId: string | null = null;
  let datosFicha: FichaParcial = {};

  if (clienteIdVinculado) {
    const { data: fichaExistente } = await supabaseServidor
      .from('fichas')
      .select('id, datos')
      .eq('entrevista_id', entrevista.id)
      .eq('version', VERSION_FICHA_EN_CURSO)
      .maybeSingle();

    if (fichaExistente) {
      fichaId = fichaExistente.id;
      datosFicha = (fichaExistente.datos as FichaParcial) ?? {};
    }
  }

  function herramientasDisponibles(): Anthropic.Tool[] {
    // guardar_contacto solo tiene sentido antes de vincular cliente;
    // guardar_dato solo tiene sentido después (la ficha exige cliente_id).
    return clienteIdVinculado ? [HERRAMIENTA_GUARDAR_DATO] : [HERRAMIENTA_GUARDAR_CONTACTO];
  }

  async function guardarFichaEnCurso() {
    if (!clienteIdVinculado) return;

    const denormalizados = extraerDenormalizados(datosFicha);

    if (fichaId) {
      await supabaseServidor
        .from('fichas')
        .update({ datos: datosFicha, ...denormalizados })
        .eq('id', fichaId);
    } else {
      const { data: fichaNueva, error: errorFicha } = await supabaseServidor
        .from('fichas')
        .insert({
          cliente_id: clienteIdVinculado,
          entrevista_id: entrevistaId,
          version: VERSION_FICHA_EN_CURSO,
          datos: datosFicha,
          ...denormalizados,
        })
        .select('id')
        .single();

      if (!errorFicha && fichaNueva) {
        fichaId = fichaNueva.id;
      } else {
        console.error('No se pudo crear la ficha en curso:', errorFicha);
      }
    }
  }

  try {
    let respuesta = await claude.messages.create({
      model: MODELO_ENTREVISTA,
      max_tokens: 1024,
      system: construirPromptSistema(resumenFichaParaPrompt(datosFicha)),
      tools: herramientasDisponibles(),
      messages: mensajesParaClaude,
    });

    // El modelo puede llamar a varias herramientas en el mismo turno (por
    // ejemplo, dos guardar_dato si el cliente dio dos datos en un mensaje).
    // Se procesan TODAS antes de devolverle los resultados, en una sola
    // vuelta de tool_result por bloque.
    while (respuesta.stop_reason === 'tool_use') {
      const bloquesHerramienta = respuesta.content.filter(
        (bloque): bloque is Anthropic.ToolUseBlock => bloque.type === 'tool_use',
      );

      if (bloquesHerramienta.length === 0) break;

      const resultados: { tool_use_id: string; contenido: string }[] = [];

      for (const bloque of bloquesHerramienta) {
        if (bloque.name === 'guardar_contacto') {
          const entrada = bloque.input as { nombre?: string; email?: string };
          const nombre = (entrada.nombre ?? '').trim();
          // Normalizado a minúsculas antes de insertar, tal como pide
          // docs/data-model.md § "Por qué el correo es único".
          const email = (entrada.email ?? '').trim().toLowerCase();

          let resultadoHerramienta = 'Contacto guardado.';

          if (nombre && email) {
            const { data: clienteExistente } = await supabaseServidor
              .from('clientes')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            let clienteId = clienteExistente?.id as string | undefined;

            if (!clienteId) {
              const { data: clienteNuevo, error: errorCliente } = await supabaseServidor
                .from('clientes')
                .insert({ nombre, email })
                .select('id')
                .single();

              if (errorCliente || !clienteNuevo) {
                resultadoHerramienta =
                  'No se pudo guardar el contacto por un error técnico. Discúlpate brevemente y sigue de todas formas.';
              } else {
                clienteId = clienteNuevo.id;
              }
            }

            if (clienteId) {
              await supabaseServidor
                .from('entrevistas')
                .update({ cliente_id: clienteId })
                .eq('id', entrevista.id);
              clienteIdVinculado = clienteId;
            }
          } else {
            resultadoHerramienta = 'Faltan datos: pide el que no tengas todavía antes de continuar.';
          }

          resultados.push({ tool_use_id: bloque.id, contenido: resultadoHerramienta });
        } else if (bloque.name === 'guardar_dato') {
          const entrada = bloque.input as {
            clave?: string;
            valor?: unknown;
            etiqueta?: string;
            cita?: string;
            supuesto?: string;
          };

          if (!entrada.clave) {
            resultados.push({ tool_use_id: bloque.id, contenido: 'Falta la clave del dato.' });
            continue;
          }

          datosFicha = fusionarDato(datosFicha, {
            clave: entrada.clave,
            valor: entrada.valor,
            etiqueta: entrada.etiqueta,
            cita: entrada.cita,
            supuesto: entrada.supuesto,
          });
          await guardarFichaEnCurso();

          resultados.push({ tool_use_id: bloque.id, contenido: 'Dato guardado.' });
        } else {
          resultados.push({ tool_use_id: bloque.id, contenido: 'Herramienta desconocida.' });
        }
      }

      respuesta = await claude.messages.create({
        model: MODELO_ENTREVISTA,
        max_tokens: 1024,
        system: construirPromptSistema(resumenFichaParaPrompt(datosFicha)),
        tools: herramientasDisponibles(),
        messages: [
          ...mensajesParaClaude,
          { role: 'assistant', content: respuesta.content },
          {
            role: 'user',
            content: resultados.map((resultado) => ({
              type: 'tool_result' as const,
              tool_use_id: resultado.tool_use_id,
              content: resultado.contenido,
            })),
          },
        ],
      });
    }

    const textoRespuesta = respuesta.content
      .filter((bloque): bloque is Anthropic.TextBlock => bloque.type === 'text')
      .map((bloque) => bloque.text)
      .join('\n\n')
      .trim();

    if (!textoRespuesta) {
      throw new Error('El modelo no devolvió texto.');
    }

    const { error: errorGuardarAgente } = await supabaseServidor.from('mensajes').insert({
      entrevista_id: entrevista.id,
      rol: 'agente',
      contenido: textoRespuesta,
    });

    if (errorGuardarAgente) {
      return NextResponse.json({ error: 'No se pudo guardar la respuesta.' }, { status: 500 });
    }

    return NextResponse.json({ contenido: textoRespuesta, progreso: calcularProgreso(datosFicha) });
  } catch (error) {
    console.error('Error llamando a la API de Anthropic:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener respuesta del asistente. Intenta de nuevo.' },
      { status: 502 },
    );
  }
}
