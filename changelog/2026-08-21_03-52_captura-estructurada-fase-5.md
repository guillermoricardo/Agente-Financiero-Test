# Captura estructurada de la ficha — Fase 5

**Fecha:** 2026-08-21 03:52
**Tipo:** Feature

## Qué se hizo

La fase que el propio roadmap llama "la decisiva del proyecto": la conversación
de la Fase 4 ahora se convierte en datos. Cada dato financiero se guarda con su
etiqueta de calidad (`confirmado` / `estimado` / `pendiente`) en el momento en
que se captura, no al terminar.

- `src/lib/claude/ficha-entrevista.ts` (nuevo) — la única pieza del sistema
  que traduce entre las claves snake_case de la plantilla
  (`objetivo_cifra`, ...) y los campos camelCase del tipo `Ficha` de
  `src/lib/motor/ficha.ts` (`objetivoCifra`, ...), que es la forma que
  `docs/data-model.md` exige para `fichas.datos`. Incluye
  `fusionarDato` (aplica una llamada a `guardar_dato` sobre el estado
  actual), `calcularProgreso` (bloques completos de 8) y
  `resumenFichaParaPrompt` (el estado legible que se inyecta en el prompt en
  cada turno). Son funciones puras y deterministas — a diferencia del chat,
  **sí llevan tests** (`ficha-entrevista.test.ts`, 13 casos, incluida la
  ficha completa del Guion A de `material-clase/GUION-CLIENTE-PRUEBA.md`
  dando 8/8 bloques).
- `src/lib/claude/herramientas.ts` — nueva `HERRAMIENTA_GUARDAR_DATO`: clave
  (enum de las 14 variables + `pendientes`), valor, etiqueta, cita y
  supuesto opcionales. El formato de `deudas` (unión de 4 casos) se explica
  en la propia descripción de la herramienta.
- `src/lib/claude/prompt.ts` — pasó de constante fija a
  `construirPromptSistema(resumenFicha)`: el prompt se reconstruye en cada
  turno con el estado actual de la ficha, para que el modelo pueda aplicar
  "captura al vuelo" (no volver a preguntar algo que ya sabe). Se añadieron
  las reglas de etiquetado, las instrucciones de uso de `guardar_dato`, y la
  regla de derivación de `riesgo_perfil_derivado` (lo que el cliente HIZO en
  una caída real prevalece sobre lo que dice que HARÍA).
- `src/app/api/entrevistas/[token]/mensajes/route.ts` — ahora procesa
  **todas** las llamadas a herramientas de un mismo turno (antes solo la
  primera), y mantiene una ficha "en curso" en `fichas` (`version = 1`,
  upsert por `entrevista_id`) que se actualiza cada vez que llega un
  `guardar_dato`. Devuelve el progreso (bloques completos) en cada
  respuesta.
- `src/components/ChatEntrevista.tsx` / `src/app/entrevista/[token]/page.tsx`
  — barra de progreso de los 8 bloques (puntos, no un porcentaje —
  `docs/design-system.md`: calma antes que impacto), cargada desde la ficha
  guardada al recargar la página.

## Decisión sin especificar en la documentación

`docs/roadmap.md` pide "versionado" de fichas (`docs/data-model.md` § "Por
qué las fichas se versionan": una ficha **cerrada** no se sobrescribe nunca)
pero la Fase 6 (pantalla de confirmación y cierre) todavía no existe. Se
interpretó que la ficha vive en `version = 1` **mientras la entrevista está
en curso**, actualizándose en el sitio con cada dato nuevo — no es una
ficha cerrada todavía, así que no viola la regla de "nunca sobrescribir".
El versionado de verdad (crear una versión 2 en vez de tocar la 1) empieza
a aplicar quien construya la Fase 6, cuando exista el momento de "cierre"
que hoy no existe.

## Qué se modificó

Nuevo: `src/lib/claude/ficha-entrevista.ts`,
`src/lib/claude/ficha-entrevista.test.ts`. Modificado:
`src/lib/claude/herramientas.ts`, `src/lib/claude/prompt.ts`,
`src/app/api/entrevistas/[token]/mensajes/route.ts`,
`src/components/ChatEntrevista.tsx`, `src/app/entrevista/[token]/page.tsx`.

## Por qué

Sin esto, todo lo que el cliente cuenta se queda como texto suelto dentro de
`mensajes` — el motor (Fase 7) no puede calcular nada con eso. La etiqueta
de calidad es la pieza más importante de todo el sistema (R9): decide si el
informe sale completo, condicionado o suspendido, y esa decisión se toma
aquí, en el momento de la captura, no reconstruyéndola después leyendo la
transcripción.

## Verificación

`pnpm build`, `pnpm test` (108 tests, 13 nuevos) y `pnpm lint` se
verificaron en el entorno de construcción. Los tests nuevos reproducen en
código puro el Guion A completo de `material-clase/GUION-CLIENTE-PRUEBA.md`
(8/8 bloques) y los tres casos de sus variantes (etiqueta `estimado` por
rango, deudas `pendiente` por negativa, notas en `pendientes` sin duplicar).

Falta que el usuario confirme en su máquina, con las **cuatro pruebas** de
`material-clase/GUION-CLIENTE-PRUEBA.md`:

1. **Guion A** (el camino limpio): al terminar, la tabla `fichas` debe tener
   una fila con las 14 variables en `confirmado`, y un `pendiente` anotado
   sobre el saldo de la hipoteca (dio cuota e interés, no el saldo).
2. **Variante 1** (respuesta que no concreta): `gasto_total_mes` debe salir
   `estimado`, no `confirmado` — es el criterio real de esta fase, según el
   propio roadmap.
3. **Variante 2** (dato que llega antes de tiempo): la hipoteca mencionada
   en el bloque 2 no debe volver a preguntarse en el bloque 6.
4. **Variante 3** (cliente que no quiere hablar de deudas): `deudas` debe
   quedar `pendiente`, el agente insiste una sola vez y sigue sin insistir
   más.
