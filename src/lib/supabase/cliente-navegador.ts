'use client';

import { createBrowserClient } from '@supabase/ssr';

// Fase 9 · Cliente de navegador para la sesión de Marta (Supabase Auth). A
// diferencia de `cliente-publico.ts` (que solo hace lecturas puntuales),
// este usa `@supabase/ssr` porque sabe leer y escribir la sesión en cookies
// — así el servidor (middleware, Server Components) puede ver la misma
// sesión que el navegador. Solo se usa en la pantalla de login.
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Revisa tu .env.local (cópialo desde .env.example si no existe).',
    );
  }

  return createBrowserClient(url, anonKey);
}
