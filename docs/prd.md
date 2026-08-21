# Product Requirements Document (PRD)

> Fuente de verdad sobre qué construimos y por qué.
> El **criterio financiero** no vive aquí: vive en `docs/criterio/`. Este
> documento define el producto; aquellos definen las reglas que el producto
> aplica. Si hay contradicción, mandan los de `criterio/`.

---

## Resumen ejecutivo

**Asesor financiero conversacional.** Una web donde una persona mantiene una
conversación de cinco minutos en lenguaje natural y, al terminar, recibe un
plan financiero personalizado escrito en castellano llano: dónde está hoy, si
llega a su meta, y qué pasos dar en qué orden.

Detrás hay dos piezas que no se mezclan nunca. Un modelo de lenguaje que
entrevista y redacta, y un motor de cálculo determinista que hace todas las
cuentas. El modelo jamás calcula un número, y el motor jamás escribe una frase.

El sistema existía ya como agente de escritorio: funcionaba dentro de una
conversación de Claude, escribía fichas en archivos markdown y requería que
alguien editara a mano un script de Python para cada cliente. Este proyecto lo
convierte en producto: multiusuario, con base de datos, y con un panel donde la
asesora ve todos sus clientes de un vistazo.

---

## Problema que resuelve

Una persona normal con dudas sobre su dinero se encuentra con dos opciones
malas:

- **Contenido genérico** que no conoce sus números, así que no le dice nada
  accionable.
- **Un asesor financiero**, que sí lo hace bien pero cuesta caro y no compensa
  para un patrimonio pequeño. Y la primera reunión se va entera en recoger
  datos.

Del lado de la asesora, el problema es simétrico: la fase de diagnóstico
inicial —recoger la foto financiera y calcular si la meta es viable— es
mecánica, se repite igual con cada cliente y consume las horas que debería
dedicar a lo que sí requiere criterio.

El producto automatiza exactamente esa fase, y solo esa.

---

## Usuario objetivo

### Perfil 1 · El cliente final

Persona de 30 a 55 años con ingresos estables y algo de ahorro, sin formación
financiera. Tiene una meta difusa («jubilarme tranquilo», «comprar una casa»)
y la sospecha de que no va bien encaminada, pero no sabe medirlo.

- **Motivación:** saber si va bien, en cristiano y con sus números.
- **Frustración:** todo lo que encuentra o es publicidad de un producto, o
  requiere entender palabras que nadie le ha explicado.
- **Lo que no tolera:** un formulario largo. Por eso la captura es conversación.

### Perfil 2 · Marta, la asesora

Arquetipo de asesora financiera independiente. Es quien pone el criterio: las
reglas R1–R10 de `docs/criterio/reglas-recomendacion.md` son suyas, y el
sistema no hace nada que ella no haya autorizado por escrito.

- **Motivación:** atender a más gente sin bajar la calidad del diagnóstico.
- **Frustración:** repetir la misma entrevista veinte veces.
- **Lo que necesita ver:** de un vistazo, quién de su cartera está en riesgo de
  no llegar a su meta.

---

## Funcionalidades

### En alcance

**F0 · Landing y captación.** Página pública con un botón que lleva al
diagnóstico. Al aceptar el consentimiento se crea la entrevista; el asistente
pide nombre y correo conversando, y con eso se crea el cliente.

Es la puerta de entrada del producto y también su mecanismo de captación: **el
sistema genera sus propios leads**, sin que nadie tenga que repartir enlaces.

**F1 · Entrevista conversacional.** Chat que sigue
`docs/criterio/plantilla-entrevista.md`: 8 bloques, una pregunta por mensaje,
máximo un rebote por variable. Los datos se capturan **turno a turno**, cada
uno con su etiqueta de calidad (`confirmado` / `estimado` / `pendiente`) y la
cita literal del cliente.

**F2 · Pantalla de confirmación.** Al terminar, el cliente ve todo lo capturado
en un formulario editable y lo corrige clicando. Es la última red contra datos
mal recogidos. Cada corrección pasa el dato a `confirmado`.

