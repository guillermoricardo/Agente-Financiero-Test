# Guion de cliente de prueba

> Para probar la entrevista sin tener que inventarte respuestas sobre la
> marcha. Haz tú de cliente y contesta lo que pone aquí, literalmente.
>
> **Úsalo al terminar el Paso 3 de la guía.**
>
> Su valor real es que te da una **respuesta correcta contra la que comparar**.
> Trabajando por tu cuenta, sin este guion, cuando algo salga raro no vas a
> saber si el fallo es de tu agente o de que contestaste de forma ambigua sin
> darte cuenta.

---

## Tu personaje

**Laura Ferrer, 40 años, diseñadora gráfica en plantilla.**

Quiere llegar a los 60 con dinero suficiente para bajar el ritmo. Gana bien sin
ser rica, tiene hipoteca, y ya invirtió algo hace unos años. No sabe si va bien
encaminada: por eso está aquí.

No necesitas recordar nada de esto. Está todo en las respuestas.

---

## Guion A · El camino limpio

Contesta esto tal cual, en orden. El agente debería hacerte **una pregunta por
mensaje**; si te hace dos de golpe, ya has encontrado un fallo.

### Presentación

```text
Hola, soy Laura
```

### Bloque 1 · El objetivo

El agente pregunta qué te gustaría conseguir con tu dinero.

```text
Me gustaría llegar a los 60 con un colchón lo bastante gordo como para poder bajar el ritmo, trabajar menos horas o elegir mejor los proyectos
```

Luego te pide ponerle números.

```text
Pues unos 150.000 euros estaría bien. Tengo 40 ahora, así que en unos 20 años
```

### Bloque 2 · Situación de partida

Te pregunta a qué te dedicas y si tus ingresos son fijos o variables.

```text
Soy diseñadora gráfica, trabajo en plantilla en una agencia. Nómina fija de toda la vida
```

Te pregunta cuánto entra en casa al mes.

```text
Unos 2.800 al mes limpios
```

### Bloque 3 · El gasto

```text
Se me van unos 2.000 al mes, y ahí está todo metido, la hipoteca incluida
```

### Bloque 4 · Lo que ya ahorras

```text
Tengo puesta una orden automática de 150 euros al mes a un fondo, eso no lo toco
```

### Bloque 5 · Patrimonio

```text
Tendré unos 22.000 ahorrados. Unos 12.000 están parados en la cuenta del banco y los otros 10.000 en un fondo indexado que me abrí hace unos años
```

### Bloque 6 · Deudas

```text
Solo la hipoteca. Pago 620 al mes y creo que está al 1,9%. Tarjetas ni préstamos, nada de eso
```

### Bloque 7 · El colchón

```text
Pues con lo de la cuenta aguantaría unos 5 meses tranquilamente
```

### Bloque 8 · Riesgo

Te pregunta si has invertido antes y si te pilló alguna caída.

```text
Sí, empecé en 2020 justo antes del bajón del covid. Vi el fondo en rojo un par de meses y me acuerdo del susto, pero no toqué nada. Luego se recuperó
```

Te pregunta qué harías si tu dinero valiera un 20% menos.

```text
Pues aguantar, supongo. Ya me pasó una vez y salió bien
```

### Cierre

El agente te hace un resumen de todo. Confírmalo:

```text
Sí, así es
```

---

## La ficha que tiene que salir

Abre la tabla `fichas` en Supabase y compara. **Todo debería estar
`confirmado`**: Laura ha contestado con claridad a todo.

| Clave | Valor | Etiqueta |
|---|---|---|
| `objetivo_descripcion` | bajar el ritmo a los 60 | confirmado |
| `objetivo_cifra` | 150.000 € | confirmado |
| `objetivo_plazo` | 20 años | confirmado |
| `ingresos_netos_mes` | 2.800 € | confirmado |
| `ingresos_estabilidad` | fijos | confirmado |
| `gasto_total_mes` | 2.000 € | confirmado |
| `aportacion_mensual_actual` | 150 € | confirmado |
| `patrimonio_total` | 22.000 € | confirmado |
| `patrimonio_distribucion` | 12.000 cuenta · 10.000 fondo indexado | confirmado |
| `deudas` | hipoteca · cuota 620 € · 1,9 % | confirmado |
| `colchon_meses` | 5 | confirmado |
| `riesgo_experiencia` | invirtió en 2020, aguantó la caída sin vender | confirmado |
| `riesgo_escenario` | aguantar | confirmado |
| `riesgo_perfil_derivado` | moderado | confirmado |

