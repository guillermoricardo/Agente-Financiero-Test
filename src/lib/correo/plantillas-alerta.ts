import { DESCARGO_LITERAL } from '@/lib/plan/construir-markdown';
import { resend, REMITENTE_ALERTAS } from './cliente';

// Fase 11 · El descargo se añade aquí, como texto fijo — igual que en
// construirMarkdownPlan (Fase 8) — para que nunca dependa de que el modelo
// se acuerde de incluirlo (docs/business.md: "el descargo aparece en TODO
// plan emitido, sin excepción").

// El cuerpo lo redacta el modelo a partir de datos que incluyen texto libre
// del cliente (objetivo_descripcion). Un LLM no es un límite de seguridad:
// hay que escapar antes de interpolar en HTML, igual que se haría con
// cualquier texto de origen externo.
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function envolverCorreo(cuerpo: string): string {
  const parrafos = cuerpo
    .trim()
    .split('\n')
    .map((linea) => `<p>${escaparHtml(linea)}</p>`)
    .join('\n');

  return `${parrafos}\n<hr />\n<p style="color:#666;font-size:13px;">${escaparHtml(DESCARGO_LITERAL)}</p>`;
}

export interface ResultadoEnvio {
  enviadoMartaEn: string | null;
  enviadoClienteEn: string | null;
}

/**
 * Envía los dos correos de una alerta ya redactada. Cada envío se intenta
 * por separado: que uno falle no bloquea al otro, y ninguno de los dos
 * bloquea que la alerta quede registrada en `alertas_mercado` (el correo es
 * un efecto secundario, no la fuente de verdad — docs/data-model.md).
 */
export async function enviarAlertaMercado(destinos: {
  emailMarta: string;
  nombreCliente: string;
  emailCliente: string;
  mensajeMarta: string;
  mensajeCliente: string;
}): Promise<ResultadoEnvio> {
  const [marta, cliente] = await Promise.all([
    resend.emails
      .send({
        from: REMITENTE_ALERTAS,
        to: destinos.emailMarta,
        subject: `Cambio de banda: ${destinos.nombreCliente}`,
        html: envolverCorreo(destinos.mensajeMarta),
      })
      .then(() => new Date().toISOString())
      .catch((error) => {
        console.error('No se pudo enviar la alerta a Marta:', error);
        return null;
      }),
    resend.emails
      .send({
        from: REMITENTE_ALERTAS,
        to: destinos.emailCliente,
        subject: 'Tu plan financiero: ha cambiado algo',
        html: envolverCorreo(destinos.mensajeCliente),
      })
      .then(() => new Date().toISOString())
      .catch((error) => {
        console.error('No se pudo enviar la alerta al cliente:', error);
        return null;
      }),
  ]);

  return { enviadoMartaEn: marta, enviadoClienteEn: cliente };
}
