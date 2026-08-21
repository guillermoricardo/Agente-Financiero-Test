# Instrucciones del motor — Módulo 2: análisis y recomendación

> Entrada: una `ficha-[nombre].md` generada por el módulo de entrevista.
> Salida: `informe-[nombre].md` — registro técnico INTERNO y auditable; nunca se entrega tal cual al cliente. En el flujo end-to-end (instrucciones-agente-v2), el cliente recibe su traducción en llano (`plan-[nombre].md`) y toda mención a «Marta» o «la reunión» en este archivo se lee como «resolver con el cliente / afinar el plan».
> Fuente de criterio: **`reglas-recomendacion.md`** (reglas R1–R10 y límites duros). Este archivo NO contiene criterio financiero: solo define CÓMO aplicarlo. Si un valor o umbral aparece aquí, es un error — debe vivir en las reglas.
> Principio rector: el motor aplica las reglas literalmente. **Caso sin regla escrita → no se improvisa: se marca «pendiente para la reunión» y se lista en la sección de pendientes del informe.**

---

## 1 · Pipeline

1. **Leer** la ficha completa y `reglas-recomendacion.md`.
2. **Parsear** las claves fijas con sus etiquetas (§2).
3. **Clasificar la meta** (§3).
4. **Evaluar calidad del dato** (R9): determinar el modo del informe (§4).
5. **Calcular con código** — ejecutar `motor-calculos.py` (§5). Ningún número del informe puede salir "de cabeza".
6. **Redactar** `informe-[nombre].md` con la estructura de §7.
7. **Versionar**: si `informe-[nombre].md` ya existe, no sobrescribir — crear `informe-[nombre]-AAAA-MM-DD.md` y avisar.

## 2 · Parseo de la ficha

- Claves esperadas: las del contrato del módulo 1 (`fecha_entrevista`, `objetivo_*`, `ingresos_*`, `gasto_total_mes`, `aportacion_mensual_actual`, `patrimonio_total`, `patrimonio_distribucion`, `deudas`, `colchon_meses`, `riesgo_*`), más `## Citas relevantes` y `## Pendientes para la reunión`.
- Cada valor lleva etiqueta `[confirmado|estimado|pendiente]`. Valor sin etiqueta → tratar como `estimado` y señalarlo como anomalía de la ficha.
- `deudas` admite tres formatos: lista `(tipo, saldo, cuota, interés)` con campos posiblemente ausentes · `ninguna` · `pendiente`. Campos ausentes dentro de una deuda NO se rellenan (R9: sin saldo/plazo no hay análisis de amortización).
- Rangos («4-5 meses», «300-400 €») → usar el extremo **prudente** según la dirección de sesgo de R9 (gastos al alza, colchón/ingresos a la baja) y declararlo.
- Los «Pendientes para la reunión» de la ficha se arrastran íntegros al informe — nunca se resuelven por cuenta del motor.

## 3 · Clasificación de la meta

| Tipo | Detección | Tratamiento |
|---|---|---|
| **Patrimonio** | `objetivo_cifra` en € totales | Fórmulas directas (VF, gap, %camino). |
| **Renta de cartera** | cifra en €/mes o «vivir de las rentas», sin negocio de por medio | Convertir con R6 (tasa según horizonte de retirada, tras descontar ingresos previsibles) y seguir como patrimonio. Documentar la conversión. |
| **Renta de negocio propio** | la renta procede de actividad/negocio del cliente (MRR, facturación) | R6: **no convertir**. La meta no es alcanzable vía cartera y el informe lo dice. La cartera se analiza por su papel real (colchón, respaldo, diversificación). Se permite UNA ilustración condicionada («si esa renta debiera salir íntegramente de la cartera, equivaldría a X €») claramente rotulada como ilustración, no como objetivo. Flujos del negocio: pendiente para la reunión salvo que la ficha los traiga. |
| **Mixta / ambigua** | parte cartera, parte negocio; o sin cifra/plazo | Separar la parte convertible; lo demás, pendiente. Sin cifra o sin plazo (`pendiente`) → sin proyección: solo situación actual + escenarios condicionados. |

## 4 · Modos del informe según calidad del dato (R9)

- **Completo**: las 6 variables críticas presentes (aunque alguna sea `estimado`) → diagnóstico + propuesta preliminar ejecutable.
- **Condicionado**: falta alguna crítica → diagnóstico con lo disponible + solo escenarios condicionados («si X fuera..., entonces...»). Sin propuesta ejecutable.
- **Suspendido**: `deudas: pendiente` por negativa del cliente → diagnóstico descriptivo y recomendación expresamente suspendida (R9), explicando por qué.

En todos los modos: los supuestos aplicados a datos `estimado` se listan con su dirección de sesgo.

## 5 · Cálculo (motor-calculos.py)

Todo cálculo numérico se ejecuta con el script (o extendiéndolo — nunca a mano ni "de cabeza"):

