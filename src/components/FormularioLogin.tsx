'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador';

// Fase 9 · Login del panel. docs/user-flows.md § Flujo 2: "Login con
// correo." Correo + contraseña (decisión del usuario, no hay más detalle en
// la documentación): Marta no se da de alta sola — su usuario se crea a
// mano en Supabase (Authentication → Users) y se enlaza a `asesores` por
// SQL, igual que cualquier otra migración (ver CLAUDE.md § "Cambios en la
// base de datos").
export default function FormularioLogin() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const supabase = crearClienteNavegador();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: contrasena,
    });

    if (errorLogin) {
      setError('Correo o contraseña incorrectos.');
      setEnviando(false);
      return;
    }

    router.push('/panel');
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Panel de la asesora</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Inicia sesión para ver tus leads.</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[15px] text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[15px] text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
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
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
