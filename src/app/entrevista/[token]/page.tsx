import { notFound } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import ChatEntrevista, { type MensajeChat } from '@/components/ChatEntrevista';

// docs/roadmap.md Fase 3, "comprobación que importa": sin aceptar el
// consentimiento no se puede llegar aquí de ninguna forma. Esto se cumple
// porque la única manera de obtener un token válido es que
// POST /api/entrevistas lo genere al aceptar — un token que no existe en la
// tabla (inventado, mal copiado, o de una entrevista que nunca se creó) da
// 404, no una entrevista vacía.
//
// Fase 4: el chat de verdad, siguiendo docs/criterio/plantilla-entrevista.md.
// La apertura es "guion literal" según ese documento, así que se inserta tal
// cual como primer mensaje del agente en cuanto la entrevista no tiene
// ninguno todavía — sin llamar al modelo para generarla: es determinista, no
// cuesta nada y garantiza que dice exactamente lo que el guion pide.
const APERTURA_LITERAL =
  '¡Hola! Soy el asistente de Marta. Antes de vuestra primera reunión, me ha pedido que te haga unas preguntas rápidas —no más de 5 minutos— para que ella llegue con los deberes hechos y la reunión sea 100% útil para ti.\nTodo lo que me cuentes queda entre tú y su despacho, y no necesito cifras exactas: con aproximaciones me vale. ¿Empezamos?';

export default async function Entrevista({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: entrevista } = await supabaseServidor
    .from('entrevistas')
    .select('id, token, estado, consentimiento_en, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    notFound();
  }

  const expirada = new Date(entrevista.expira_en) < new Date();

  if (expirada) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Este enlace ya caducó</h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            Las entrevistas duran 30 días. Empieza una nueva desde el inicio.
          </p>
        </div>
      </div>
    );
  }

  const { data: mensajesGuardados } = await supabaseServidor
    .from('mensajes')
    .select('rol, contenido')
    .eq('entrevista_id', entrevista.id)
    .order('id', { ascending: true });

  let mensajesIniciales: MensajeChat[] = mensajesGuardados ?? [];

  if (mensajesIniciales.length === 0) {
    await supabaseServidor.from('mensajes').insert({
      entrevista_id: entrevista.id,
      rol: 'agente',
      contenido: APERTURA_LITERAL,
    });
    mensajesIniciales = [{ rol: 'agente', contenido: APERTURA_LITERAL }];
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-8">
      <ChatEntrevista token={entrevista.token} mensajesIniciales={mensajesIniciales} />
    </div>
  );
}
