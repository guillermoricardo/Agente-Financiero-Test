import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Fase 9 · Puerta del panel. docs/user-flows.md § Flujo 2: "Solo quien esté
// dado de alta como asesor entra." Se comprueba en dos capas: aquí (¿hay
// sesión?) y en RLS vía `es_asesor()` (¿esa sesión está en la tabla
// `asesores`?) — este middleware solo puede saber si hay sesión, no si es de
// un asesor, así que la comprobación de verdad ocurre al leer datos.
//
// También refresca el token de sesión en cada petición: sin esto, la sesión
// de Marta caducaría mientras usa el panel.
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return respuesta;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaEscribir) {
        for (const { name, value } of cookiesParaEscribir) {
          request.cookies.set(name, value);
        }
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaEscribir) {
          respuesta.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esLogin = pathname === '/panel/login';

  if (!user && !esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/panel/login';
    return NextResponse.redirect(destino);
  }

  if (user && esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/panel';
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: ['/panel/:path*'],
};
