# AGENTS.md

Guia para agentes de codigo que trabajan en **Arepas La Troncal**: web de una fabrica de arepas al carbon en Caucasia, Antioquia. Menu publico, carrito, pedidos registrados en Supabase y confirmados por WhatsApp, y un panel privado para el dueno.

## Stack

- Angular 19 (componentes standalone, signals, `inject()`, `input()`), TypeScript 5.7.
- Salida estatica: `outputMode: "static"` en `angular.json`. Las paginas publicas se prerenderizan (SSG); `carrito` y `admin/**` se renderizan solo en el cliente (`src/app/app.routes.server.ts`).
- Tailwind CSS v4 via PostCSS (`.postcssrc.json`). Los tokens de marca viven en `@theme` dentro de `src/styles.css` (`bg-marca`, `text-carbon`, `animate-fade-in`...). No hay archivos CSS por componente.
- Supabase (Postgres + RLS + RPC). Despliegue previsto en Vercel.
- Pruebas unitarias: Karma + Jasmine (`*.spec.ts`).

## Comandos

```bash
npm install
npm start            # ng serve en http://localhost:4200
npm run build        # build de produccion + prerender -> dist/arepas-la-troncal-ang/
npm test             # Karma/Jasmine
npm run config       # solo regenera la configuracion desde .env
```

`prestart`, `prebuild`, `pretest` y `prewatch` ejecutan `scripts/generar-env.mjs` automaticamente.

Pruebas de punta a punta (Node 22+ y Google Chrome, requieren build previo):

```bash
node scripts/e2e-navegador.mjs [carpeta-capturas]                          # web publica
SUPABASE_SECRET_KEY=sb_secret_... node scripts/e2e-panel.mjs [carpeta]     # panel del dueno
```

`e2e-navegador.mjs` crea datos reales marcados `PRUEBA AUTOMATICA`; se limpian con `supabase/limpiar-datos-prueba.sql`. `e2e-panel.mjs` borra todo lo que crea.

## Configuracion por entorno

- Copia `.env.example` a `.env` (nunca se versiona). Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `WHATSAPP_PHONE`, `SITE_URL`.
- `scripts/generar-env.mjs` valida esas variables y genera (ignorados por git):
  - `src/app/config/env.generated.ts` (constante `ENV`)
  - `src/generated-public/robots.txt` y `sitemap.xml`
- **No edites `env.generated.ts` a mano** ni lo versiones; cambia el script o el `.env`.
- Sin Supabase configurado la app sigue funcionando: el menu usa `src/app/data/catalogo-respaldo.ts` y los pedidos van directo a WhatsApp sin guardarse.

## Seguridad (obligatorio)

- En el frontend solo va la clave **publicable** (`sb_publishable_...`). Nunca la `sb_secret_...` ni `service_role`: el script de config falla si la detecta. La clave secreta solo se usa como variable de entorno en `scripts/e2e-panel.mjs`.
- La seguridad real esta en las politicas RLS y en las funciones de la BD, no en el navegador. Cualquier regla de negocio (precios, totales, validaciones, limites) debe vivir en SQL; el cliente solo la refleja.
- No subas numeros de telefono de prueba, `.env` ni datos personales al repo.

## Estructura

```
src/app/
  app.routes.ts            rutas publicas (title + data.descripcion = SEO; data.indexar:false = noindex)
  app.routes.server.ts     modo de render por ruta (Prerender / Client)
  config/business.ts       datos centrales del negocio (telefono, direccion, horarios, redes)
  core/                    servicios transversales: supabase-rest, seo, titulo.strategy, formato, telefono
  data/                    catalogo de respaldo (sin Supabase)
  layout/                  layout publico (navbar + footer + whatsapp-fab)
  components/              navbar, footer, hero
  pages/                   inicio, productos, nosotros, contacto, privacidad, carrito
  shared/                  producto-card, whatsapp-fab
  services/                cart, catalogo, pedido, contacto
  models/                  producto.model.ts, pedido.model.ts
  admin/                   panel del dueno (carga diferida): login, pedidos, productos, mensajes, ajustes
supabase/
  migrations/              esquema, datos iniciales, RPC crear_pedido, RLS
  limpiar-datos-prueba.sql
scripts/                   generar-env, e2e-navegador, e2e-panel, lib/navegador.mjs
public/                    favicon, apple-touch-icon, imagen Open Graph
src/assets/img/            imagenes en WebP
```

