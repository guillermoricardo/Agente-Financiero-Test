# Modelo de datos

> El esquema ya está escrito en `supabase/migrations/0001_esquema_inicial.sql`.
> Este documento explica **por qué** es así.

---

## Las cuatro tablas de la entrevista

```
clientes ──1:N──▶ entrevistas ──1:N──▶ mensajes
                        │
                        └──1:N──▶ fichas ──1:N──▶ analisis ──1:N──▶ planes
```

| Tabla | Qué guarda |
|---|---|
| `clientes` | Nombre y correo. **Correo único**: es el identificador del lead. |
| `entrevistas` | Estado, token, **fecha de consentimiento** y caducidad. |
| `mensajes` | La conversación completa, mensaje a mensaje. |
| `fichas` | Los datos capturados, en `jsonb`, versionados. |
| `analisis` | La salida del motor: todos los números del informe. |
| `planes` | El texto entregado al cliente, con su descargo. |
| `limites_uso` | Registro de uso por hash de IP, para frenar el abuso. |

### El orden de creación importa

La entrevista **nace antes que el cliente**, y eso es deliberado:

1. El visitante acepta el consentimiento → se crea la **entrevista** con su
   token. Todavía es anónima: `cliente_id` es `NULL`.
2. Da su nombre y su correo dentro del chat → se crea el **cliente** y se
   enlaza.

Así, quien abandone antes del paso 2 no deja ningún dato personal en la base de
datos. Es el principio de minimización de la LFPDPPP aplicado al esquema, no
solo a la interfaz.

Por eso el consentimiento vive en `entrevistas` y no en `clientes`: ocurre
antes de que exista el cliente, y es lo que autoriza a recoger sus datos.

### Por qué el correo es único

Es el identificador del lead. Si alguien vuelve a hacer una entrevista con el
mismo correo, se enlaza al mismo cliente en vez de duplicarlo — un cliente,
varias entrevistas. Normalizar a minúsculas en la aplicación antes de insertar.

### Por qué los mensajes se guardan desde el primer turno

El modelo no tiene memoria: en cada turno hay que reenviarle la conversación
entera. Así que el historial tiene que estar donde el servidor pueda leerlo, no
en el navegador. Guardarlo además hace que una entrevista abandonada se pueda
retomar y que Marta pueda leer qué dijo el cliente exactamente.

### Por qué las fichas se versionan

Una ficha cerrada **no se sobrescribe nunca**. Si hay que rehacerla, se crea
una versión nueva. Es la misma regla que en la versión de escritorio
(`ficha-[nombre]-AAAA-MM-DD.md`), y existe porque un plan tiene que poder
justificarse con los datos exactos que lo generaron, no con los de después.

### Por qué `analisis` guarda versión de motor y de reglas

Sin eso, un informe de hace seis meses es irreproducible: no sabrías con qué
supuestos se calculó. Los criterios se revisan al menos una vez al año, así que
esto pasa de verdad.

---

## El contrato de la ficha

Es el corazón del sistema. Las claves vienen de
`docs/criterio/instrucciones-motor.md` §2 y **no se renombran**: el motor y el
redactor dependen de ellas. El tipo en código está en `src/lib/motor/ficha.ts`.

| Bloque | Claves |
|---|---|
| 1 · Objetivo | `objetivo_descripcion`, `objetivo_cifra`, `objetivo_plazo` |
| 2 · Situación | `ingresos_netos_mes`, `ingresos_estabilidad` |
| 3 · Gasto | `gasto_total_mes` |
| 4 · Ahorro actual | `aportacion_mensual_actual` |
| 5 · Patrimonio | `patrimonio_total`, `patrimonio_distribucion` |
| 6 · Deudas | `deudas` |
| 7 · Colchón | `colchon_meses` |
| 8 · Riesgo | `riesgo_experiencia`, `riesgo_escenario`, `riesgo_perfil_derivado` |

### Un dato nunca viaja solo

```ts
interface Dato<T> {
  valor: T | null;
  etiqueta: 'confirmado' | 'estimado' | 'pendiente';
  cita?: string;      // palabras textuales del cliente
  supuesto?: string;  // si se aplicó un extremo prudente de un rango
}
```

- **`etiqueta`** decide el modo del informe. Es el campo más importante del
  sistema entero.
- **`cita`** es la trazabilidad. Cuando Marta vea un número raro, quiere leer
  qué dijo el cliente.
- **`supuesto`** documenta el sesgo aplicado: si dio «4 o 5 meses» de colchón,
  se usa 4 y aquí queda escrito por qué.

### Cómo se asigna la etiqueta

| Etiqueta | Cuándo |
|---|---|
| `confirmado` | El cliente dio el dato con claridad, o lo corrigió en la pantalla de confirmación. |
| `estimado` | Se obtuvo ofreciéndole rangos, o dijo una aproximación. |
| `pendiente` | Se preguntó, hubo rebote, y sigue sin haber dato. |

Un dato elegido de una lista de rangos **no es lo mismo** que un dato que el
cliente sabía. Confundirlos es el fallo más común al implementar la captura.

### Las deudas son un caso aparte

```ts
type Deudas =
  | { tipo: 'lista'; deudas: Deuda[] }
  | { tipo: 'ninguna' }
  | { tipo: 'pendiente'; motivo: 'negativa_cliente' | 'no_preguntado' }
  | { tipo: 'solo_flag'; hayInteresAlto: boolean };
```

Modelado como unión a propósito, para obligar a tratar el cuarto caso.

Si el cliente **se niega** a hablar de sus deudas, eso no es «un dato menos»:
la recomendación queda **suspendida** entera (R9). Sin saber si hay una tarjeta
al 20 %, el sistema podría recomendarle invertir a alguien que primero debería
cancelarla.

---

## Modos del informe

`determinarModo()` en `src/lib/motor/ficha.ts` lo decide:

| Modo | Cuándo | Qué se emite |
|---|---|---|
| `completo` | Todas las variables críticas presentes (aunque alguna sea `estimado`) | Diagnóstico + propuesta ejecutable |
| `condicionado` | Falta alguna crítica | Diagnóstico + escenarios «si X fuera…». Sin propuesta |
| `suspendido` | Negativa del cliente sobre deudas | Diagnóstico descriptivo. Recomendación expresamente suspendida |

---

## Seguridad de acceso

**RLS activado en todas las tablas. Ninguna política para el rol anónimo.**

- **Marta** entra con Supabase Auth. Estar en la tabla `asesores` *es* el
  permiso: la función `es_asesor()` lo comprueba.
- **El cliente** no habla con la base de datos. Sus escrituras pasan por rutas
  de servidor que validan el token de la entrevista y usan la clave de
  servicio.

Que la entrada sea pública **no debilita esto**. El token sigue siendo la
credencial: lo único que cambia es quién lo genera. Antes lo creaba Marta al
dar de alta a un cliente; ahora lo crea el sistema al aceptarse el
consentimiento. Nadie puede leer ni escribir en una entrevista cuyo token no
tenga.

Que no haya políticas para `anon` es deliberado: el día que se filtre la clave
pública, la base de datos no expone nada.

Las escrituras tampoco tienen políticas. Todo pasa por el servidor, que es
quien garantiza que una ficha no se modifica a mano después de haber calculado
el plan.

---

## Campos denormalizados

`fichas` repite fuera del `jsonb` unos pocos campos (`objetivo_cifra`,
`objetivo_plazo`, `perfil`, `tipo_de_meta`). Es duplicación consciente: el
listado del panel necesita ordenar y filtrar sin abrir el `jsonb` de cada
cliente. Se escriben en el mismo momento que la ficha y nunca por separado.
