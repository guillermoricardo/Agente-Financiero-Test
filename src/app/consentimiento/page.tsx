'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// docs/business.md § "Protección de datos (LFPDPPP)": el consentimiento
// tiene que declarar las DOS finalidades (diagnóstico + contacto comercial)
// y aceptarse con una acción explícita, no una frase escrita en el chat.
// Por eso esto es una casilla que hay que marcar a propósito, no un botón
// que ya viene aceptado por defecto.
export default function Consentimiento() {
  const router = useRouter();
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function empezar() {
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/entrevistas', { method: 'POST' });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? 'Algo salió mal. Intenta de nuevo.');
        setEnviando(false);
        return;
      }
      router.push(`/entrevista/${cuerpo.token}`);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Antes de empezar
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          Te vamos a hacer algunas preguntas sobre tu situación financiera
          —ingresos, ahorro, deudas, tu meta— para armar tu diagnóstico. Esto
          es lo que necesitas saber antes de continuar:
        </p>

        <ul className="mt-6 space-y-4 text-base leading-7 text-zinc-700">
          <li className="flex gap-3">
            <span aria-hidden className="mt-1 text-zinc-400">
              →
            </span>
            <span>
              Usamos lo que nos cuentes para calcular tu diagnóstico
              financiero. El motor que hace las cuentas es código, no una
              IA: nadie inventa tus números.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-1 text-zinc-400">
              →
            </span>
            <span>
              Tu nombre y correo también se usan para que un asesor humano
              pueda contactarte más adelante sobre tu diagnóstico.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-1 text-zinc-400">
              →
            </span>
            <span>
              Esto es orientación educativa, no asesoramiento financiero
              regulado. No recomendamos productos concretos ni prometemos
              rentabilidades.
            </span>
          </li>
        </ul>

        <label className="mt-8 flex cursor-pointer items-start gap-3 text-base text-zinc-800">
          <input
            type="checkbox"
            checked={acepto}
            onChange={(evento) => setAcepto(evento.target.checked)}
            className="mt-1 h-5 w-5 flex-shrink-0 rounded border-zinc-300"
          />
          <span>
            Acepto que se procesen mis datos para el diagnóstico y que un
            asesor pueda contactarme.
          </span>
        </label>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!acepto || enviando}
          onClick={empezar}
          className="mt-8 w-full rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {enviando ? 'Preparando tu diagnóstico…' : 'Empezar mi diagnóstico'}
        </button>
      </div>
    </div>
  );
}
