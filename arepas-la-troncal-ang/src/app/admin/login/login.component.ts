import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseAdminService } from '../supabase-admin.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly admin = inject(SupabaseAdminService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required]],
  });

  async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { email, clave } = this.form.getRawValue();
    const error = await this.admin.ingresar(email, clave);
    this.cargando.set(false);
    if (error) {
      this.error.set(error);
      this.form.controls.clave.reset();
      return;
    }
    await this.router.navigateByUrl('/admin/pedidos');
  }
}
