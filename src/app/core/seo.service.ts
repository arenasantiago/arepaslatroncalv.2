import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ENV } from '../config/env.generated';
import { negocio, whatsappPhone } from '../config/business';

const DESCRIPCION_POR_DEFECTO =
  'Fábrica de arepas al carbón en Caucasia, Antioquia. Arepas de maíz, telas y arepas preparadas. Haz tu pedido en línea y confírmalo por WhatsApp.';

/** Une el `data` de toda la cadena de rutas activas (padres e hijas). */
function datosDeRuta(raiz: ActivatedRouteSnapshot): Record<string, unknown> {
  let datos: Record<string, unknown> = {};
  let ruta: ActivatedRouteSnapshot | null = raiz;
  while (ruta) {
    datos = { ...datos, ...ruta.data };
    ruta = ruta.firstChild;
  }
  return datos;
}

/**
 * Metadatos por ruta: titulo, descripcion, canonical, Open Graph, robots y datos
 * estructurados (JSON-LD). En el prerender quedan escritos en el HTML de cada pagina.
 * Las rutas definen `title` y `data: { descripcion, indexar }` en app.routes.ts.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  actualizar(estado: RouterStateSnapshot, tituloRuta: string | undefined): void {
    const datos = datosDeRuta(estado.root);
    const titulo = tituloRuta ? `${tituloRuta} | ${negocio.nombre}` : `${negocio.nombre} | Arepas al carbón en Caucasia, Antioquia`;
    const descripcion = typeof datos['descripcion'] === 'string' ? (datos['descripcion'] as string) : DESCRIPCION_POR_DEFECTO;
    const ruta = estado.url.split(/[?#]/)[0] || '/';
    const url = `${ENV.siteUrl}${ruta === '/' ? '' : ruta}`;
    const indexar = datos['indexar'] !== false;

    this.title.setTitle(titulo);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.meta.updateTag({ name: 'robots', content: indexar ? 'index, follow' : 'noindex, nofollow' });
    this.meta.updateTag({ property: 'og:title', content: titulo });
    this.meta.updateTag({ property: 'og:description', content: descripcion });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: `${ENV.siteUrl}/og-arepas-la-troncal.jpg` });
    this.enlaceCanonico(url);
    this.datosEstructurados();
  }

  private enlaceCanonico(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /** JSON-LD del negocio (una sola vez por documento). */
  private datosEstructurados(): void {
    if (this.doc.getElementById('datos-negocio')) return;
    const telefono = `+${whatsappPhone}`;
    const datos = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'FoodEstablishment',
          '@id': `${ENV.siteUrl}/#negocio`,
          name: negocio.nombre,
          url: `${ENV.siteUrl}/inicio`,
          logo: `${ENV.siteUrl}/assets/img/logo.webp`,
          image: `${ENV.siteUrl}/og-arepas-la-troncal.jpg`,
          description: 'Fábrica de arepas al carbón en Caucasia, Antioquia.',
          telephone: telefono,
          email: negocio.email,
          priceRange: '$',
          servesCuisine: ['Comida típica colombiana', 'Arepas'],
          address: {
            '@type': 'PostalAddress',
            streetAddress: negocio.direccion.calle,
            addressLocality: negocio.direccion.ciudad,
            addressRegion: negocio.direccion.region,
            addressCountry: negocio.direccion.pais,
          },
          openingHoursSpecification: negocio.horarios.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.diasSchema,
            opens: h.abre,
            closes: h.cierra,
          })),
          sameAs: [negocio.instagram],
          hasMenu: `${ENV.siteUrl}/productos`,
        },
        { '@type': 'WebSite', name: negocio.nombre, url: `${ENV.siteUrl}/inicio` },
      ],
    };
    const script = this.doc.createElement('script');
    script.id = 'datos-negocio';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(datos);
    this.doc.head.appendChild(script);
  }
}
