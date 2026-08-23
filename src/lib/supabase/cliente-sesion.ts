import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Fase 9 · Cliente de servidor QUE SÍ RESPETA LA SESIÓN de quien hace la
// petición (a diferencia de `cliente-servidor.ts`, que usa la service role
// key y salta RLS por completo). Este cliente lee la cookie de sesión que
// dejó `cliente-navegador.ts` al iniciar sesión, y todo lo que lee pasa por
// las políticas RLS de `es_asesor()` — si la sesión no es de alguien dado de
// alta en `asesores`, las consultas devuelven vacío, no un error.
//
// Uso previsto: únicamente dentro de `src/app/panel/**` (Server Components y
// rutas de servidor que sirven el panel de Marta).
export async function crearClienteSesion() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Revisa tu .env.local (cópialo desde .env.example si no existe).',
    );
  }

  const almacenCookies = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesParaEscribir) {
        // En un Server Component no se pueden escribir cookies (Next.js lo
        // impide). El middleware (`src/middleware.ts`) es quien de verdad
        // refresca la sesión en cada petición; este catch solo evita que
        // Next.js lance un error si Supabase intenta escribirlas aquí.
        try {
          for (const { name, value, options } of cookiesParaEscribir) {
            almacenCookies.set(name, value, options);
          }
        } catch {
          // Ignorado a propósito: ver comentario de arriba.
        }
      },
    },
  });
}
