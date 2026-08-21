# Confirmación de la Fase 2 en la máquina del usuario

**Fecha:** 2026-08-20 19:36
**Tipo:** Documentación

## Qué se hizo

Se confirmó en la máquina del usuario el criterio de aceptación de la
Fase 2: `GET /api/verificar-supabase` respondió `{"conectado": true,
"filas_en_asesores": 0}` contra el proyecto real de Supabase.

En el camino, `NEXT_PUBLIC_SUPABASE_URL` se había copiado con `/rest/v1/`
pegado al final (tomado de la pantalla **Data API** del dashboard, que
muestra la URL del endpoint REST completo, no la Project URL). Eso rompía
toda consulta con un error genérico y confuso:
`"Invalid path specified in request URL"`, sin ninguna pista de que el
problema era una URL duplicada.

## Qué se modificó

`docs/architecture.md` — nueva entrada en «Trampas conocidas del stack»
explicando cuál de las URLs que muestra el dashboard de Supabase es la
correcta para `NEXT_PUBLIC_SUPABASE_URL`.

## Por qué

Mismo criterio que las trampas anteriores: costó tiempo, el mensaje de error
no apuntaba a la causa real, y el dashboard de Supabase invita al error
mostrando dos URLs parecidas en dos pantallas distintas de Settings.
