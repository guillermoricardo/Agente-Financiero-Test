# Design System

> Cómo se ve y cómo suena el producto.
> Regla rectora: **el usuario está hablando de su dinero y probablemente está
> algo incómodo.** Todo lo demás se deduce de ahí.

---

## Principios

**1. Calma antes que impacto.** Nada de degradados agresivos, animaciones que
saltan ni cifras gigantes en rojo. Un diagnóstico financiero que asusta se
cierra sin leer.

**2. Una cosa por pantalla.** La entrevista muestra una pregunta. El plan se
lee por secciones. Si caben dos cosas, mejor que quepa una.

**3. Cero jerga sin traducir.** Si aparece un término técnico, se explica en la
misma frase con palabras corrientes. «Renta fija — básicamente prestar dinero a
estados y empresas a cambio de un interés, la parte tranquila de la cartera.»

**4. La incertidumbre se muestra, no se esconde.** Nunca una cifra sola cuando
en realidad hay una horquilla. Un número exacto transmite una precisión que el
sistema no tiene.

**5. Los datos incompletos se ven.** Un dato `estimado` no se pinta igual que
uno `confirmado`. La calidad del dato es información, no ruido interno.

---

## Tono de voz

De tú, cercano y profesional. Frases cortas. Segunda persona.

**Nunca se juzgan las cifras del cliente.** Ni «qué poco ahorras» ni «vas
fenomenal». Acuse de recibo neutro y cálido, y a la siguiente pregunta. Esta
regla es del criterio, no una preferencia de estilo: alguien que se siente
juzgado deja de dar datos reales.

Cada cifra se ancla a la vida del cliente: no «aportación de 640 €» sino
«640 € al mes, que es el 80 % de lo que ya te queda libre».

Los porcentajes de cartera se expresan siempre en formato **«de cada 100 € que
inviertas: X a bolsa mundial, Y a renta fija…»**. Nadie piensa en porcentajes;
todo el mundo piensa en cien euros.

---

## Color

Paleta sobria de base, con el color reservado para significar algo.

| Uso | Criterio |
|---|---|
| Base | Neutros. Fondo claro, texto de alto contraste. |
| Acento | Un único color de marca, para acciones primarias. |
| Bandas de probabilidad | La escala de R10 (Alta / Razonable / Frágil / Baja) es el **único** sitio donde se usa semáforo. |
| Calidad del dato | `confirmado` neutro · `estimado` atenuado · `pendiente` marcado como hueco a rellenar, no como error. |

El color nunca es el único portador de significado: siempre acompañado de
texto o icono. Hay usuarios que no lo distinguen.

---

## Componentes clave

**Chat de entrevista.** Ocupa la pantalla. Burbujas diferenciadas, campo de
texto siempre visible, indicador de que el asistente está pensando. Sin barra
de navegación que invite a irse.

**Barra de progreso de los 8 bloques.** Lateral en escritorio, superior en
móvil. Muestra qué bloques llevan datos. Reduce el abandono porque convierte
una conversación de duración desconocida en una barra que avanza.

**Resumen editable.** Cada dato en su fila, en lenguaje llano, editable al
clicar. No es un formulario: es una lista de frases que se pueden corregir.

**Tarjeta de plan.** Las 8 secciones, cada una plegable. Máximo una pantalla
por sección.

**Fila de cliente (panel).** Nombre, meta, plazo, banda de probabilidad y
estado. La banda es lo que se escanea: es lo que responde «¿quién necesita que
le llame?».

---

## Visualizaciones del panel

Cuatro, y ninguna más hasta que se demuestre que hace falta:

1. **Probabilidad de cumplimiento** — indicador con su banda. El dato que
   resume todo.
2. **Composición de la cartera** — anillo con las clases de activo.
3. **Proyección** — área con p10 / p50 / p90 en el tiempo. La anchura de la
   banda *es* el mensaje: comunica incertidumbre mejor que cualquier texto.
4. **Prioridades de R1** — checklist del orden del ahorro, con lo cumplido
   marcado.

Todas en euros de hoy, y con los supuestos accesibles.

---

## Accesibilidad

- Contraste mínimo AA.
- Todo operable por teclado; el chat es lo primero que debe funcionar así.
- Texto base de 16 px o más. El usuario objetivo llega a 55 años.
- Nada que dependa solo del color.

---

## Móvil

La entrevista se diseña **primero para móvil**: es donde va a ocurrir. Campo de
texto que no lo tape el teclado, burbujas cómodas, progreso arriba.

El panel de la asesora se diseña primero para escritorio: es donde se trabaja
con una tabla y cuatro gráficos.
