'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { euros, anios } from '@/lib/panel/formato';
import {
  COLOR_BANDA,
  ETIQUETA_ESTADO,
  rangoUrgencia,
  type FilaListado,
} from '@/lib/panel/tipos';

// docs/user-flows.md § Flujo 2 · "2. Listado. Una fila por cliente: nombre,
// correo, meta, plazo, banda de probabilidad y estado de la entrevista.
// Ordenable por banda, que es como se detecta a quién hay que llamar
// primero." Por defecto se ordena de más urgente a menos (banda Baja / sin
// análisis primero) — el clic en la cabecera de columna invierte el orden.
export default function TablaListado({
  filas,
  analisisConAlerta,
}: {
  filas: FilaListado[];
  /** Fase 11 · analisis_id con al menos una alerta de mercado (R11). */
  analisisConAlerta?: Set<string>;
}) {
  const [ordenAscendente, setOrdenAscendente] = useState(true);

  const filasOrdenadas = useMemo(() => {
    const copia = [...filas];
    copia.sort((a, b) => {
      const diferencia = rangoUrgencia(a) - rangoUrgencia(b);
      return ordenAscendente ? diferencia : -diferencia;
    });
    return copia;
  }, [filas, ordenAscendente]);

  if (filas.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm leading-6 text-zinc-600 shadow-sm">
        Todavía no ha llegado ningún lead. En cuanto alguien complete y
        confirme una entrevista, aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Correo</th>
            <th className="px-4 py-3">Meta</th>
            <th className="px-4 py-3">Plazo</th>
            <th className="px-4 py-3">
              <button
                type="button"
                onClick={() => setOrdenAscendente((actual) => !actual)}
                className="flex items-center gap-1 font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900"
              >
                Banda {ordenAscendente ? '↑ más urgente primero' : '↓ mejor primero'}
              </button>
            </th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((fila) => (
            <tr key={fila.entrevista_id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
              <td className="px-4 py-3">
                <Link href={`/panel/cliente/${fila.entrevista_id}`} className="font-medium text-zinc-900 underline-offset-2 hover:underline">
                  {fila.cliente_nombre}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-600">{fila.cliente_email}</td>
              <td className="px-4 py-3 text-zinc-600">
                {fila.objetivo_descripcion ?? '—'}
                {fila.objetivo_cifra !== null && <span className="text-zinc-400"> · {euros(fila.objetivo_cifra)}</span>}
              </td>
              <td className="px-4 py-3 text-zinc-600">{anios(fila.objetivo_plazo)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5">
                  {fila.banda ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_BANDA[fila.banda]}`}>{fila.banda}</span>
                  ) : fila.entrevista_estado === 'completada' ? (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">Sin banda</span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                  {fila.analisis_id && analisisConAlerta?.has(fila.analisis_id) && (
                    <span title="El mercado movió su banda desde el último cálculo (R11)" className="text-amber-500">
                      🔔
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-600">{ETIQUETA_ESTADO[fila.entrevista_estado]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
