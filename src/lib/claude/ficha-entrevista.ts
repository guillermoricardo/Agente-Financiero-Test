// Fase 5 · "La entrevista que escucha".
//
// Traduce las llamadas a la herramienta guardar_dato (claves en snake_case,
// las mismas de docs/criterio/plantilla-entrevista.md y
// docs/criterio/instrucciones-motor.md §2) a la forma del tipo `Ficha` de
// src/lib/motor/ficha.ts (camelCase), que es la forma que docs/data-model.md
// exige para la columna `fichas.datos`. Es la única traducción de
// nombres del sistema — motor.ts y el resto del código del motor nunca ven
// snake_case.
//
// Estas funciones son deterministas (a diferencia del chat): dado el mismo
// estado y la misma llamada a guardar_dato, el resultado es siempre el
// mismo. Por eso, a diferencia de docs/testing.md § "por qué el chat no
// lleva tests automáticos", esta parte sí los lleva.

import type { Dato, Deudas, Etiqueta, Ficha } from '@/lib/motor/ficha';

export type ClaveDato =
  | 'objetivo_descripcion'
  | 'objetivo_cifra'
  | 'objetivo_plazo'
  | 'ingresos_netos_mes'
  | 'ingresos_estabilidad'
  | 'gasto_total_mes'
  | 'aportacion_mensual_actual'
  | 'patrimonio_total'
  | 'patrimonio_distribucion'
  | 'deudas'
  | 'colchon_meses'
  | 'riesgo_experiencia'
  | 'riesgo_escenario'
  | 'riesgo_perfil_derivado'
  | 'pendientes';

export const CLAVES_DATO: ClaveDato[] = [
  'objetivo_descripcion',
  'objetivo_cifra',
  'objetivo_plazo',
  'ingresos_netos_mes',
  'ingresos_estabilidad',
  'gasto_total_mes',
  'aportacion_mensual_actual',
  'patrimonio_total',
  'patrimonio_distribucion',
  'deudas',
  'colchon_meses',
  'riesgo_experiencia',
  'riesgo_escenario',
  'riesgo_perfil_derivado',
  'pendientes',
];

// docs/data-model.md § "El contrato de la ficha": las claves NO se
// renombran. Este es el único punto del sistema que traduce entre la forma
// snake_case de la plantilla y la forma camelCase del tipo `Ficha`.
const CLAVE_A_CAMPO: Record<Exclude<ClaveDato, 'pendientes'>, keyof Ficha> = {
  objetivo_descripcion: 'objetivoDescripcion',
  objetivo_cifra: 'objetivoCifra',
  objetivo_plazo: 'objetivoPlazo',
  ingresos_netos_mes: 'ingresosNetosMes',
  ingresos_estabilidad: 'ingresosEstabilidad',
  gasto_total_mes: 'gastoTotalMes',
  aportacion_mensual_actual: 'aportacionMensualActual',
  patrimonio_total: 'patrimonioTotal',
  patrimonio_distribucion: 'patrimonioDistribucion',
  deudas: 'deudas',
  colchon_meses: 'colchonMeses',
  riesgo_experiencia: 'riesgoExperiencia',
  riesgo_escenario: 'riesgoEscenario',
  riesgo_perfil_derivado: 'riesgoPerfilDerivado',
};

// docs/roadmap.md Fase 5 § "barra de progreso de los 8 bloques". Un bloque
// se cuenta como avanzado en cuanto TODAS sus claves tienen algún dato — así
// sea `pendiente` (se preguntó y no hubo respuesta clara): eso también es un
// bloque "cubierto", no uno a medias.
export const BLOQUES: { numero: number; titulo: string; claves: ClaveDato[] }[] = [
  { numero: 1, titulo: 'El objetivo', claves: ['objetivo_descripcion', 'objetivo_cifra', 'objetivo_plazo'] },
  { numero: 2, titulo: 'Situación de partida', claves: ['ingresos_netos_mes', 'ingresos_estabilidad'] },
  { numero: 3, titulo: 'El gasto', claves: ['gasto_total_mes'] },
  { numero: 4, titulo: 'Lo que ya ahorra', claves: ['aportacion_mensual_actual'] },
  { numero: 5, titulo: 'Patrimonio', claves: ['patrimonio_total', 'patrimonio_distribucion'] },
  { numero: 6, titulo: 'Deudas', claves: ['deudas'] },
  { numero: 7, titulo: 'El colchón', claves: ['colchon_meses'] },
  { numero: 8, titulo: 'Riesgo', claves: ['riesgo_experiencia', 'riesgo_escenario', 'riesgo_perfil_derivado'] },
];

