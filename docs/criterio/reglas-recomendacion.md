# Reglas de recomendación — Marta

> **Única fuente de criterio del sistema.** A partir de 2026-08-06, todo módulo (diagnóstico y motor de recomendación) toma sus supuestos y reglas de ESTE archivo. Los supuestos provisionales de las instrucciones del project (2 % conservador / 4,5 % moderado / 6,5 % dinámico) quedan **derogados** y sustituidos por la regla R5.
> El motor aplica estas reglas literalmente, sin interpretarlas ni completarlas. **Caso sin regla escrita aquí → no se improvisa: se marca "pendiente para la reunión".**
> Etiquetas: `[confirmado]` = regla dictada por la asesora · `[estimado]` = supuesto por defecto pendiente de su validación.
> Revisión de supuestos: mínimo anual. [confirmado]

---

## R1 · Orden de prioridades del ahorro mensual

Asignar el ahorro disponible en este orden estricto: [confirmado]

1. Cuotas mínimas de todas las deudas al día.
2. Colchón inicial = **1 mes de gastos**.
3. Cancelar deudas caras (definición abajo).
4. Completar el fondo de emergencia hasta su objetivo.
5. Aumentar la inversión.

**Umbrales:** [confirmado]

- Fondo de emergencia objetivo: **3–6 meses** de gasto con `ingresos_estabilidad = estables`; **6–12 meses** si ingresos variables, empleo incierto o personas dependientes.
- Deuda cara: **TAE > 7–8 %** → prioridad absoluta sobre invertir. TAE **4–7 %** → zona gris: valorar según riesgo y liquidez y justificarlo en el informe. TAE **< 4 %** → compatible con invertir en paralelo.

**Excepciones al orden secuencial:** [confirmado]

- Cumplido el paso 2, puede destinarse un **5–10 % del ahorro mensual** a inversión (creación de hábito) mientras se completan los pasos 3–4.
- Tarjetas o créditos de interés muy alto: absorben el **100 %** del ahorro disponible; la excepción anterior no aplica.

El fondo de emergencia vive **fuera** de la cartera invertida: los % de liquidez de R3 son adicionales al colchón. [estimado]

## R2 · Aportación mensual propuesta

- `flujo_libre = ingresos_netos_mes − gasto_total_mes` (el gasto incluye cuotas de deuda; si la ficha las trae aparte, restarlas también). [confirmado]
- Punto de partida: la aportación que exige la meta. Después, acotar: **aportación propuesta ≤ 70–80 % del flujo libre** — el 20–30 % restante queda para imprevistos y vida cotidiana. [confirmado]
- Llegar al **100 %** del flujo libre solo si: fondo de emergencia completo (R1) Y provisiones para gastos irregulares ya cubiertas. [confirmado]
- Si la aportación requerida por la meta supera el tope sostenible → **no se fuerza la aportación**: se aplica R4. [confirmado]

## R3 · Distribución por perfil de riesgo

Carteras de referencia: [confirmado]

| Perfil | Renta variable | Renta fija | Liquidez/monetarios |
|---|---:|---:|---:|
| Conservador | 20 % | 60 % | 20 % |
| Moderado | 50 % | 40 % | 10 % |
| Dinámico | 80 % | 15 % | 5 % |

**El plazo prevalece sobre el perfil:** [confirmado]

- `objetivo_plazo` < 3 años → renta variable 0–10 %; resto en monetarios y renta fija de corta duración.
- 3–7 años → renta variable de referencia −10 a −20 puntos.
- ≥ 8–10 años → distribución base; > 15 años → puede acercarse al extremo más dinámico compatible con el cliente.

**Otras clases:** [confirmado]

- Oro: 0–5 % opcional como diversificador, descontado de renta fija o variable.
- Cripto: fuera de la cartera básica. Solo si el cliente la solicita Y entiende el riesgo: **1–2 % máximo, solo perfil dinámico**.
- Cliente no dinámico que pide cripto → 0 % en la propuesta + señal para la reunión. [estimado]

