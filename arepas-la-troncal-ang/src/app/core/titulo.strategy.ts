import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SeoService } from './seo.service';

/** Cada navegacion actualiza titulo y metadatos a partir de la ruta activa. */
@Injectable({ providedIn: 'root' })
export class TituloStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(estado: RouterStateSnapshot): void {
    this.seo.actualizar(estado, this.buildTitle(estado));
  }
}
