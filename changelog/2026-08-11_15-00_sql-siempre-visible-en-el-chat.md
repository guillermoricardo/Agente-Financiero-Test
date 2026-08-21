# El SQL que haya que ejecutar se muestra siempre en el chat

**Fecha:** 2026-08-11 15:00
**Tipo:** Documentación

## Qué se hizo

Se añadió una regla de trabajo: cuando haya SQL que aplicar en Supabase, el
agente debe **escribirlo entero en el chat**, en un bloque de código listo para
copiar, además de guardarlo en `supabase/migrations/`.

No basta con decir «he creado la migración en `supabase/migrations/0002.sql`,
cópiala y pégala». El SQL va donde el usuario está mirando.

La regla incluye decir dónde se pega (SQL Editor de supabase.com) y qué
debería verse después de ejecutarlo.

## Qué se modificó

- `CLAUDE.md` — nueva sección «Cambios en la base de datos» y dos reglas en
  «Qué NO hacer»
- `docs/roadmap.md` — Fase 2, pasos concretos
- `docs/architecture.md` — «Trampas conocidas del stack»

## Por qué

Las migraciones se ejecutan a mano en el editor web de Supabase, porque
configurar el MCP resultó más frágil de lo que compensaba. Con ese flujo, hacer
que el usuario abra un archivo del repositorio, localice dónde empieza y acaba
el SQL y lo copie es fricción innecesaria — y una fuente de errores por copiar
de más o de menos.

Importa especialmente porque quien construye esto no tiene perfil técnico: cada
paso que le obliga a salir del chat y navegar por carpetas es un punto donde se
puede atascar sin que nadie le vea.
