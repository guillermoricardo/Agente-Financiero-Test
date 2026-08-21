# Chat de la entrevista contra la API de Anthropic — Fase 4

**Fecha:** 2026-08-21 02:53
**Tipo:** Feature

## Qué se hizo

El chat de verdad de `/entrevista/[token]`, siguiendo
`docs/criterio/plantilla-entrevista.md` completo (apertura, los 8 bloques y
cierre, guion literal donde el documento lo pide). Todavía **sin** capturar
los datos financieros como datos estructurados — eso es la herramienta
`guardar_dato` de la Fase 5. Aquí el modelo conversa siguiendo el guion y
cada mensaje se guarda tal cual en `mensajes`.

- `src/lib/claude/cliente.ts` — cliente del SDK de Anthropic
  (`@anthropic-ai/sdk`, nueva dependencia), con `import 'server-only'`.
- `src/lib/claude/prompt.ts` — prompt de sistema, traducción íntegra de la
  plantilla a instrucciones para el modelo. La apertura y el cierre son el
  texto literal del documento; el resto son las reglas de conducción (un
  rebote por variable, sin juicios, captura al vuelo, etc.).
- `src/lib/claude/herramientas.ts` — herramienta `guardar_contacto`: la única
  de esta fase. El modelo la llama en cuanto tiene nombre y correo, antes del
  bloque 1.
- `src/app/api/entrevistas/[token]/mensajes/route.ts` — ruta de servidor:
  guarda el mensaje del cliente, relee la conversación entera (el modelo no
  tiene memoria), llama a la API, procesa `guardar_contacto` si aparece
  (crea el cliente o lo enlaza si el correo ya existía — nunca duplica) y
  guarda la respuesta del agente.
- `src/app/entrevista/[token]/page.tsx` — ahora carga la conversación
  guardada y, si es la primera visita, inserta la apertura literal como
  primer mensaje (sin llamar al modelo: es determinista y no cuesta nada).
- `src/components/ChatEntrevista.tsx` — interfaz de chat (cliente): burbujas,
  campo de texto, estado de "escribiendo…", errores.

## Decisión sin especificar en la documentación

`docs/architecture.md` pide un "tope de mensajes por entrevista" y un límite
por IP y hora para el chat, igual que ya existía para crear entrevistas, pero
no fija cifras. Se usaron **60 mensajes por entrevista** y **60 mensajes por
IP y hora** (`TOPE_MENSAJES_POR_ENTREVISTA` y `LIMITE_MENSAJES_POR_HORA` en
la ruta). La propia plantilla ya le pide al modelo cerrar la conversación
sola sobre los ~12 intercambios (~24-30 mensajes contando ambos roles,
apertura y cierre incluidos); estos topes son una red de seguridad técnica
para si alguien llama a la ruta directamente sin pasar por el chat, no el
límite "natural" de una entrevista normal. Ajustable sin tocar el esquema.

`guardar_contacto` se modeló como herramienta separada de la futura
`guardar_dato` (Fase 5) en vez de esperar a tener ambas: es el mismo
principio de "los datos se extraen turno a turno" que ya pide
`docs/architecture.md` § decisión 3, aplicado aquí solo al nombre y el
correo porque son los únicos datos que esta fase necesita capturar de forma
estructurada.

## Qué se modificó

Nuevo: `src/lib/claude/cliente.ts`, `src/lib/claude/prompt.ts`,
`src/lib/claude/herramientas.ts`,
`src/app/api/entrevistas/[token]/mensajes/route.ts`,
`src/components/ChatEntrevista.tsx`. Reescrito:
`src/app/entrevista/[token]/page.tsx` (antes mostraba un mensaje fijo de
"tu diagnóstico está en camino"; ahora carga y muestra el chat). Modificado:
`package.json` (nueva dependencia `@anthropic-ai/sdk`).

## Por qué

Es la Fase 4 completa del roadmap: sin esto la entrevista no es más que una
pantalla estática. Todo lo que viene después (Fase 5, capturar los datos
como ficha estructurada) se construye encima de esta misma ruta, añadiendo
la herramienta `guardar_dato` junto a `guardar_contacto`.

## Verificación

`pnpm build` (con variables de prueba, incluida una `ANTHROPIC_API_KEY`
falsa solo para que el build no falle por falta de la variable) y
`pnpm test` (95 tests) y `pnpm lint` se verificaron en el entorno de
construcción. Falta que el usuario confirme en su máquina, con su clave real
de Anthropic:

1. Abrir una entrevista nueva (o recargar una existente) → debe verse la
   apertura literal del guion como primer mensaje del chat.
2. Responder "sí, empezamos" (o similar) → el asistente debe pedir nombre y
   correo antes de la primera pregunta del objetivo.
3. Dar nombre y correo → la conversación debe seguir con la P1 del bloque 1
   (el objetivo), sin repetir la pregunta de nombre/correo.
4. En Supabase (Table Editor → `clientes`) debe aparecer una fila nueva con
   ese nombre y correo, y en `entrevistas` esa fila debe tener `cliente_id`
   relleno (ya no `NULL`).
5. Recargar la página → la conversación completa debe seguir ahí, en el
   mismo orden.
6. Seguir la entrevista unos cuantos mensajes más → las preguntas deben ir en
   orden, una por mensaje, sin inventar cifras ni saltarse bloques.
