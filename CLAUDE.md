# CLAUDE.md

## Qué es

Web de **Arepas La Troncal**, fábrica de arepas al carbón en Caucasia, Antioquia. Menú público con precios, carrito, pedidos guardados en Supabase y confirmados por WhatsApp, y un panel privado (`/admin`) para el dueño. Es la versión 2 del sitio (repo `arenasantiago/arepaslatroncalv.2`).

Todo el código vive en `arepas-la-troncal-ang/`. La guía detallada de arquitectura, seguridad y reglas está en **`arepas-la-troncal-ang/AGENTS.md`**: léela antes de cambiar código.

## Stack

- Angular 19 standalone (signals, `inject()`, `input()`), TypeScript 5.7.
- Salida estática con prerender (SSG); `carrito` y `admin/**` solo en cliente.
- Tailwind CSS v4 vía PostCSS, tokens de marca en `src/styles.css` (`@theme`). Sin CSS por componente.
- Supabase (Postgres + RLS + RPC). Despliegue previsto en Vercel.
- Pruebas: Karma + Jasmine; e2e con scripts Node + Chrome.

## Instalar, correr y probar

```bash
cd arepas-la-troncal-ang
cp .env.example .env     # completar SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WHATSAPP_PHONE, SITE_URL
npm install
npm start                # http://localhost:4200
npm run build            # build + prerender -> dist/arepas-la-troncal-ang/
npm test                 # Karma/Jasmine
node scripts/e2e-navegador.mjs   # e2e web pública (requiere build)
```

`scripts/generar-env.mjs` corre antes de start/build/test y genera `src/app/config/env.generated.ts`, `robots.txt` y `sitemap.xml` (no editar ni versionar).

## Estructura

```
arepas-la-troncal-ang/
  src/app/
    config/business.ts   datos centrales del negocio (teléfono, horarios, dirección)
    core/                supabase-rest, seo, formato, teléfono
    services/            cart, catalogo, pedido, contacto
    pages/               inicio, productos, nosotros, contacto, privacidad, carrito
    admin/               panel del dueño (carga diferida, único lugar con supabase-js)
    components/ shared/ layout/ models/ data/
  supabase/migrations/   esquema, RLS, RPC crear_pedido
  scripts/               generar-env, e2e-navegador, e2e-panel
```

## Estado actual

Rama `feat/arepas-v2-optimizacion`. Los últimos commits agregaron: imágenes en WebP, WhatsApp unificado en la config central, prerender SSG, configuración por `.env` y la base de datos Supabase. Hay mucho trabajo **sin commitear**: panel admin, `core/`, servicios de catálogo/pedido/contacto, página de privacidad, scripts e2e y `AGENTS.md`.

## Convenciones

- Código, comentarios y commits en español, sin tildes en identificadores.
- Commits estilo Conventional Commits con alcance: `feat(arepas): ...`, `fix(arepas): ...`, `chore(arepas): ...`.
- Reglas de negocio (precios, totales, límites) en SQL; el cliente solo las refleja.
- Solo clave publicable de Supabase en el frontend; nunca `sb_secret_` ni `service_role`.
- Proteger `window`/`localStorage`/`document` con `isPlatformBrowser` (hay prerender).