- Flujo libre y aportación propuesta (R2), con la comprobación de si el gasto ya incluye cuotas de deuda (§6-C1).
- Cartera objetivo: base por perfil + ajuste por plazo (R3) → rentabilidad esperada **ponderada por composición** neta de costes (R5). Nunca usar los % por perfil como cifra fija si la cartera se ajustó.
- Proyección determinista (escenario central): VF, gap, años-hasta-meta a ritmo actual y a ritmo propuesto.
- Monte Carlo (R10): ≥10.000 trayectorias mensuales, parámetros de R10; salida en percentiles p10/p50/p90 **en euros actuales** (deflactar con la inflación de R5) y probabilidad de cumplimiento con su banda.
- Redondeo: euros enteros; porcentajes con 1 decimal.

## 6 · Catálogo de casos borde

| # | Caso | Tratamiento |
|---|---|---|
| C1 | ¿`gasto_total_mes` incluye las cuotas de deuda? | Si `aportacion_mensual_actual` ≈ `ingresos − gasto` está confirmada como remanente real → el gasto las incluye; no restarlas otra vez. Si no puede determinarse → asumir que NO las incluye (flujo libre menor = prudente, R9) y declararlo. |
| C2 | Plazo en frontera de bandas de R3 (p. ej. exactamente 3 años) | Aplicar la banda **más conservadora** de las dos. |
| C3 | Puntos de RV retirados por la regla del plazo (R3) | Reasignar a renta fija de corta duración / monetarios. `[estimado — validar con Marta]` |
| C4 | `colchon_meses` dentro del rango objetivo de R1 pero no en su tope | Se considera cubierto si ≥ límite inferior del rango aplicable; el informe constata la distancia al tope como hecho, sin convertirla en requisito. `[estimado — validar con Marta]` |
| C5 | Perfil `pendiente` | Conservador + indicarlo (R5). |
| C6 | Perfil declarado vs conducta contradictorios ya resueltos por la ficha (`riesgo_perfil_derivado`) | El motor usa el derivado; no re-deriva. Si la ficha trae contradicción sin resolver → conservador + señal para la reunión. |
| C7 | Cliente no dinámico con interés en cripto | 0 % + señal para la reunión (R3). |
| C8 | Deuda sin saldo ni plazo | Cuota e interés al flujo y a la priorización (R1); amortización, patrimonio neto y fecha de liberación → pendientes (R9). |
| C9 | `deudas: ninguna` | Pasos 1 y 3 de R1 se dan por cumplidos; se dice explícitamente. |
| C10 | Flujo libre ≤ 0 | Modo R8 íntegro: informe de estabilización, sin cartera ejecutable. |
| C11 | `aportacion_mensual_actual` = 0 con flujo libre > 0 | Hecho descriptivo (no juicio); la propuesta parte de R2 con normalidad. |
| C12 | `patrimonio_total` = 0 | Sin transición (R7 no aplica); proyección solo con aportaciones. |
| C13 | Meta ya alcanzada (gap ≤ 0) | Constatarlo; el informe pasa a describir mantenimiento y riesgos (secuencia de retirada si es meta de renta) — sin inventar una meta nueva. |
| C14 | Aportación requerida ≤ tope sostenible | Meta viable: se propone la requerida (no el tope máximo porque sí). |
| C15 | Patrimonio con activos fuera de las clases de R3/R5 (inmuebles, negocio, otros) | Se describen pero NO entran en la cartera proyectada ni en su rentabilidad; señal para la reunión. |
| C16 | Ficha con claves ausentes o formato roto | No adivinar: tratar la variable como `pendiente` y reportar la anomalía al final del informe. |

Cualquier caso nuevo no listado → regla rectora: pendiente para la reunión + proponer su incorporación a este catálogo.

## 7 · Estructura de `informe-[nombre].md`

```
# Informe — [Nombre] · AAAA-MM-DD
> Uso interno de Marta. No entregar al cliente. Modo: [completo|condicionado|suspendido]

## Parte A — Diagnóstico (solo hechos)
1. Meta y horizonte          (en palabras del cliente; tipo de meta según §3)
2. Situación actual          (ingresos, gasto, flujo libre, aportación, patrimonio
                              y ubicación, deudas, colchón, perfil)
3. Camino recorrido          (% — solo si la meta es convertible)
4. Proyección a ritmo actual (VF central + percentiles MC, supuestos explícitos)
5. Gap                       (€ y tiempo)
6. Calidad del dato          (etiquetas, supuestos aplicados y su sesgo)
7. Señales para la reunión   (solo hechos observables)

## Parte B — Propuesta preliminar (BORRADOR para revisión de Marta)
8.  Prioridades aplicadas     (R1 sobre este cliente, paso a paso)
9.  Aportación propuesta      (R2: cálculo del tope y cifra)
10. Cartera objetivo          (R3 ajustada por plazo + rentabilidad R5 derivada)
11. Transición del patrimonio (R7)
12. Viabilidad y escenarios   (R4 si aplica: palancas cuantificadas con
                              probabilidad R10, y cuál es la recomendada)

## Parte C — Control
13. Trazabilidad             (cada cifra → dato de ficha o regla/supuesto)
14. Pendientes para la reunión (los de la ficha + los generados por el motor)
```

- Parte A describe, nunca valora ni recomienda (límite del diagnóstico).
- Parte B es propuesta **para Marta**: puede proponer cifras y distribuciones, siempre dentro de las reglas y rotulada como borrador. Nunca productos concretos ni lenguaje dirigido al cliente («deberías»).
- Tono: factual, sin juicios sobre las decisiones pasadas del cliente.
