# Clientes de Supabase (público y de servidor)

**Fecha:** 2026-08-20 19:19
**Tipo:** Feature

## Qué se hizo

Segunda mitad de la Fase 2 del roadmap, después de aplicar el esquema inicial
(`0001_esquema_inicial.sql`) en el proyecto de Supabase del usuario (región
Americas, `us-east-2`):

- `src/lib/supabase/cliente-publico.ts` — cliente con la clave `anon`, para
  usarse desde componentes de cliente (p.ej. login de la asesora vía
  Supabase Auth en la Fase 9).
- `src/lib/supabase/cliente-servidor.ts` — cliente con la clave
  `service_role`, protegido con `import 'server-only'` para que Next.js
  falle en el build si algún día se importa desde un componente de cliente
  por error, en vez de filtrar la clave al navegador.
- `src/app/api/verificar-supabase/route.ts` — ruta **temporal** de un solo
  propósito: confirmar a mano que la app conecta con la base de datos real
  del usuario. Solo cuenta filas de `asesores`, no expone datos. Se elimina
  cuando ya no haga falta (la Fase 9 la sustituye por el panel real).

## Qué se modificó

- `package.json` / `pnpm-lock.yaml` — nuevas dependencias:
  `@supabase/supabase-js`, `server-only`.
- Nuevo: `src/lib/supabase/cliente-publico.ts`,
  `src/lib/supabase/cliente-servidor.ts`,
  `src/app/api/verificar-supabase/route.ts`.

## Por qué

`docs/architecture.md` exige que el cliente nunca hable con la base de datos
directamente y que la clave de servicio viva solo en el servidor. Separar
los dos clientes en archivos distintos, con el de servidor protegido por
`server-only`, hace que ese invariante sea un error de compilación y no solo
una convención que hay que recordar.

## Verificación pendiente en la máquina del usuario

`pnpm build` y `pnpm test` (95 tests) se verificaron en el entorno de
construcción, con variables de entorno de prueba — no hay conectividad real
a Supabase desde ahí. Falta que el usuario confirme, en su máquina (con sus
claves reales en `.env.local`):

1. `pnpm dev`
2. Abrir `http://localhost:3000/api/verificar-supabase` en el navegador
3. Debe responder `{"conectado": true, ...}`