export type FichaParcial = Partial<Ficha>;

/**
 * Aplica una llamada a guardar_dato sobre el estado actual de la ficha.
 * No muta `datosActuales`: devuelve un objeto nuevo, para que el llamador
 * decida cuándo persistirlo.
 */
export function fusionarDato(
  datosActuales: FichaParcial,
  entrada: { clave: string; valor: unknown; etiqueta?: string; cita?: string; supuesto?: string },
): FichaParcial {
  const clave = entrada.clave as ClaveDato;

  if (clave === 'pendientes') {
    const nota = typeof entrada.valor === 'string' ? entrada.valor.trim() : '';
    if (!nota) return datosActuales;
    const actuales = datosActuales.pendientes ?? [];
    if (actuales.includes(nota)) return datosActuales;
    return { ...datosActuales, pendientes: [...actuales, nota] };
  }

  const campo = CLAVE_A_CAMPO[clave];
  if (!campo) {
    // Clave desconocida: el modelo se equivocó de nombre. Se ignora en vez
    // de romper la entrevista — docs/criterio: "nunca inventar datos", y
    // guardar algo bajo una clave inventada sería peor que no guardarlo.
    return datosActuales;
  }

  const etiqueta: Etiqueta =
    entrada.etiqueta === 'confirmado' || entrada.etiqueta === 'estimado' || entrada.etiqueta === 'pendiente'
      ? entrada.etiqueta
      : 'pendiente';

  const dato: Dato<unknown> = {
    valor: entrada.valor === undefined ? null : (entrada.valor as never),
    etiqueta,
    ...(entrada.cita ? { cita: entrada.cita } : {}),
    ...(entrada.supuesto ? { supuesto: entrada.supuesto } : {}),
  };

  return { ...datosActuales, [campo]: dato };
}

/** Bloques con al menos un dato en TODAS sus claves. */
export function calcularProgreso(datos: FichaParcial): {
  bloquesCompletos: number;
  totalBloques: number;
  bloques: { numero: number; titulo: string; completo: boolean }[];
} {
  const bloques = BLOQUES.map((bloque) => ({
    numero: bloque.numero,
    titulo: bloque.titulo,
    completo: bloque.claves.every((clave) => {
      if (clave === 'pendientes') return true;
      const campo = CLAVE_A_CAMPO[clave];
      return Boolean((datos as Record<string, unknown>)[campo]);
    }),
  }));

  return {
    bloquesCompletos: bloques.filter((b) => b.completo).length,
    totalBloques: BLOQUES.length,
    bloques,
  };
}

/**
 * Texto legible para inyectar en el prompt de sistema en cada turno.
 * docs/architecture.md § decisión 3: "la plantilla tiene reglas que
 * necesitan saber el estado de la ficha en tiempo real" — sin esto el
 * modelo no puede aplicar "captura al vuelo" (Variante 2 de
 * material-clase/GUION-CLIENTE-PRUEBA.md).
 */