La distribución final se ajusta a la **capacidad real de soportar pérdidas** (colchón, estabilidad de ingresos, obligaciones), no solo a la actitud declarada (`riesgo_perfil_derivado` ya pondera conducta sobre declaración). [confirmado]

## R4 · Política de inviabilidad

**Disparo:** la aportación sostenible (R2) no alcanza `objetivo_cifra` en `objetivo_plazo` con los supuestos de R5. El informe lo declara sin eufemismos y presenta **escenarios cuantificados con uno recomendado**. [confirmado]

Orden de preferencia de las palancas (el recomendado es el primero que resulte realista para el cliente): [confirmado]

1. **Ajustar gastos o aumentar ingresos** de forma realista.
2. **Alargar el plazo**, si la fecha es flexible.
3. **Combinación**: plazo algo mayor + aportación algo superior.
4. **Reducir la cifra objetivo**, si lo anterior no basta.

Cada escenario muestra: aportación mensual, plazo resultante y probabilidad de cumplimiento (R10). Decide el cliente con Marta, conociendo las consecuencias. [confirmado]

**Regla de riesgo — línea roja:** nunca se sube el nivel de riesgo para hacer viable una meta. Única excepción admisible: la cartera inicial era demasiado conservadora para el horizonte (R3, regla del plazo) Y el cliente tiene capacidad real de soportar pérdidas. Con plazos cortos o metas imprescindibles, subir el riesgo está prohibido siempre. [confirmado]

## R5 · Supuestos de rentabilidad — única fuente

La rentabilidad esperada de cada cartera se **deriva de su composición** (media ponderada por clase), nunca se asigna directamente al perfil. [confirmado]

| Clase | Rentabilidad nominal anual |
|---|---:|
| Liquidez/monetarios | 2 % |
| Renta fija | 3 % |
| Renta variable global | 6,5 % |
| Oro | 3 % |

- Costes: **−0,4 % anual** sobre la cartera. [confirmado]
- Resultantes con las carteras base de R3 (escenario central, neto de costes): **conservador ≈ 3,1 % · moderado ≈ 4,3 % · dinámico ≈ 5,4 %**. Si la cartera se ajusta por plazo (R3), recalcular la ponderada — no usar estas cifras fijas. [confirmado]
- Inflación de referencia: **2 %** (objetivo BCE). Cálculo interno en nominal; resultados presentados en **euros actuales**. [confirmado]
- Estos supuestos sustituyen a los provisionales del project (2 / 4,5 / 6,5 %) en TODOS los módulos, diagnóstico incluido. [confirmado]
- Perfil `pendiente` → tratar como conservador, indicándolo en el informe. [confirmado — regla heredada del diagnóstico]

## R6 · Metas expresadas como renta mensual

- Convertir solo la renta que debe generar **la cartera**: descontar antes pensiones, alquileres y otros ingresos previsibles. [confirmado]
- `patrimonio_objetivo = renta_anual_neta_necesaria ÷ tasa_retirada`, con tasa según horizonte de la retirada: **3 %** (× 400) a +40 años · **3–3,5 %** (× 343–400) a ~30 años · hasta **4 %** (× 300) a ~20 años con gasto flexible. Nunca el 4 % automático. [confirmado]
- Renta procedente de negocio propio: **no se convierte**. Los flujos del negocio se proyectan aparte (estabilidad, continuidad); la cartera solo cubre el déficit restante; el negocio puede valorarse como activo independiente. Si la ficha no trae datos del negocio → la parte de negocio queda "pendiente para la reunión". [confirmado]

## R7 · Transición del patrimonio existente

Todo el patrimonio es **una única cartera** y la transición lleva **fecha límite** — nunca se deja indefinidamente una cartera inadecuada. [confirmado]