**Y un pendiente.** En la lista de pendientes debería aparecer algo como *«no
se conoce el saldo pendiente de la hipoteca»*. Laura dio la cuota y el interés,
pero no cuánto le queda por pagar. Con cuota e interés basta para saber si esa
deuda estorba a la inversión, pero no para decidir si le conviene amortizar
antes de tiempo. Es el caso C8 de `docs/instrucciones-motor.md`.

Si tu agente rellenó el saldo por su cuenta, **tienes un problema serio**: se
está inventando datos. Vuelve al prompt y refuerza la regla.

---

## Variantes · Las que de verdad prueban el sistema

El guion A comprueba que la fontanería funciona. Estas tres comprueban que el
agente ha entendido las reglas. Pruébalas de una en una, empezando de nuevo.

### Variante 1 · La respuesta que no concreta

En el **bloque 3**, en vez de dar la cifra del gasto:

```text
Uf, ni idea, lo normal supongo
```

El agente debería ofrecerte rangos («¿más cerca de 1.500, de 2.500 o de
4.000?»). Elige:

```text
Pues más cerca de 2.000
```

**Tiene que salir:** `gasto_total_mes = 2000` con etiqueta **`estimado`**, no
`confirmado`. Un dato obtenido eligiendo de una lista no es lo mismo que un
dato que el cliente sabía.

Si sale `confirmado`, el agente no distingue las etiquetas. Es el fallo más
común y el más importante de arreglar.

### Variante 2 · El dato que llega antes de tiempo

En el **bloque 2**, cuando te pregunte a qué te dedicas, mete la hipoteca por
sorpresa:

```text
Diseñadora gráfica, en plantilla. Bueno, y te aviso ya de que tengo una hipoteca que me come 620 al mes, por si te sirve
```

**Tiene que pasar:** el agente registra la hipoteca en ese momento y, cuando
llega al bloque 6, **no te la vuelve a preguntar**. Como mucho pregunta si hay
algo más aparte de ella.

Es la regla de «captura al vuelo». Si te la vuelve a preguntar, el agente no
está mirando lo que ya tiene capturado, y en una entrevista real eso hace que
el cliente se sienta como rellenando un formulario dos veces.

### Variante 3 · El cliente que no quiere hablar de sus deudas

En el **bloque 6**:

```text
Prefiero no entrar en el tema de mis deudas, si no te importa
```

El agente **debe insistir una vez** —es la única variable donde la plantilla lo
permite— explicándote por qué importa: si hay una deuda cara, lo mejor podría
ser quitarla antes de invertir un euro. Mantente firme:

```text
Ya, lo entiendo, pero prefiero dejarlo ahí
```

**Tiene que salir:** `deudas` como **`pendiente`**, y el agente sigue con el
bloque 7 sin insistir más ni ponerse pesado.

Esta es la variante más interesante de las tres, porque tiene consecuencias:
esa ficha deja el sistema en **modo suspendido** (regla R9). No es «un dato
menos» — es que sin saber si hay una tarjeta al 20 %, el sistema podría
recomendarle invertir a alguien que primero debería cancelarla. Ahora no lo
notarás, pero en la siguiente sesión esa ficha no generará plan, y estará bien
que no lo haga.

---

## Lo que pasará con esta ficha en la siguiente sesión

Los números de Laura ya están pasados por el motor, para que sepas hacia dónde
vamos.

Laura tiene **800 € libres al mes** (2.800 menos 2.000). El sistema no le
propondrá invertirlos todos: la regla R2 deja entre el 70 y el 80 %, o sea
**entre 560 y 640 € al mes**, y el resto se queda para imprevistos y para vivir.

Su perfil moderado a 20 años da una cartera de **50 % bolsa mundial, 40 % renta
fija, 10 % liquidez**, con una rentabilidad esperada del 4,25 % anual neta de
costes. Y con eso, la probabilidad de llegar a sus 150.000 €:

| Si aporta | Probabilidad | Banda |
|---|---|---|
| 560 €/mes | 69 % | Razonable |
| 640 €/mes | 83 % | Alta |

Fíjate en lo que enseña ese salto: **80 € más al mes** mueven a Laura de
«razonable» a «alta». Eso es exactamente lo que el plan tiene que saber
contarle en cristiano, y es la diferencia entre un informe y un consejo útil.