export function resumenFichaParaPrompt(datos: FichaParcial): string {
  const entradas = Object.entries(datos).filter(([clave]) => clave !== 'pendientes') as [
    keyof Ficha,
    Dato<unknown>,
  ][];

  if (entradas.length === 0 && (!datos.pendientes || datos.pendientes.length === 0)) {
    return 'Todavía no se ha guardado ningún dato de la ficha.';
  }

  const lineas = entradas.map(([campo, dato]) => {
    const valor = typeof dato.valor === 'object' ? JSON.stringify(dato.valor) : String(dato.valor);
    return `- ${campo}: ${valor} [${dato.etiqueta}]`;
  });

  if (datos.pendientes && datos.pendientes.length > 0) {
    lineas.push(`- pendientes anotados: ${datos.pendientes.join('; ')}`);
  }

  return lineas.join('\n');
}

// Fase 6 · "Confirmación y cierre" — docs/roadmap.md: "pantalla de resumen
// editable en lenguaje llano". Los 13 campos de abajo son escalares (texto o
// número) y se editan con un input normal. `deudas` queda fuera a propósito:
// es la única variable de forma compuesta (una lista de deudas, cada una con
// cuota/interés/saldo, o el caso especial de negativa del cliente) — meterla
// en un formulario de campo único sería o mentiroso (perder estructura) o
// pesado de construir bien para esta fase. Se muestra en modo lectura con un
// resumen en español; cualquier corrección se comenta con Marta en la
// reunión, igual que ya contempla el guion cuando el cliente prefiere no
// detallar sus deudas.
export const CAMPOS_EDITABLES: {
  clave: Exclude<ClaveDato, 'deudas' | 'pendientes'>;
  campo: keyof Ficha;
  etiquetaCampo: string;
  tipo: 'texto' | 'numero';
}[] = [
  { clave: 'objetivo_descripcion', campo: 'objetivoDescripcion', etiquetaCampo: 'Tu objetivo', tipo: 'texto' },
  { clave: 'objetivo_cifra', campo: 'objetivoCifra', etiquetaCampo: 'Cifra que quieres alcanzar', tipo: 'numero' },
  { clave: 'objetivo_plazo', campo: 'objetivoPlazo', etiquetaCampo: 'En cuántos años', tipo: 'numero' },
  { clave: 'ingresos_netos_mes', campo: 'ingresosNetosMes', etiquetaCampo: 'Ingresos netos al mes', tipo: 'numero' },
  { clave: 'ingresos_estabilidad', campo: 'ingresosEstabilidad', etiquetaCampo: 'Tus ingresos son', tipo: 'texto' },
  { clave: 'gasto_total_mes', campo: 'gastoTotalMes', etiquetaCampo: 'Gasto total al mes', tipo: 'numero' },
  {
    clave: 'aportacion_mensual_actual',
    campo: 'aportacionMensualActual',
    etiquetaCampo: 'Lo que ahorras o inviertes al mes',
    tipo: 'numero',
  },
  {
    clave: 'patrimonio_total',
    campo: 'patrimonioTotal',
    etiquetaCampo: 'Total ahorrado o invertido hoy',
    tipo: 'numero',
  },
  {
    clave: 'patrimonio_distribucion',
    campo: 'patrimonioDistribucion',
    etiquetaCampo: 'Dónde está ese dinero',
    tipo: 'texto',
  },
  { clave: 'colchon_meses', campo: 'colchonMeses', etiquetaCampo: 'Meses de colchón', tipo: 'numero' },
  {
    clave: 'riesgo_experiencia',
    campo: 'riesgoExperiencia',
    etiquetaCampo: 'Tu experiencia invirtiendo antes',
    tipo: 'texto',
  },
  {
    clave: 'riesgo_escenario',
    campo: 'riesgoEscenario',
    etiquetaCampo: 'Ante una caída del 20%, tú...',
    tipo: 'texto',
  },
  {
    clave: 'riesgo_perfil_derivado',
    campo: 'riesgoPerfilDerivado',
    etiquetaCampo: 'Tu perfil de riesgo',
    tipo: 'texto',
  },
];

