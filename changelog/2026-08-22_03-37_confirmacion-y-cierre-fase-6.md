# Confirmación y cierre — Fase 6

**Fecha:** 2026-08-22 03:37
**Tipo:** Feature

## Qué se hizo

La pantalla que cierra la entrevista: al terminar la conversación, el
cliente ve un resumen editable en lenguaje llano, corrige lo que haga
falta, y al confirmar la ficha queda cerrada.

- `src/lib/claude/ficha-entrevista.ts` — tres piezas nuevas, sin tocar nada
  de la Fase 5:
  - `CAMPOS_EDITABLES`: los 13 campos escalares de la ficha (todo menos
    `deudas`), con su etiqueta en español y si son texto o número, para
    construir el formulario.
  - `resumenDeudasEnLenguajeLlano`: traduce cualquiera de los 4 casos de
    `Deudas` (lista, ninguna, pendiente, solo_flag) a una frase legible.
  - `aplicarCorrecciones`: aplica los valores del formulario sobre la
    ficha. Solo pasa a `confirmado` lo que el cliente **cambió de verdad**
    (comparando con el valor guardado); un campo que deja tal cual
    conserva su etiqueta anterior; un campo vacío no borra un dato ya
    capturado.
- `src/app/api/entrevistas/[token]/confirmar/route.ts` (nuevo) — recibe
  las correcciones, las aplica, y cierra la entrevista
  (`estado: 'completada'`). La primera vez actualiza en el sitio la ficha
  "en curso" de la Fase 5 (`version = 1` — nada se había cerrado todavía,
  así que no hay problema). Si alguien vuelve a confirmar después de que
  la entrevista ya estaba `completada` (una corrección posterior), crea
  una fila nueva con la siguiente versión en vez de tocar la que ya se
  cerró — `docs/data-model.md` § "una ficha cerrada nunca se sobrescribe".
- `src/app/entrevista/[token]/confirmar/page.tsx` (nuevo) — carga la
  entrevista, el cliente y la última ficha; da 404 con token inventado,
  aviso si el enlace caducó, y aviso si todavía no hay nada que confirmar
  (entrevista sin terminar).
- `src/components/ConfirmarFicha.tsx` (nuevo) — el formulario: los 13
  campos editables ya rellenos con lo capturado en el chat (con un aviso
  discreto en los que quedaron `estimado` o `pendiente`), `deudas` en
  modo lectura con su resumen en español, y el **descargo de orientación
  educativa visible en la propia pantalla** (no en un enlace ni en letra
  pequeña escondida). Al confirmar, pantalla de agradecimiento.
- `src/components/ChatEntrevista.tsx` — en cuanto la despedida literal del
  guion aparece en el historial (se busca un fragmento fijo de ese texto,
  que es siempre el mismo — `docs/criterio/plantilla-entrevista.md`),
  aparece un botón "Revisar y confirmar mi resumen" que lleva a la nueva
  pantalla.

## Decisión sin especificar en la documentación

`deudas` es la única variable de la ficha con forma compuesta (una lista
de deudas, cada una con tipo/cuota/interés/saldo, o el caso especial de
negativa del cliente) — no encaja en un formulario de campo único sin
perder estructura o sin construir algo mucho más pesado para esta fase.
Se decidió mostrarla en modo lectura con un resumen en español y remitir
cualquier corrección a la reunión con Marta, siguiendo el mismo patrón
que ya usa el guion cuando el cliente prefiere no detallar sus deudas.

El roadmap no dice qué pasa si alguien vuelve a la pantalla de
confirmación después de haber confirmado ya (por ejemplo, reabre el
enlace). Se interpretó como una corrección posterior al cierre y se
versiona (fila nueva), nunca se sobrescribe la que ya se cerró — mismo
criterio que ya se documentó en la Fase 5 para cuándo empieza a aplicar
el versionado de verdad.

## Qué se modificó

Nuevo: `src/app/api/entrevistas/[token]/confirmar/route.ts`,
`src/app/entrevista/[token]/confirmar/page.tsx`,
`src/components/ConfirmarFicha.tsx`. Modificado:
`src/lib/claude/ficha-entrevista.ts`, `src/lib/claude/ficha-entrevista.test.ts`,
`src/components/ChatEntrevista.tsx`.

## Por qué

Sin esto, la ficha de la Fase 5 queda "en curso" para siempre — nunca se
cierra, nunca se puede corregir un dato mal capturado, y el motor
(Fase 7) no tiene ninguna versión estable sobre la que calcular. Esta
pantalla es también la única oportunidad de que el propio cliente revise
y corrija antes de que Marta reciba nada.

## Verificación

`pnpm build`, `pnpm test` (118 tests, 10 nuevos: 6 de `aplicarCorrecciones`
y 4 de `resumenDeudasEnLenguajeLlano`) y `pnpm lint` se verificaron en el
entorno de construcción.

Falta que el usuario confirme en su máquina el criterio de la fase: llegar
al final de una entrevista, abrir "Revisar y confirmar mi resumen",
corregir un dato, confirmar, y verificar en Supabase que en `fichas` ese
dato aparece cambiado y con `etiqueta: "confirmado"`, y que
`entrevistas.estado` pasó a `"completada"`.
