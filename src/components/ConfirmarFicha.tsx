'use client';

import { useState, type FormEvent } from 'react';

export interface CampoConfirmable {
  clave: string;
  etiquetaCampo: string;
  tipo: 'texto' | 'numero';
  valor: string;
  etiquetaCalidad: 'confirmado' | 'estimado' | 'pendiente' | null;
}

// Fase 6 · "Confirmación y cierre". Pantalla de resumen editable en lenguaje
// llano: cada campo se muestra ya relleno con lo que se recogió en el chat,
// el cliente corrige lo que haga falta y al enviar, todo lo que cambió pasa
// a `confirmado` (la lógica vive en aplicarCorrecciones, en el servidor).
export default function ConfirmarFicha({
  token,
  nombreCliente,
  campos,
  resumenDeudas,
}: {
  token: string;
  nombreCliente: string;
  campos: CampoConfirmable[];
  resumenDeudas: string;
}) {
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(campos.map((c) => [c.clave, c.valor])),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch(`/api/entrevistas/${token}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valores }),
      });

      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        setError(cuerpo.error ?? 'Algo salió mal. Intenta de nuevo.');
        return;
      }

      setConfirmado(true);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (confirmado) {
    return (
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">¡Listo, gracias!</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          Con esto, Marta prepara tu diagnóstico completo. Te lo presenta ella
          en vuestra reunión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="w-full max-w-lg">
      <h1 className="text-xl font-semibold text-zinc-900">
        {nombreCliente ? `Revisa tu resumen, ${nombreCliente}` : 'Revisa tu resumen'}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Esto es lo que recogimos en la conversación. Corrige lo que haga
        falta antes de confirmar.
      </p>

      <div className="mt-6 space-y-4">
        {campos.map((campo) => (
          <label key={campo.clave} className="block">
            <span className="flex items-center justify-between text-sm font-medium text-zinc-700">
              {campo.etiquetaCampo}
              {campo.etiquetaCalidad && campo.etiquetaCalidad !== 'confirmado' && (
                <span className="text-xs font-normal text-amber-700">{campo.etiquetaCalidad}</span>
              )}
            </span>
            <input
              type={campo.tipo === 'numero' ? 'number' : 'text'}
              value={valores[campo.clave]}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, [campo.clave]: evento.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[15px] text-zinc-900 outline-none focus:border-zinc-500"
            />
          </label>
        ))}

        <div>
          <span className="text-sm font-medium text-zinc-700">Deudas</span>
          <p className="mt-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm leading-6 text-zinc-700">
            {resumenDeudas}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Si algo de esto no es correcto, coméntaselo a Marta en la reunión.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-600">
        Esto es orientación educativa, no asesoramiento financiero regulado.
        El diagnóstico que prepara Marta te ayuda a entender tu situación,
        pero cualquier decisión la toma ella contigo, en vuestra reunión.
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {enviando ? 'Confirmando…' : 'Confirmar y terminar'}
      </button>
    </form>
  );
}