**F3 · Diagnóstico.** El motor toma la ficha y calcula: flujo libre, cartera
objetivo según perfil y plazo, proyección determinista, y probabilidad de
alcanzar la meta por simulación de Monte Carlo.

**F4 · Plan en lenguaje llano.** Las 8 secciones fijas que define
`docs/criterio/instrucciones-agente-v2.md`, redactadas por el modelo a partir
de los números que le da el motor.

**F5 · Panel de la asesora.** Listado de clientes con su estado, y ficha
individual con la visualización del diagnóstico.

**F6 · Consentimiento y descargo.** Consentimiento explícito antes de recoger
ningún dato, incluyendo que el correo se usará para que un asesor pueda
contactar. El descargo de «orientación educativa, no asesoramiento regulado»
visible en la interfaz y en todo plan emitido.

### Fuera de alcance

| Qué | Por qué |
|---|---|
| Recomendar productos concretos (fondos, tickers, entidades) | Límite duro del criterio. Solo clases de activo y porcentajes. |
| Ejecutar operaciones o conectar con brókeres | El producto orienta; no opera. |
| Conexión bancaria automática (open banking) | Los datos los da el cliente. Añadiría complejidad regulatoria sin mejorar el diagnóstico. |
| Asesoramiento financiero regulado | Requiere autorización que el producto no tiene. Es orientación educativa. |
| Seguimiento continuo de carteras | El producto entrega un diagnóstico puntual, no gestión. |
| Multi-idioma | Castellano. |

---

## Requisitos no funcionales

- **Trazabilidad.** Toda cifra de un plan debe poder rastrearse hasta un dato
  de la ficha o una regla del criterio. Sin excepciones.
- **Reproducibilidad.** El mismo informe, recalculado, da el mismo número. La
  simulación va con semilla fija.
- **Protección de datos.** Datos financieros personales: región Americas,
  consentimiento previo, y ninguna tabla accesible sin pasar por el servidor.
- **Tolerancia al abandono.** Una entrevista dejada a medias conserva lo
  capturado hasta ese punto. Si se abandona antes de dar nombre y correo, no
  queda ningún dato personal.
- **Resistencia al abuso.** La entrevista es pública y cada mensaje cuesta
  dinero en la API del modelo. Límite de entrevistas por IP y hora, y de
  mensajes por entrevista.

---

## Criterios de éxito

1. Un cliente completa la entrevista en menos de 10 minutos sin ayuda.
2. La ficha resultante tiene las 14 claves con etiqueta correcta — en
   particular, un dato obtenido ofreciendo rangos sale como `estimado`, no como
   `confirmado`.
3. Ningún número del plan procede del modelo de lenguaje.
4. La negativa del cliente a hablar de deudas deja el sistema en modo
   suspendido, sin emitir recomendación.
5. Marta identifica en menos de 30 segundos qué cliente de su lista tiene la
   meta en riesgo.

---

## Decisiones de producto ya cerradas

Estas se debatieron y están decididas. Se documentan aquí para que no se
reabran en cada sesión; el razonamiento completo está en
`docs/architecture.md`.

| Decisión | Alternativa descartada |
|---|---|
| El modelo entrevista y redacta; nunca calcula | Dejar que el modelo haga las cuentas |
| Extracción de datos turno a turno | Procesar la conversación entera al final |
| Chat + pantalla de confirmación editable | Solo chat, o solo formulario |
| El motor se hereda verificado y no se reescribe | Regenerarlo desde las reglas |
| **Entrada pública desde una landing** | **Que la asesora genere un enlace por cliente** |

Sobre la última: el diseño inicial era que Marta diera de alta a cada cliente y
le enviara un enlace. Se descartó por un motivo que lo invalida entero — **hasta
que Marta no tuviera un cliente, la aplicación no servía para nada**. Eso no es
un producto, es una herramienta interna. Con entrada pública el sistema capta
por sí solo y Marta recibe leads ya diagnosticados.
