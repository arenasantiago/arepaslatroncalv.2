# CLAUDE.md

## Qué es

Web de **Arepas La Troncal**, fábrica de arepas al carbón en Caucasia, Antioquia. Menú público con precios, carrito, pedidos guardados en Supabase y confirmados por WhatsApp, y un panel privado (`/admin`) para el dueño. Es la versión 2 del sitio (repo `arenasantiago/arepaslatroncalv.2`, dominio `https://arepaslatroncal.com`).

El proyecto Angular vive directamente en la raíz del repositorio. La guía detallada de arquitectura, seguridad y reglas está en **`AGENTS.md`**: léela antes de cambiar código.

## Stack

- Angular 19 standalone (signals, `inject()`, `input()`), TypeScript 5.7.
- Salida estática con prerender (SSG, `outputMode: "static"`); `carrito` y `admin/**` solo en cliente (`/index.csr.html`).
- Tailwind CSS v4 vía PostCSS, tokens de marca en `src/styles.css` (`@theme`). Sin CSS por componente.
- Supabase (Postgres + RLS + RPC). Despliegue estático en Vercel (`vercel.json`) + contenedor multi-stage en Docker.
- Pruebas: Karma + Jasmine; e2e con scripts Node + Chrome.

## Instalar, correr y probar

```bash
cp .env.example .env     # completar SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WHATSAPP_PHONE, SITE_URL
npm install
npm start                # http://localhost:4200
npm run build            # build + prerender -> dist/arepas-la-troncal-ang/browser/
npm test                 # Karma/Jasmine
node scripts/e2e-navegador.mjs   # e2e web pública (requiere build)
```

`scripts/generar-env.mjs` corre antes de start/build/test y genera `src/app/config/env.generated.ts`, `robots.txt` y `sitemap.xml` (no editar ni versionar).

## Estructura

```text
src/app/
  config/business.ts   datos centrales del negocio (teléfono, horarios, dirección)
  core/                supabase-rest, seo, formato, teléfono
  services/            cart, catalogo, pedido, contacto
  pages/               inicio, productos, nosotros, contacto, privacidad, carrito
  admin/               panel del dueño (carga diferida, único lugar con supabase-js)
  components/ shared/ layout/ models/ data/
supabase/migrations/   esquema, RLS, RPC crear_pedido
scripts/               generar-env, e2e-navegador, e2e-panel
vercel.json            configuración de build estático, cabeceras y fallback a index.csr.html
```

## Convenciones

- Código, comentarios y commits en español, sin tildes en identificadores.
- Commits estilo Conventional Commits con alcance: `feat(arepas): ...`, `fix(arepas): ...`, `chore(arepas): ...`.
- Reglas de negocio (precios, totales, límites) en SQL; el cliente solo las refleja.
- Solo clave publicable de Supabase en el frontend; nunca `sb_secret_` ni `service_role`.
- Proteger `window`/`localStorage`/`document` con `isPlatformBrowser` (hay prerender).
