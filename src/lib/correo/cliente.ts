import 'server-only';
import { Resend } from 'resend';

// Fase 11 · docs/architecture.md § "Correo: Resend". Mismo principio que
// src/lib/claude/cliente.ts: la clave vive solo en el servidor, nunca con
// prefijo NEXT_PUBLIC_.

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error(
    'Falta RESEND_API_KEY. Revisa tu .env.local (cópialo desde .env.example ' +
      'si no existe) y añade tu clave de resend.com.',
  );
}

export const resend = new Resend(apiKey);

// Remitente de las alertas de mercado. Requiere un dominio verificado en
// Resend; hasta entonces, usar el remitente de pruebas que Resend ofrece
// por defecto (onboarding@resend.dev) solo sirve para enviarte a ti mismo.
export const REMITENTE_ALERTAS = process.env.RESEND_REMITENTE_ALERTAS ?? 'onboarding@resend.dev';
