import { createClient } from '@supabase/supabase-js';

// Cliente público (browser). Usa la clave `anon`, segura para el navegador
// porque toda la seguridad real vive en RLS + en que no hay políticas para
// el rol `anon` en las tablas con datos financieros (ver docs/architecture.md
// § "El cliente nunca habla con la base de datos").
//
// Uso previsto: componentes de cliente que necesiten leer datos públicos o
// gestionar sesión de Supabase Auth (login de la asesora). El cliente final
// (quien hace la entrevista) NO usa esto para escribir su ficha: sus
// mensajes pasan por rutas de servidor (ver cliente-servidor.ts).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Revisa tu .env.local (cópialo desde .env.example si no existe).',
  );
}

export const supabasePublico = createClient(url, anonKey);
