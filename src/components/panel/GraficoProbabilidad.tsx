'use client';

import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts';
import { porcentaje } from '@/lib/panel/formato';
import type { BandaProbabilidad } from '@/lib/motor/supuestos';

// Visualización 1 de 4 (docs/design-system.md § "Visualizaciones del
// panel"): "Probabilidad de cumplimiento — indicador con su banda. El dato
// que resume todo." Un único anillo relleno hasta la probabilidad, coloreado
// según la banda (el único sitio, junto a la tabla, donde se usa semáforo).
const COLOR_TRAZO: Record<BandaProbabilidad, string> = {
  Alta: '#059669',
  Razonable: '#0284c7',
  Frágil: '#d97706',
  Baja: '#dc2626',
};

export default function GraficoProbabilidad({
  probabilidad,
  banda,
}: {
  probabilidad: number | null;
  banda: BandaProbabilidad | null;
}) {
  if (probabilidad === null || banda === null) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-zinc-500">
        No hay probabilidad calculada: el informe no está en modo completo.
      </div>
    );
  }

  const datos = [{ nombre: 'probabilidad', valor: probabilidad * 100, fill: COLOR_TRAZO[banda] }];

  return (
    <div className="relative flex h-48 items-center justify-center">
      <RadialBarChart
        width={192}
        height={192}
        cx="50%"
        cy="50%"
        innerRadius="72%"
        outerRadius="100%"
        barSize={16}
        data={datos}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar dataKey="valor" background={{ fill: '#f4f4f5' }} cornerRadius={8} />
      </RadialBarChart>
      <div className="pointer-events-none absolute flex flex-col items-center">
        <span className="text-2xl font-semibold text-zinc-900">{porcentaje(probabilidad)}</span>
        <span className="text-xs font-medium" style={{ color: COLOR_TRAZO[banda] }}>
          {banda}
        </span>
      </div>
    </div>
  );
}
