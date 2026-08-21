import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

// docs/architecture.md § "Protección del flujo público": nunca se guarda la
// IP en claro, solo un hash — sirve igual para contar y deja de ser un dato
// personal identificable (RGPD/LFPDPPP).
export function hashearIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

// En producción (Vercel) la IP real del visitante llega en
// `x-forwarded-for`. En desarrollo local esa cabecera normalmente no existe,
// así que se usa un valor fijo para no romper el flujo mientras se prueba.
export async function obtenerIpDeLaPeticion(): Promise<string> {
  const cabeceras = await headers();
  const forwardedFor = cabeceras.get('x-forwarded-for');
  if (forwardedFor) {
    // Puede traer una lista "cliente, proxy1, proxy2" — la primera es la real.
    return forwardedFor.split(',')[0].trim();
  }
  return cabeceras.get('x-real-ip') ?? '127.0.0.1';
}
