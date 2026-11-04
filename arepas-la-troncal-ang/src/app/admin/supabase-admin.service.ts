import { isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env.generated';

/**
 * Cliente de Supabase con sesion, solo para el panel del dueno (este archivo vive en
 * el paquete diferido /admin: la web publica no descarga supabase-js).
 * Los permisos reales los ponen las politicas RLS: aqui solo se decide que pantalla ver.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminService {
  private readonly zona = inject(NgZone);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private clienteInterno: SupabaseClient | null = null;

  readonly sesion = signal<Session | null>(null);
  /** null = aun no se sabe. */
  readonly esAdmin = signal<boolean | null>(null);
  readonly email = computed(() => this.sesion()?.user.email ?? '');
  readonly configurado = Boolean(ENV.supabaseUrl && ENV.supabaseKey);

  get cliente(): SupabaseClient {
    if (!this.clienteInterno) {
      // Fuera de la zona de Angular: los temporizadores de renovacion del token no deben
      // mantener la app "inestable". La interfaz reacciona con signals.
      this.clienteInterno = this.zona.runOutsideAngular(() =>
        createClient(ENV.supabaseUrl, ENV.supabaseKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'arepas.panel.sesion' },
        }),
      );
      this.clienteInterno.auth.onAuthStateChange((_evento, sesion) => {
        this.sesion.set(sesion);
        if (!sesion) this.esAdmin.set(false);
      });
    }
    return this.clienteInterno;
  }

  /** Lee la sesion guardada y confirma que el usuario este en la tabla administradores. */
  async verificar(): Promise<boolean> {
    if (!this.esNavegador || !this.configurado) return false;
    const { data } = await this.cliente.auth.getSession();
    const sesion = data.session;
    this.sesion.set(sesion);
    if (!sesion) {
      this.esAdmin.set(false);
      return false;
    }
    if (this.esAdmin() === true) return true;
    const { data: fila, error } = await this.cliente
      .from('administradores')
      .select('user_id')
      .eq('user_id', sesion.user.id)
      .maybeSingle();
    const ok = !error && Boolean(fila);
    this.esAdmin.set(ok);
    return ok;
  }

  /** Devuelve null si todo salio bien, o el mensaje de error para mostrar. */
  async ingresar(email: string, clave: string): Promise<string | null> {
    if (!this.configurado) return 'El panel no está configurado (faltan las variables de Supabase).';
    this.esAdmin.set(null);
    const { error } = await this.cliente.auth.signInWithPassword({ email: email.trim(), password: clave });
    if (error) {
      if (error.status === 429) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      if (error.status === 400) return 'Correo o contraseña incorrectos.';
      return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    }
    if (!(await this.verificar())) {
      await this.cliente.auth.signOut();
      return 'Esta cuenta no tiene acceso al panel.';
    }
    return null;
  }

  async salir(): Promise<void> {
    await this.cliente.auth.signOut();
    this.esAdmin.set(false);
  }
}
