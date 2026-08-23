# Publicación — Fase 10

**Fecha:** 2026-08-23 17:59
**Tipo:** Chore / seguridad

## Qué se hizo

Despliegue a producción en Vercel (proyecto `agente-financiero-test`,
conectado al repositorio de GitHub, deploy automático en cada push a
`main`) y repaso de seguridad final antes de dar la URL por buena.

- **Variables de entorno** configuradas en Vercel: las cinco de
  `.env.example`, con `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
  marcadas como "Sensitive" (Vercel las oculta permanentemente tras
  guardarlas — ni el propio dueño del proyecto puede volver a leerlas desde
  el dashboard, solo reemplazarlas). Las `NEXT_PUBLIC_*` sin esa protección,
  porque están diseñadas para ser públicas.
- **Repaso de seguridad manual** (`pnpm audit`, grep dirigido, lectura de
  las rutas de servidor):
  - `pnpm audit` sin vulnerabilidades conocidas en las dependencias.
  - Ninguna clave hardcodeada en el código ni en la documentación.
  - Ningún prefijo `NEXT_PUBLIC_` puesto por error en `SUPABASE_SERVICE_ROLE_KEY`
    ni en `ANTHROPIC_API_KEY`.
  - `.env.local` nunca se ha subido a git (solo `.env.example`, sin valores
    reales).
  - RLS activo en las 8 tablas, sin políticas para `anon` — confirmado de
    nuevo sobre el esquema real.
  - Las rutas públicas de la entrevista (`crear`, `mensajes`) tienen límite
    por IP y por entrevista, y validan el token antes de escribir nada.
  - El panel de Marta (Fase 9) queda protegido en dos capas: `middleware.ts`
    exige sesión, y RLS (`es_asesor()`) exige además estar en la tabla
    `asesores` — una sesión válida sin estar en esa tabla ve el listado
    vacío, no un error que delate datos.

## Qué se corrigió

**Se borró `src/app/api/verificar-supabase/route.ts`.** Era una ruta de
diagnóstico de la Fase 2, marcada desde entonces como temporal ("bórrala...
una vez confirmado"), que quedó pendiente. Con la aplicación ya en
producción no tenía sentido dejarla: era una ruta pública, sin ninguna
autenticación, que cualquiera podía visitar y que devolvía cuántas filas
tiene la tabla `asesores` — no es una fuga grave (no expone datos de
clientes ni credenciales), pero es exactamente el tipo de cosa que un
repaso de seguridad antes de publicar existe para atrapar. El panel de la
Fase 9 ya cumple de sobra el propósito original de esa ruta (confirmar que
la aplicación conecta con Supabase).

## Qué se modificó

Borrado: `src/app/api/verificar-supabase/route.ts`.
Modificado: `docs/roadmap.md`.

## Verificación

`pnpm test` (140 tests, sin cambios de comportamiento), `pnpm lint` y
`tsc --noEmit` limpios tras el borrado. Confirmado en producción
(`https://agente-financiero-test.vercel.app`) por el usuario: landing,
entrevista completa, confirmación, plan del cliente (con descarga), login
del panel y listado de leads — los cinco pasos del flujo funcionando con
las variables de entorno reales de Vercel, en la base de datos real de
Supabase.