/** Frase en español de lo que se capturó sobre deudas, para mostrar en modo lectura. */
export function resumenDeudasEnLenguajeLlano(dato?: Dato<Deudas>): string {
  if (!dato || dato.valor === null || dato.valor === undefined) {
    return 'Todavía no se habló de esto en la conversación.';
  }

  const deudas = dato.valor;

  if (deudas.tipo === 'ninguna') {
    return 'Dijiste que no tienes deudas.';
  }

  if (deudas.tipo === 'pendiente') {
    return deudas.motivo === 'negativa_cliente'
      ? 'Preferiste no dar el detalle. Marta lo verá contigo en la reunión.'
      : 'Todavía no se preguntó por esto.';
  }

  if (deudas.tipo === 'solo_flag') {
    return deudas.hayInteresAlto
      ? 'Confirmaste que sí hay alguna deuda con interés alto.'
      : 'Confirmaste que no hay ninguna deuda con interés alto.';
  }

  if (deudas.deudas.length === 0) {
    return 'No se registró ninguna deuda concreta.';
  }

  return deudas.deudas
    .map((d) => {
      const partes = [d.tipo || 'deuda'];
      if (d.cuota !== null) partes.push(`cuota ${d.cuota}`);
      if (d.interes !== null) partes.push(`interés ${d.interes}%`);
      partes.push(d.saldo !== null ? `saldo pendiente ${d.saldo}` : 'saldo pendiente sin especificar');
      return partes.join(', ');
    })
    .join(' · ');
}

/**
 * Fase 6: aplica las correcciones del formulario de confirmación. A
 * diferencia de fusionarDato (que decide la etiqueta según cómo se obtuvo el
 * dato durante el chat), aquí la etiqueta la decide una regla fija del
 * roadmap: "Correcciones → confirmado". Si el cliente revisa un campo y lo
 * deja tal cual como estaba, no se toca su etiqueta anterior; si lo cambia
 * (incluido rellenar uno que estaba vacío o `pendiente`), pasa a
 * `confirmado` — ya lo confirmó él mismo, con su propia mano, en la pantalla
 * pensada exactamente para eso.
 */
export function aplicarCorrecciones(
  datosActuales: FichaParcial,
  valores: Record<string, string | number | null>,
): FichaParcial {
  let resultado = datosActuales;

  for (const { clave, campo, tipo } of CAMPOS_EDITABLES) {
    if (!(clave in valores)) continue;

    const enviado = valores[clave];
    const valorNuevo =
      enviado === null || enviado === ''
        ? null
        : tipo === 'numero'
          ? Number(enviado)
          : String(enviado).trim();

    if (valorNuevo === null) continue; // Un campo vacío no borra un dato ya capturado.
    if (tipo === 'numero' && Number.isNaN(valorNuevo)) continue;

    const datoActual = (resultado as Record<string, Dato<unknown> | undefined>)[campo];
    const cambio = JSON.stringify(datoActual?.valor) !== JSON.stringify(valorNuevo);

    if (!cambio) continue;

    resultado = {
      ...resultado,
      [campo]: {
        valor: valorNuevo,
        etiqueta: 'confirmado' as Etiqueta,
        ...(datoActual?.cita ? { cita: datoActual.cita } : {}),
      },
    };
  }

  return resultado;
}

/** Campos denormalizados que docs/data-model.md pide escribir junto a `datos`. */
export function extraerDenormalizados(datos: FichaParcial): {
  objetivo_descripcion: string | null;
  objetivo_cifra: number | null;
  objetivo_plazo: number | null;
  perfil: string | null;
} {
  return {
    objetivo_descripcion:
      typeof datos.objetivoDescripcion?.valor === 'string' ? datos.objetivoDescripcion.valor : null,
    objetivo_cifra: typeof datos.objetivoCifra?.valor === 'number' ? datos.objetivoCifra.valor : null,
    objetivo_plazo: typeof datos.objetivoPlazo?.valor === 'number' ? datos.objetivoPlazo.valor : null,
    perfil: typeof datos.riesgoPerfilDerivado?.valor === 'string' ? datos.riesgoPerfilDerivado.valor : null,
  };
}