## Arquitectura y reglas importantes

- **Dos clientes de Supabase, a proposito:**
  - Parte publica: `core/supabase-rest.service.ts` usa `HttpClient` contra la API REST (funciona en prerender y navegador, sin cargar `supabase-js`). Los errores se traducen con `interpretarErrorApi` segun el `hint` que lanzan las funciones SQL (`validacion`, `limite`, `pedidos_pausados`, `producto_no_disponible`).
  - Panel: `admin/supabase-admin.service.ts` usa `supabase-js` con sesion. Solo se importa desde `admin/` para que la web publica no descargue la libreria. **No importes `@supabase/supabase-js` fuera de `src/app/admin/`.**
- **Catalogo:** `CatalogoService` lee Supabase durante el prerender, lo pasa al navegador con `TransferState` propio (por eso `withNoHttpTransferCache()`), y refresca los precios cuando la app queda estable. Si falla, usa el respaldo.
- **Pedidos:** `PedidoService` llama la RPC `crear_pedido`; la BD recalcula el total con sus propios precios. Luego se arma el mensaje de WhatsApp con el codigo del pedido. Si la BD no responde, se permite enviar por WhatsApp sin codigo.
- **SSR/prerender:** cualquier acceso a `window`, `localStorage`, `document` o temporizadores largos debe protegerse con `isPlatformBrowser`. El carrito usa `localStorage`, por eso se renderiza en cliente.
- **Datos del negocio:** telefono, direccion, horarios y redes salen de `config/business.ts`. No los dupliques en plantillas.
- **SEO:** cada ruta publica define `title` y `data.descripcion`; `core/seo.service.ts` y `TituloStrategy` los aplican. Si agregas una ruta publica indexable, anadela tambien a la lista del sitemap en `scripts/generar-env.mjs`.
- Paginas con formularios o pesadas se cargan con `loadComponent` para aligerar el paquete inicial. Respeta los presupuestos de `angular.json` (inicial: aviso 500 kB, error 1 MB).

## Convenciones de codigo

- Codigo, nombres, comentarios y textos en **espanol** (sin tildes en identificadores y comentarios; con tildes en textos visibles para el usuario).
- Componentes standalone sin `standalone: true` explicito (default de Angular 19), con `templateUrl` y sin hojas de estilo propias: estilos con utilidades de Tailwind.
- Estado con signals (`signal`, `computed`, `input.required`); DI con `inject()`.
- Indentacion de 2 espacios, comillas simples en TS (`.editorconfig`).
- Imagenes nuevas en WebP y optimizadas.
- Comentarios breves que expliquen el *por que*, como en el codigo existente.

## Base de datos

- Los cambios de esquema se hacen con una **nueva migracion** en `supabase/migrations/` (formato `YYYYMMDDHHMMSS_descripcion.sql`); no edites migraciones ya aplicadas.
- Toda tabla nueva necesita RLS habilitado y politicas explicitas.
- Los administradores se definen en la tabla `administradores`; el panel solo decide que pantalla mostrar, los permisos los aplica RLS.

## Git

- Commits estilo Conventional Commits en espanol con scope `arepas`, ej. `feat(arepas): ...`, `fix(arepas): ...`, `chore(arepas): ...`, `perf(arepas): ...`.
- Rama principal: `master`.
- Antes de proponer un cambio: `npm run build` y `npm test` deben pasar.
