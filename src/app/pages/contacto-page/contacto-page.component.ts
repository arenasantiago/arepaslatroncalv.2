import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { negocio, whatsappDisplay, whatsappLink } from '../../config/business';
import { validarTelefono } from '../../core/telefono';
import { ContactoService } from '../../services/contacto.service';

type EstadoEnvio = 'inicial' | 'enviando' | 'enviado' | 'error';

@Component({
  selector: 'app-contacto-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contacto-page.component.html',
})
export class ContactoPageComponent {
  private readonly contacto = inject(ContactoService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly negocio = negocio;
  readonly telefono = whatsappDisplay;
  readonly whatsappHref = whatsappLink('¡Hola! Tengo una pregunta.');
  /** URL fija de Google Maps (constante del codigo, no viene del usuario). */
  readonly mapaUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(negocio.mapaEmbedUrl);

  readonly estado = signal<EstadoEnvio>('inicial');
  readonly mensajeError = signal('');
  /** Campo trampa para bots: las personas no lo ven; si llega lleno, no se envia nada. */
  readonly trampa = signal('');

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    whatsapp: ['', [validarTelefono]],
    mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    aceptaDatos: [false, [Validators.requiredTrue]],
  });

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.trampa()) {
      this.estado.set('enviado');
      return;
    }
    this.estado.set('enviando');
    this.mensajeError.set('');
    this.contacto.enviar(this.form.getRawValue()).subscribe({
      next: () => {
        this.estado.set('enviado');
        this.form.reset();
      },
      error: (err: Error) => {
        this.estado.set('error');
        this.mensajeError.set(err.message);
      },
    });
  }
}
