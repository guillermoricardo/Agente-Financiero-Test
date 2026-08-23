'use client';

import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import type { Cartera } from '@/lib/motor/supuestos';

// Visualización 2 de 4: "Composición de la cartera — anillo con las clases
// de activo." docs/design-system.md § Tono de voz: los pesos se muestran en
// formato «de cada 100 € que inviertas», nunca como porcentaje pelado.
const ETIQUETA_CLASE: Record<string, string> = {
  liquidez: 'Liquidez',
  renta_fija: 'Renta fija',
  renta_variable: 'Renta variable',
  oro: 'Oro',
};

const COLOR_CLASE: Record<string, string> = {
  liquidez: '#a1a1aa',
  renta_fija: '#0284c7',
  renta_variable: '#059669',
  oro: '#d97706',
};

export default function GraficoCartera({ pesos }: { pesos: Cartera | null }) {
  if (!pesos) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-zinc-500">
        No hay cartera propuesta: el informe no está en modo completo.
      </div>
    );
  }

  const datos = Object.entries(pesos)
    .filter(([, peso]) => (peso ?? 0) > 0)
    .map(([clase, peso]) => ({
      nombre: ETIQUETA_CLASE[clase] ?? clase,
      clase,
      valor: Math.round((peso ?? 0) * 100),
    }));

  return (
    <div className="flex h-48 items-center justify-center">
      <PieChart width={280} height={192}>
        <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={48} outerRadius={72} paddingAngle={2}>
          {datos.map((entrada) => (
            <Cell key={entrada.clase} fill={COLOR_CLASE[entrada.clase] ?? '#a1a1aa'} />
          ))}
        </Pie>
        <Tooltip formatter={(valor) => `${valor} € de cada 100 €`} />
        <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
      </PieChart>
    </div>
  );
}
