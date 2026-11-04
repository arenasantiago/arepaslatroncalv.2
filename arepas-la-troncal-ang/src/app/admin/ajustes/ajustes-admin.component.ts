import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseAdminService } from '../supabase-admin.service';

/** Ajustes del negocio que se ven en la web: pausar pedidos y aviso superior. */
@Component({
  selector: 'app-ajustes-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './ajustes-admin.component.html',
})
export class AjustesAdminComponent implements OnInit {
  private readonly admin = inject(SupabaseAdminService);

  readonly guardando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = inject(NonNullableFormBuilder).group({
    aceptaPedidos: [true],
    aviso: ['', [Validators.maxLength(200)]],
  });

  async ngOnInit(): Promise<void> {
    const { data, error } = await this.admin.cliente.from('ajustes').select('acepta_pedidos,aviso').limit(1).maybeSingle();
    if (error || !data) {
      this.error.set('No se pudieron cargar los ajustes.');
      return;
    }
    this.form.reset({ aceptaPedidos: data.acepta_pedidos, aviso: data.aviso ?? '' });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.mensaje.set(null);
    this.error.set(null);
    const v = this.form.getRawValue();
    const { error } = await this.admin.cliente
      .from('ajustes')
      .update({ acepta_pedidos: v.aceptaPedidos, aviso: v.aviso.trim() || null })
      .eq('id', true);
    this.guardando.set(false);
    if (error) {
      this.error.set('No se pudieron guardar los ajustes.');
      return;
    }
    this.mensaje.set('Ajustes guardados. Se ven en la web al recargar la página.');
  }
}
