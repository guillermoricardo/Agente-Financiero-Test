# El plan en cristiano — Fase 8

**Fecha:** 2026-08-22 18:31
**Tipo:** Feature

## Qué se hizo

La última pieza del lado del cliente: el JSON de `analisis` (Fase 7) se
traduce a un plan en español llano, siguiendo las 8 secciones fijas de
`docs/criterio/instrucciones-agente-v2.md` § Fase 4, adaptadas al flujo web
real (`docs/user-flows.md` § Flujo 1: el cliente recibe su plan
directamente, no hay reunión previa con Marta de por medio en este punto —
`docs/business.md`: "conversa y recibe su plan").

- `src/lib/claude/herramienta-plan.ts` (nuevo) — herramienta `guardar_plan`:
  obliga a que el modelo devuelva las 7 secciones que sí redacta (todas
  menos la 8ª) como campos estructurados, igual que `guardar_dato` obliga a
  una captura estructurada en la entrevista.
- `src/lib/claude/prompt-plan.ts` (nuevo) — `construirPromptPlan()`. Lleva
  el tono y las reglas de traducción de instrucciones-agente-v2.md
  (segunda persona, sin jerga sin explicar, cifras ancladas a la vida del
  cliente, cartera en formato "de cada 100 €"), más una regla explícita y
  repetida: **cada cifra tiene que estar literalmente en el JSON de
  `analisis`** — nada calculado ni inventado por el modelo. Da
  instrucciones distintas según `modo` (completo / condicionado /
  suspendido): en condicionado y suspendido, las secciones 3-6 explican con
  honestidad por qué no hay propuesta ejecutable en vez de inventar una.
- `src/lib/plan/construir-markdown.ts` (nuevo, puro, con tests) — ensambla
  las 7 secciones del modelo + la 8ª sección, que es SIEMPRE el mismo texto
  literal fijo en el código (`DESCARGO_LITERAL`) — nunca se le pide al
  modelo, para que el descargo no dependa de que lo redacte bien ni pueda
  olvidarlo (CLAUDE.md § "no omitas el descargo... en ningún plan
  emitido").
- `src/app/entrevista/[token]/plan/page.tsx` (nuevo) — la ruta del plan.
  Busca la ficha y el análisis más recientes de la entrevista; si ya existe
  un plan para ese análisis, lo muestra; si no, lo genera en ese momento
  (llama al modelo con `guardar_plan` forzado, ensambla el markdown, guarda
  en `planes`) y lo muestra. El propio tiempo de espera de esa primera
  visita ES la "pantalla de cálculo" que pide `docs/user-flows.md` — no
  hizo falta una ruta ni un estado de carga aparte.
- `src/components/PlanCliente.tsx` (nuevo) — renderiza las 8 secciones
  directamente desde el `secciones` tipado (no reparseando el markdown, para
  no añadir una librería de Markdown solo para esto) y ofrece un botón
  "Descargar" que baja el `.md` completo — cumple el "Descargable" de
  `docs/user-flows.md` sin necesidad de generar un PDF en esta fase.
- `src/components/ConfirmarFicha.tsx` — la pantalla de "¡Listo, gracias!"
  de la Fase 6 pasa a enlazar a `/entrevista/[token]/plan` en vez de decir
  que Marta lo presenta en una reunión (esa frase quedó obsoleta en cuanto
  el plan se genera solo, automáticamente); mismo ajuste en el descargo de
  esa pantalla.

## Decisión sin especificar en la documentación

**Cuándo se genera el plan.** A diferencia del análisis (que se dispara al
cerrar la ficha), el plan se genera perezosamente, en la primera visita a
`/entrevista/[token]/plan` — gastar una llamada al modelo por cada
confirmación, aunque nadie vaya a leer el plan, no tenía sentido.

**Cómo se entrega el "descargable".** `docs/user-flows.md` dice
"Descargable" sin especificar el formato. Se implementó como una descarga
de texto/Markdown (botón que genera un Blob en el navegador), no un PDF —
más simple para esta fase y suficiente para leerlo o guardarlo; un PDF
queda como posible mejora futura.

**Sección 5 (opciones) sin el cálculo de escenarios alternativos (R4).**
La Fase 7 no implementa todavía la generación de escenarios cuantificados
cuando una meta no es viable (palancas de R4: ajustar gasto, alargar
plazo, combinación, reducir la meta) — sería una fase de cálculo aparte.
El prompt de la Fase 8 instruye explícitamente al modelo a **no inventar
cifras nuevas** para esa sección: si `aportacionPropuesta.viable` es
`false`, solo puede decir que existen esas vías (ajustar plazo, gasto o
meta), nunca con números. Documentado también como límite conocido: R4 en
su forma completa (con probabilidad por escenario) queda pendiente para
una fase futura.

## Qué se modificó

Nuevo: `src/lib/claude/herramienta-plan.ts`, `src/lib/claude/prompt-plan.ts`,
`src/lib/plan/construir-markdown.ts`,
`src/lib/plan/construir-markdown.test.ts`,
`src/app/entrevista/[token]/plan/page.tsx`, `src/components/PlanCliente.tsx`.
Modificado: `src/components/ConfirmarFicha.tsx`, `docs/data-model.md`.

## Por qué

Es la razón de ser del producto: todo lo construido en las Fases 1-7 existe
para que en este punto el cliente reciba, en su propio idioma cotidiano, la
respuesta a la pregunta que vino a hacer — sin que nadie tenga que leerle un
informe técnico ni esperar a una reunión.

## Verificación

`pnpm build`, `pnpm test` (140 tests, 3 nuevos de `construirMarkdownPlan`) y
`pnpm lint` se verificaron en el entorno de construcción. Los tests nuevos
comprueban que el descargo aparece siempre igual (nunca generado por el
modelo, ni siquiera si una sección intenta colarlo) y que el título no deja
un guion suelto sin nombre de cliente.

Falta que el usuario confirme en su máquina el criterio de la fase:
completar y confirmar una entrevista, abrir "Ver mi plan", y comprobar que
el plan se lee sin saber finanzas y que toda cifra que aparece en él está
también en la fila correspondiente de `analisis`.
