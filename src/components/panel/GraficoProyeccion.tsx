'use client';

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { euros } from '@/lib/panel/formato';

// Visualización 3 de 4: "Proyección — área con p10/p50/p90 en el tiempo. La
// anchura de la banda ES el mensaje" (docs/design-system.md). El motor
// (Fase 7, `src/lib/motor/calculos.ts::monteCarlo`, intocable) solo devuelve
// los tres percentiles del AÑO FINAL — no una trayectoria completa, y no le
// corresponde a esta fase pedírsela (cambiaría R10). Así que los puntos
// intermedios son una INTERPOLACIÓN puramente visual, calculada aquí, no un
// dato del motor: crecimiento geométrico desde el patrimonio de hoy hasta
// cada percentil final. Decisión de esta fase, documentada en el changelog
// — no confundir con una simulación mes a mes real.
function interpolarGeometrico(inicio: number, final: number, pasos: number): number[] {
  if (inicio <= 0) {
    return Array.from({ length: pasos + 1 }, (_, t) => (final * t) / pasos);
  }
  const razon = final / inicio;
  return Array.from({ length: pasos + 1 }, (_, t) => inicio * razon ** (t / pasos));
}

export default function GraficoProyeccion({
  patrimonioHoy,
  anios,
  p10,
  p50,
  p90,
}: {
  patrimonioHoy: number;
  anios: number;
  p10: number | null;
  p50: number | null;
  p90: number | null;
}) {
  if (p10 === null || p50 === null || p90 === null) {
    return (
      <div className="flex h-56 flex-col items-center justify-center text-center text-sm text-zinc-500">
        No hay proyección: el informe no está en modo completo.
      </div>
    );
  }

  const pasos = Math.max(2, Math.min(anios, 12));
  const serieP10 = interpolarGeometrico(patrimonioHoy, p10, pasos);
  const serieP50 = interpolarGeometrico(patrimonioHoy, p50, pasos);
  const serieP90 = interpolarGeometrico(patrimonioHoy, p90, pasos);

  const datos = serieP50.map((_, i) => {
    const anioActual = Math.round((anios * i) / pasos);
    return {
      anio: anioActual,
      etiqueta: `Año ${anioActual}`,
      p10: Math.round(serieP10[i]),
      p50: Math.round(serieP50[i]),
      p90: Math.round(serieP90[i]),
    };
  });

  return (
    <div className="h-56 w-full">
      <AreaChart width={480} height={224} data={datos} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)} k€`} tick={{ fontSize: 12 }} width={56} />
        <Tooltip formatter={(v) => euros(typeof v === 'number' ? v : Number(v))} labelFormatter={(l) => l} />
        <Area type="monotone" dataKey="p90" stroke="none" fill="#0284c7" fillOpacity={0.12} />
        <Area type="monotone" dataKey="p10" stroke="none" fill="#ffffff" fillOpacity={1} />
        <Area type="monotone" dataKey="p50" stroke="#0284c7" strokeWidth={2} fill="#0284c7" fillOpacity={0.08} />
      </AreaChart>
      <p className="mt-1 text-center text-xs text-zinc-400">
        Puntos intermedios interpolados para ilustrar la horquilla — el
        motor calcula el percentil solo del año final.
      </p>
    </div>
  );
}
