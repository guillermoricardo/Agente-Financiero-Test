# Diagnóstico — Fase 7

**Fecha:** 2026-08-22 17:35
**Tipo:** Feature

## Qué se hizo

La fase que conecta el motor de cálculo (ya construido y con 95 tests
propios, intocable por `CLAUDE.md`) con la ficha cerrada de un cliente:
`docs/criterio/instrucciones-motor.md` §1, aplicado sobre la ficha web en
vez del markdown de escritorio.

- `src/lib/analisis/clasificar-meta.ts` (nuevo) — §3 de
  instrucciones-motor.md: clasifica `objetivo_descripcion` en `patrimonio` /
  `renta_cartera` / `renta_negocio` / `mixta` por vocabulario (renta,
  alquiler, negocio, facturación…), con la razón siempre citada para que se
  pueda auditar en la reunión. Sin cifra o sin plazo, cae directo en
  `mixta` sin mirar el texto.
- `src/lib/analisis/generar-analisis.ts` (nuevo) — el orquestador de la
  fase. `normalizarFicha` rellena con `pendiente` los campos que la ficha
  parcial nunca tocó (necesario porque `determinarModo()` de
  `src/lib/motor/ficha.ts` espera la ficha completa). `resumenDeudas`
  traduce la unión `Deudas` a cuota total, interés máximo y si hay deuda
  cara (R1, umbral 7 % TAE). `cuotasIncluidasEnGasto` implementa C1
  comparando el remanente (ingresos − gasto) con lo que el cliente dice
  ahorrar. `aportacionMensualRequerida` invierte `vfDeterminista` para
  obtener "la aportación que exige la meta" que pide R2 como punto de
  partida. `generarAnalisis` encadena todo: modo (R9) → clasificación de
  meta (§3) → cartera ajustada por plazo (R3) → objetivo convertido a
  patrimonio si aplica (R6) → proyección determinista + Monte Carlo (R10)
  con probabilidad y banda — todo pasando siempre por las funciones de
  `src/lib/motor/calculos.ts`, nunca calculado "de cabeza".
- `src/app/api/entrevistas/[token]/confirmar/route.ts` — al cerrar la
  ficha (Fase 6), se llama a `generarAnalisis` y se guarda en `analisis`
  (`modo`, `resultado` completo en `jsonb`, `version_motor`,
  `version_reglas`). También calcula y escribe `tipo_de_meta` en `fichas`
  (columna denormalizada que existía desde la Fase 2 pero nunca se
  escribía). Un fallo del análisis no impide que el cliente vea su
  confirmación — se avisa en la respuesta (`analisisGuardado`), no se
  bloquea.
- `vitest.config.mts` — se añadió resolución del alias `@/...` de
  `tsconfig.json`. Hasta ahora funcionaba "por accidente" porque los únicos
  `@/...` bajo test eran `import type` (TypeScript los borra al
  transpilar); `generar-analisis.ts` es el primer archivo con imports de
  **valor** con ese alias que además se prueba con Vitest.

## Decisión sin especificar en la documentación

**Cuándo se dispara el cálculo.** El roadmap no lo dice. Como todavía no
existe el panel de Marta (Fase 9) desde el que lanzarlo a mano, se decidió
dispararlo automáticamente al cerrar la ficha — mismo momento que el POST
de confirmación de la Fase 6.

**Clasificación de la meta.** La ficha no trae un campo "tipo de meta"
explícito: se infiere por palabras clave sobre `objetivo_descripcion`. Es
una interpretación razonable pero no infalible del texto libre del
cliente — casos ambiguos quedarán mal clasificados y solo Marta lo notará
al leer el informe. Documentado también como limitación conocida.

**Horizonte de retirada (R6).** La conversión de una meta de renta a
patrimonio necesita el "horizonte de la retirada", y la entrevista no lo
captura por separado del plazo del objetivo. Se aproxima con
`objetivo_plazo` (≥35 años → tasa a +40; ≥25 → ~30; si no, ~20).

**C1 (¿el gasto incluye las cuotas de deuda?).** Se compara el remanente
(ingresos − gasto) con la aportación mensual actual, con un margen de 50 €
o el 15 % del remanente (el mayor). Si coincide, se asume que sí las
incluye; si no, por prudencia (R9) se asume que no, y se restan aparte.

**Provisiones para gastos irregulares (R2).** La entrevista nunca pregunta
por esto, así que se asume que no están cubiertas — la aportación
propuesta nunca llega al 100 % del flujo libre por esta vía, aunque el
colchón esté completo.

**Meta de negocio propio (R6).** No se convierte a patrimonio. Se sigue
calculando un Monte Carlo de la cartera actual (sin objetivo), rotulado en
el resultado como ilustración, no como probabilidad de cumplir la meta —
tal como pide la regla.

## Qué se modificó

Nuevo: `src/lib/analisis/clasificar-meta.ts`,
`src/lib/analisis/clasificar-meta.test.ts`,
`src/lib/analisis/generar-analisis.ts`,
`src/lib/analisis/generar-analisis.test.ts`. Modificado:
`src/app/api/entrevistas/[token]/confirmar/route.ts`, `vitest.config.mts`,
`docs/data-model.md`.

## Por qué

Sin esto, `analisis` se queda vacía para siempre y la Fase 8 (redactar el
plan en lenguaje llano) no tiene ningún número que traducir — todo el
proyecto converge en este cálculo: es la razón de ser del producto.

## Verificación

`pnpm build`, `pnpm test` (137 tests, 19 nuevos: 5 de `clasificarMeta` y 14
de `generarAnalisis`, incluida la ficha completa del Guion A de
`material-clase/GUION-CLIENTE-PRUEBA.md`) y `pnpm lint` se verificaron en
el entorno de construcción. Los tests nuevos comprueban, sin abrir la base
de datos real: que una ficha completa produce modo `completo` con
probabilidad y banda válidas (`p10 ≤ p50 ≤ p90`, banda dentro del enum),
que el resultado es determinista (misma ficha → mismo `p50` y misma
`probCumplimiento`, gracias a la semilla fija de R10), que la negativa
sobre deudas deja `recomendacionSuspendida: true` sin cartera ni
proyección, que falta una variable crítica cualquiera basta para caer a
`condicionado`, y que una meta de negocio no se convierte a patrimonio.

Falta que el usuario confirme en su máquina el criterio de la fase:
completar una entrevista con datos suficientes para modo completo,
confirmarla, y ver en Supabase una fila nueva en `analisis` con
probabilidad y banda; y completar otra con negativa sobre deudas,
confirmarla, y ver esa fila con `modo: "suspendido"` y sin cartera ni
proyección en `resultado`.