- En liquidez (tras separar colchón y dinero de corto plazo): entrada de una vez si horizonte largo; si preocupa el momento de entrada, escalonar **6–12 meses**. [confirmado]
- Invertido pero mal distribuido: riesgos graves (concentración, costes altos, productos inadecuados) se corrigen pronto; el resto se reajusta cuantificando antes impuestos y comisiones. [confirmado]
- Solo con aportaciones nuevas: válido únicamente si corrige el desequilibrio en **12–24 meses**. [confirmado]
- Fiscalidad (España): traspasos entre fondos con requisitos difieren tributación; vender acciones/ETF materializa plusvalías → cuantificar el coste fiscal antes de elegir entre recolocación inmediata o gradual. [confirmado]

## R8 · Flujo libre cero o negativo

El informe cambia de objetivo: **recuperar estabilidad financiera**. [confirmado]

- Foco en presupuesto, gastos recortables, ingresos y deuda; proteger liquidez; detener nuevas inversiones.
- No se propone cartera ejecutable; como máximo, una cartera futura **condicionada** a superávit recurrente sostenido varios meses + colchón.

Mínimos y costes (aplican siempre): sin mínimo universal — 25–50 €/mes valen para crear hábito con productos baratos; no invertir si hay comisiones fijas relevantes o si esa aportación hace falta para el colchón; coste total máximo de un plan: **~1 % anual**. [confirmado]

## R9 · Calidad del dato

**Variables críticas** — si alguna falta (`pendiente`), el informe emite solo **escenarios condicionados**, nunca propuesta ejecutable: ingresos y gastos esenciales · deudas (cuotas e intereses relevantes) · liquidez y colchón · patrimonio invertido · objetivo y plazo · capacidad y tolerancia al riesgo. [confirmado]

- `deudas: pendiente` por negativa del cliente → recomendación **expresamente suspendida**. [confirmado]

**Datos secundarios `estimado`** — supuestos prudentes, visibles en el informe, sesgados siempre contra el optimismo: gastos, inflación, costes e impuestos **al alza**; ingresos, rentabilidad y valor realizable **a la baja**; colchón: solo lo confirmado. [confirmado]

**Deudas incompletas:** con cuota + interés → se integran en el flujo y se decide su prioridad (R1). Sin saldo ni plazo → no calcular amortización, patrimonio neto ni fecha de liberación de cuota; pendiente para la reunión. [confirmado]

## R10 · Probabilidad de cumplimiento

- Simulación **Monte Carlo ≥ 10.000 trayectorias** con volatilidad, correlaciones, inflación, aportaciones y retiradas. Presentar percentiles pesimista / central / optimista — nunca una cifra determinista única. [confirmado]
- Bandas: **Alta ≥ 80 % · Razonable 65–79 % · Frágil 50–64 % · Baja < 50 %**. [confirmado]
- Parámetros de simulación (estándar de mercado): volatilidad anual — liquidez 0,5 %, renta fija 5 %, renta variable global 15 %, oro 15 %; correlaciones — RV–RF 0,1 · RV–oro 0,0 · RF–oro 0,2 · liquidez ≈ 0 con todo. [estimado]

---

## Límites duros (recordatorio transversal)

- Nunca productos concretos (fondos, tickers, plataformas): solo clases de activo y porcentajes. La entrega al cliente se hace en el formato llano definido en las instrucciones del agente, siempre con el descargo de orientación educativa no regulada.
- Nunca subir el riesgo para cuadrar una meta (única excepción en R4).
- Nunca inventar ni completar datos: lo que falte, `pendiente` y a la reunión.
- Todo número sale de código ejecutado, Monte Carlo incluido.

## Pendientes de validación por Marta

1. Colchón fuera de la cartera invertida (R1). `[estimado]`
2. Cripto a 0 % + señal de reunión en perfiles no dinámicos (R3). `[estimado]`
3. Volatilidades y correlaciones del Monte Carlo (R10). `[estimado]`
