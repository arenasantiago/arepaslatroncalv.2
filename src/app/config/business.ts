/**
 * Configuracion central del negocio: un unico lugar para los datos que se repiten
 * en la web (telefono, correo, direccion, horarios, redes). Cambiar aqui actualiza
 * todas las paginas, el pie de pagina y los datos estructurados para Google.
 *
 * NUMERO DE WHATSAPP: sale de la variable WHATSAPP_PHONE (.env en local, variables de
 * entorno en Vercel). Si no se define, scripts/generar-env.mjs usa el numero real del
 * negocio. Asi el numero de pruebas nunca queda en el repositorio.
 */
import { ENV } from './env.generated';

/** Telefono de WhatsApp en formato internacional SIN '+' (lo exige wa.me). */
export const whatsappPhone: string = ENV.whatsappPhone;

/** Telefono legible, derivado de `whatsappPhone` (ej. "+57 312 249 3344"). */
export const whatsappDisplay = `+${whatsappPhone.slice(0, 2)} ${whatsappPhone.slice(2, 5)} ${whatsappPhone.slice(5, 8)} ${whatsappPhone.slice(8)}`;

/** Marca / negocio. */
export const businessName = 'Arepas La Troncal';

export interface Horario {
  /** Texto para personas. */
  dias: string;
  texto: string;
  /** Datos para Google (schema.org OpeningHoursSpecification). */
  diasSchema: string[];
  abre: string;
  cierra: string;
}

export const negocio = {
  nombre: businessName,
  lema: 'Fábrica de arepas al carbón',
  email: 'arepaslatroncal@hotmail.com',
  instagram: 'https://www.instagram.com/arepaslatroncal/',
  direccion: {
    calle: 'Cra 20 #8-64, La Troncal',
    ciudad: 'Caucasia',
    region: 'Antioquia',
    pais: 'CO',
  },
  /** Horario publicado en la pagina de contacto. */
  horarios: [
    {
      dias: 'Lunes a sábado',
      texto: '3:00 a. m. a 12:45 p. m.',
      diasSchema: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      abre: '03:00',
      cierra: '12:45',
    },
    {
      dias: 'Domingo',
      texto: '4:00 a. m. a 11:00 a. m.',
      diasSchema: ['Sunday'],
      abre: '04:00',
      cierra: '11:00',
    },
  ] as Horario[],
  mapaEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3951.1872815104343!2d-75.2021974!3d7.979585!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e5b6f003241fb27%3A0xe47777077985674a!2sArepas%20la%20troncal!5e0!3m2!1ses-419!2sco!4v1754836927948!5m2!1ses-419!2sco',
  mapaUrl: 'https://www.google.com/maps/search/?api=1&query=Arepas%20la%20troncal%20Caucasia',
} as const;

/**
 * Construye un enlace de WhatsApp (wa.me) con un mensaje opcional pre-cargado.
 * @param message Texto del mensaje (se codifica automaticamente).
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${whatsappPhone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
