'use client';

import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente-navegador';

export default function BotonCerrarSesion() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push('/panel/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      Cerrar sesión
    </button>
  );
}
