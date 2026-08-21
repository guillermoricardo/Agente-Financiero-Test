# Landing, consentimiento y creación de entrevista — Fase 3

**Fecha:** 2026-08-20 19:40
**Tipo:** Feature

## Qué se hizo

Puerta de entrada pública del producto, completa según el criterio de
aceptación de la Fase 3:

- `src/app/page.tsx` — landing pública: qué es, para quién, un botón.
  Reemplaza la página por defecto de `create-next-app`.
- `src/app/consentimiento/page.tsx` — pantalla de consentimiento con las
  **dos finalidades** declaradas (diagnóstico + contacto comercial del
  asesor), aceptadas con una casilla explícita, no con solo llegar a la
  pantalla.
- `src/app/api/entrevistas/route.ts` — crea la entrevista al aceptar
  (`consentimiento_en` toma su default `now()` en la base de datos), aplica
  el límite de entrevistas nuevas por IP y hora, y devuelve el token.
- `src/lib/limites/ip.ts` — obtiene la IP de la petición y la hashea con
  SHA-256 antes de guardarla; nunca se guarda en claro.
- `src/app/entrevista/[token]/page.tsx` — destino final: valida que el token
  exista (404 si no), muestra la fecha de consentimiento, y avisa que la
  conversación real llega en la Fase 4. Recargar la misma URL vuelve a la
  misma entrevista porque el token ya identifica una fila existente.

## Decisión sin especificar en la documentación

`docs/roadmap.md` y `docs/architecture.md` piden un límite de entrevistas
por IP y hora, pero no fijan la cifra. Se usó **5 por hora** como punto de
partida (documentado en el propio código, en
`LIMITE_ENTREVISTAS_POR_HORA`). Es un valor conservador pensado para no
frenar a alguien que reintenta tras un error, sin dejar la puerta abierta a
vaciar el saldo de la API recargando en bucle. Ajustable en cualquier
momento sin tocar el esquema.

## Qué se modificó

Nuevo: `src/app/page.tsx` (reescrito), `src/app/consentimiento/page.tsx`,
`src/app/api/entrevistas/route.ts`, `src/app/entrevista/[token]/page.tsx`,
`src/lib/limites/ip.ts`. Modificado: `src/app/layout.tsx` (título y
`lang="es"`, antes era la plantilla en inglés de `create-next-app`).

## Por qué

Es la Fase 3 completa del roadmap: sin esto no hay manera de llegar a una
entrevista real, y todo lo que viene en fases posteriores (el chat, la
ficha, el diagnóstico) depende de que exista una fila en `entrevistas` con
su token.

## Verificación

`pnpm build` (con variables de prueba) y `pnpm test` (95 tests) se
verificaron en el entorno de construcción. Falta que el usuario confirme en
su máquina, con Supabase real:

1. Abrir `http://localhost:3000` → ver la landing.
2. Clic en "Empezar mi diagnóstico" → pantalla de consentimiento.
3. Marcar la casilla y aceptar → debe navegar a `/entrevista/<token>`.
4. Revisar en Supabase (Table Editor → `entrevistas`) que apareció una fila
   nueva con `consentimiento_en` con la fecha/hora justa.
5. Recargar esa misma URL → debe seguir mostrando la misma entrevista, no
   crear una nueva.
6. Probar entrar a `/entrevista/algo-inventado` → debe dar 404, no una
   pantalla en blanco ni error de servidor.
