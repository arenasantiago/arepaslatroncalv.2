#!/usr/bin/env node
// Genera la configuracion de build a partir de variables de entorno.
//   Fuente: archivo .env (desarrollo local) + process.env (Vercel/CI). process.env gana.
//   Salidas (ignoradas por git):
//     - src/app/config/env.generated.ts   -> constantes que usa la app
//     - src/generated-public/robots.txt    -> se copian a la raiz del sitio
//     - src/generated-public/sitemap.xml
// Se ejecuta solo antes de start/build/test (scripts pre* de package.json).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function leerDotEnv(ruta) {
  if (!existsSync(ruta)) return {};
  const vars = {};
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

const dotenv = leerDotEnv(join(raiz, '.env'));
const leer = (clave) => (process.env[clave] ?? dotenv[clave] ?? '').trim();

// Numero real del negocio (publico). En local, .env lo reemplaza por el de pruebas.
const WHATSAPP_REAL = '573122493344';

const vercelProd = leer('VERCEL_PROJECT_PRODUCTION_URL');
const config = {
  supabaseUrl: leer('SUPABASE_URL').replace(/\/+$/, ''),
  supabaseKey: leer('SUPABASE_PUBLISHABLE_KEY'),
  whatsappPhone: leer('WHATSAPP_PHONE') || WHATSAPP_REAL,
  siteUrl: (leer('SITE_URL') || (vercelProd ? `https://${vercelProd}` : 'http://localhost:4200')).replace(/\/+$/, ''),
};

const errores = [];
if (!/^\d{10,15}$/.test(config.whatsappPhone)) errores.push('WHATSAPP_PHONE debe tener solo digitos (10-15), con indicativo de pais, ej. 573001234567');
if (config.supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)) errores.push('SUPABASE_URL debe ser https://<ref>.supabase.co');
if (config.supabaseKey && /^sb_secret_|service_role/.test(config.supabaseKey)) errores.push('SUPABASE_PUBLISHABLE_KEY recibio una clave SECRETA. Usa la publishable (sb_publishable_...)');
if (!/^https?:\/\/[^\s/]+$/.test(config.siteUrl)) errores.push('SITE_URL debe ser un origen, ej. https://arepaslatroncal.vercel.app');
if (errores.length) {
  console.error('[generar-env] Configuracion invalida:\n - ' + errores.join('\n - '));
  process.exit(1);
}
if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn('[generar-env] AVISO: sin SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY. El menu usara los datos locales y los pedidos iran directo a WhatsApp sin guardarse.');
}

const ts = `// ARCHIVO GENERADO por scripts/generar-env.mjs. No editar ni versionar.
export const ENV = ${JSON.stringify(config, null, 2)} as const;
`;
const rutaTs = join(raiz, 'src/app/config/env.generated.ts');
mkdirSync(dirname(rutaTs), { recursive: true });
writeFileSync(rutaTs, ts);

// Rutas publicas indexables (el carrito y el panel no van al sitemap).
const rutas = [
  { path: '/inicio', freq: 'weekly', prio: '1.0' },
  { path: '/productos', freq: 'weekly', prio: '0.9' },
  { path: '/nosotros', freq: 'monthly', prio: '0.7' },
  { path: '/contacto', freq: 'monthly', prio: '0.7' },
];
const hoy = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url>
    <loc>${config.siteUrl}${r.path}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${r.freq}</changefreq>
    <priority>${r.prio}</priority>
  </url>`).join('\n')}
</urlset>
`;
const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /carrito

Sitemap: ${config.siteUrl}/sitemap.xml
`;
const pub = join(raiz, 'src/generated-public');
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, 'sitemap.xml'), sitemap);
writeFileSync(join(pub, 'robots.txt'), robots);

const oculto = (v) => (v ? `${v.slice(0, 14)}...` : '(vacio)');
console.log(`[generar-env] OK -> supabase=${config.supabaseUrl || '(sin configurar)'} key=${oculto(config.supabaseKey)} whatsapp=***${config.whatsappPhone.slice(-4)} site=${config.siteUrl}`);
