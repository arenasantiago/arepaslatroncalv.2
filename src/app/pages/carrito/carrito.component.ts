import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { whatsappLink } from '../../config/business';
import { PrecioPipe } from '../../core/formato';
import { ErrorApi } from '../../core/supabase-rest.service';
import { validarTelefono } from '../../core/telefono';
import { DatosCliente, PedidoRegistrado, TipoEntrega } from '../../models/pedido.model';
import { CartService, MAX_POR_PRODUCTO } from '../../services/cart.service';
import { CatalogoService } from '../../services/catalogo.service';
import { PedidoService } from '../../services/pedido.service';

const MENSAJE_REVISAR = 'Revisa los datos marcados en rojo.';

interface Confirmacion {
  pedido: PedidoRegistrado;
  enlace: string;
}

/**
 * Pagina del pedido: revisar productos, datos de entrega y envio.
 * 1) Se registra en la BD (precios y total los calcula el servidor).
 * 2) Se muestra el codigo y el boton para enviarlo por WhatsApp.
 */
@Component({
  selector: 'app-cart',
  imports: [ReactiveFormsModule, RouterLink, PrecioPipe],
  templateUrl: './carrito.component.html',
})
export class CartComponent {
  protected readonly carrito = inject(CartService);
  protected readonly catalogo = inject(CatalogoService);
  private readonly pedidos = inject(PedidoService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly max = MAX_POR_PRODUCTO;
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirmacion = signal<Confirmacion | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    telefono: ['', [Validators.required, validarTelefono]],
    tipoEntrega: ['recoger' as TipoEntrega, [Validators.required]],
    direccion: ['', [Validators.maxLength(200)]],
    notas: ['', [Validators.maxLength(500)]],
    aceptaDatos: [false, [Validators.requiredTrue]],
  });

  private readonly tipoEntrega = toSignal(this.form.controls.tipoEntrega.valueChanges, {
    initialValue: this.form.controls.tipoEntrega.value,
  });
  readonly esDomicilio = computed(() => this.tipoEntrega() === 'domicilio');

  /** Enlace directo a WhatsApp cuando el negocio pausa los pedidos en linea. */
  readonly enlacePedidosPausados = whatsappLink('¡Hola! Quiero hacer un pedido.');

  constructor() {
    this.form.controls.tipoEntrega.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      const direccion = this.form.controls.direccion;
      direccion.setValidators(
        tipo === 'domicilio'
          ? [Validators.required, Validators.minLength(5), Validators.maxLength(200)]
          : [Validators.maxLength(200)],
      );
      direccion.updateValueAndValidity();
    });
    // El aviso de validacion se quita solo cuando el cliente corrige los datos.
    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe((estado) => {
      if (estado === 'VALID' && this.error() === MENSAJE_REVISAR) this.error.set(null);
    });
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  sumar(id: number, cantidadActual: number, delta: number): void {
    this.carrito.cambiarCantidad(id, cantidadActual + delta);
  }

  fijarCantidad(id: number, valor: string): void {
    const n = Number.parseInt(valor, 10);
    if (Number.isFinite(n)) this.carrito.cambiarCantidad(id, n);
  }

  enviar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(MENSAJE_REVISAR);
      return;
    }
    const lineas = this.carrito.lineas().filter((l) => l.disponible);
    if (!lineas.length) {
      this.error.set('Tu pedido no tiene productos disponibles.');
      return;
    }

    const datos: DatosCliente = this.form.getRawValue();
    this.enviando.set(true);
    this.pedidos.crear(datos, lineas).subscribe({
      next: (pedido) => {
        this.enviando.set(false);
        this.confirmacion.set({ pedido, enlace: this.pedidos.enlaceWhatsapp(datos, pedido) });
        // Si quedo guardado, el carrito ya no hace falta (reenviarlo duplicaria el pedido).
        if (pedido.guardado) this.carrito.vaciar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err: ErrorApi) => {
        this.enviando.set(false);
        this.error.set(err.message);
        if (err.tipo === 'no_disponible' || err.tipo === 'pausado') this.catalogo.refrescar();
      },
    });
  }

  /** Tras abrir WhatsApp con un pedido que no se pudo guardar, se limpia el carrito. */
  despuesDeAbrirWhatsapp(): void {
    if (!this.confirmacion()?.pedido.guardado) this.carrito.vaciar();
  }

  nuevoPedido(): void {
    this.confirmacion.set(null);
    this.form.controls.notas.reset();
  }
}
