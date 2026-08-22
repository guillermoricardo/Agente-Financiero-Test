'use client';

import { useRef, useState, useEffect, type FormEvent } from 'react';

export interface MensajeChat {
  rol: 'agente' | 'cliente';
  contenido: string;
}

export interface ProgresoFicha {
  bloquesCompletos: number;
  totalBloques: number;
  bloques: { numero: number; titulo: string; completo: boolean }[];
}

// docs/design-system.md: calma antes que impacto. La barra de progreso
// (Fase 5) es deliberadamente discreta — puntos, no una barra con
// porcentaje: nadie necesita saber "43%", solo tener una idea de cuánto
// falta. El detalle de cada bloque solo aparece al pasar el cursor/tocar.
function BarraDeProgreso({ progreso }: { progreso: ProgresoFicha }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-1.5" aria-hidden={false}>
      {progreso.bloques.map((bloque) => (
        <span
          key={bloque.numero}
          title={`${bloque.numero}. ${bloque.titulo}${bloque.completo ? ' — cubierto' : ''}`}
          className={`h-1.5 w-5 rounded-full transition-colors ${
            bloque.completo ? 'bg-zinc-800' : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function ChatEntrevista({
  token,
  mensajesIniciales,
  progresoInicial,
}: {
  token: string;
  mensajesIniciales: MensajeChat[];
  progresoInicial: ProgresoFicha;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>(mensajesIniciales);
  const [progreso, setProgreso] = useState<ProgresoFicha>(progresoInicial);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  async function enviarMensaje(evento: FormEvent) {
    evento.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setError(null);
    setEnviando(true);
    setTexto('');
    setMensajes((actuales) => [...actuales, { rol: 'cliente', contenido }]);

    try {
      const respuesta = await fetch(`/api/entrevistas/${token}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        setError(cuerpo.error ?? 'Algo salió mal. Intenta de nuevo.');
        return;
      }

      setMensajes((actuales) => [...actuales, { rol: 'agente', contenido: cuerpo.contenido }]);
      if (cuerpo.progreso) {
        setProgreso(cuerpo.progreso);
      }
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-1 flex-col">
      <BarraDeProgreso progreso={progreso} />

      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {mensajes.map((mensaje, indice) => (
          <div
            key={indice}
            className={`flex ${mensaje.rol === 'cliente' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
                mensaje.rol === 'cliente'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-800 shadow-sm'
              }`}
            >
              {mensaje.contenido}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-white px-4 py-2.5 text-[15px] text-zinc-400 shadow-sm">
              Escribiendo…
            </div>
          </div>
        )}
        <div ref={finalRef} />
      </div>

      {error && (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={enviarMensaje} className="flex gap-2 border-t border-zinc-200 pt-4">
        <input
          type="text"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          disabled={enviando}
          placeholder="Escribe tu respuesta…"
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-zinc-500 disabled:bg-zinc-100"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
