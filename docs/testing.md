# Testing

> Qué se prueba, cómo y con qué nivel de exigencia.
> Principio: **el rigor se concentra donde un fallo hace daño de verdad.**

---

## Comandos

```bash
pnpm test
```

Deben pasar **95 tests**. Si no, algo se ha movido de sitio antes de que
empieces a construir.

Para regenerar el oráculo del motor (solo si cambia una regla de criterio):

```bash
pnpm baseline
```

Configuración en `vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

El archivo tiene extensión `.mts` a propósito: con `.ts`, Vite avisa de que el
archivo usa sintaxis de módulos ES cargado como CommonJS.

---

## El motor · dos niveles de exigencia

El motor de `src/lib/motor/` es un port del original de Python
(`motor-python/motor-calculos.py`). El oráculo es
`motor-python/baseline.json`, generado ejecutando el motor original.

### Funciones deterministas → paridad al bit

Cartera por plazo, rentabilidad y volatilidad, flujo libre, aportación
propuesta, valor futuro, deflactado, años hasta meta y conversión de rentas se
comparan con el original con tolerancia relativa de `1e-12`, solo para absorber
el último bit de `pow` entre libm y V8.

### Monte Carlo → verificación estadística

**No se compara número a número, y es importante entender por qué.** numpy usa
el generador PCG64, que no es reproducible fuera de numpy: las trayectorias son
necesariamente distintas. Fingir paridad exacta ahí sería mentir.

Se verifica de dos formas independientes:

1. **Contra la solución analítica lognormal.** Sin aportaciones, el valor final
   es lognormal puro y sus percentiles tienen forma cerrada. Esta comprobación
   no depende del oráculo: si la simulación se desvía, el fallo está en el
   motor.
2. **Contra los percentiles del original**, con la tolerancia del error de
   muestreo (2,5 %).

Y se comprueba que la simulación es **reproducible**: misma semilla y mismos
datos, mismo resultado. Un informe financiero que cambia al recalcularlo no
vale.

### Regresión del caso real

`src/lib/motor/caso-alex.test.ts` congela un caso completo ya analizado, cifra
a cifra y con el mismo formato de salida. Si alguien toca una regla, un peso o
un supuesto, este test dice **exactamente qué número del informe se movió**.

Es la red de seguridad del sistema. No lo desactives para que pase el build.

---

## Trampas ya resueltas

Documentadas porque volverían a aparecer si alguien reescribe el motor.

**Redondeo.** Python redondea al par (`round(0.5) == 0`); JavaScript siempre
sube. En un motor financiero esa diferencia se propaga. `numerico.ts` replica
el de Python, y el empate se detecta con comparación **exacta** a `.5`: con
tolerancia difusa, valores como `1.5000000000000002` se tratarían como empate y
divergiría.

**Percentiles.** `numpy.percentile` interpola linealmente. Hay que replicar ese
método concreto o los p10/p50/p90 no son comparables.

**Formato de euros.** El locale `es-ES` sigue la convención tipográfica
española y **no** separa los números de cuatro cifras («8800 €»), mientras que
el motor Python siempre agrupa («8.800 €»). Se usa `useGrouping: 'always'` para
que los informes antiguos y los nuevos se lean igual.

---

## Qué se prueba fuera del motor

El motor tiene tests automáticos porque es determinista y crítico. El resto se
verifica de otra forma, y a propósito:

| Qué | Cómo |
|---|---|
| La entrevista captura y etiqueta bien | **Manualmente, con `material-clase/GUION-CLIENTE-PRUEBA.md`.** Es el test de aceptación real del sistema. |
| Los datos llegan a la base de datos | Mirando la tabla `fichas` tras una entrevista |
| El plan no contiene números inventados | Contrastar cada cifra del plan contra `analisis` |
| Las políticas de acceso | Intentar leer una tabla con la clave pública: debe fallar |

**Por qué el chat no lleva tests automáticos.** Un modelo de lenguaje no da dos
veces la misma respuesta, así que un test que compare texto sería inestable y
acabaría desactivado. Lo que sí se puede fijar es el **resultado**: dado el
guion de prueba, la ficha tiene que quedar de una manera concreta. Eso es lo
que se verifica.

---

## El test de aceptación del sistema

Correr el guion de prueba entero, incluidas sus tres variantes. La más
importante:

> **Variante 1.** El cliente contesta «uf, ni idea, lo normal» al gasto, el
> agente le ofrece rangos y elige uno.
>
> Ese dato tiene que quedar como **`estimado`**. Si sale `confirmado`, la
> captura está mal por mucho que el chat parezca funcionar.

Es la prueba más barata y la que más fallos reales detecta, porque comprueba lo
único que un chat bonito no garantiza: que el sistema sabe **cuánto se fía** de
cada dato que tiene.
