import { Component, OnInit, inject, signal } from '@angular/core';
import { FechaPipe } from '../../core/formato';
import { SupabaseAdminService } from '../supabase-admin.service';

interface FilaMensaje {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  mensaje: string;
  leido: boolean;
  creado_en: string;
}

/** Mensajes del formulario de contacto. */
@Component({
  selector: 'app-mensajes-admin',
  imports: [FechaPipe],
  templateUrl: './mensajes-admin.component.html',
})
export class MensajesAdminComponent implements OnInit {
  private readonly admin = inject(SupabaseAdminService);

  readonly soloSinLeer = signal(true);
  readonly mensajes = signal<FilaMensaje[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  alternarFiltro(): void {
    this.soloSinLeer.update((v) => !v);
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    let consulta = this.admin.cliente
      .from('mensajes_contacto')
      .select('id,nombre,email,whatsapp,mensaje,leido,creado_en')
      .order('creado_en', { ascending: false })
      .limit(100);
    if (this.soloSinLeer()) consulta = consulta.eq('leido', false);
    const { data, error } = await consulta;
    this.cargando.set(false);
    if (error) {
      this.error.set('No se pudieron cargar los mensajes.');
      return;
    }
    this.mensajes.set(data as FilaMensaje[]);
  }

  async marcar(m: FilaMensaje, leido: boolean): Promise<void> {
    const { error } = await this.admin.cliente.from('mensajes_contacto').update({ leido }).eq('id', m.id);
    if (error) {
      this.error.set('No se pudo actualizar el mensaje.');
      return;
    }
    this.mensajes.update((lista) =>
      this.soloSinLeer() && leido ? lista.filter((x) => x.id !== m.id) : lista.map((x) => (x.id === m.id ? { ...x, leido } : x)),
    );
  }

  async eliminar(m: FilaMensaje): Promise<void> {
    if (!confirm(`¿Eliminar el mensaje de ${m.nombre}?`)) return;
    const { error } = await this.admin.cliente.from('mensajes_contacto').delete().eq('id', m.id);
    if (error) {
      this.error.set('No se pudo eliminar el mensaje.');
      return;
    }
    this.mensajes.update((lista) => lista.filter((x) => x.id !== m.id));
  }

  enlaceCorreo(m: FilaMensaje): string {
    return `mailto:${m.email}?subject=${encodeURIComponent('Respuesta de Arepas La Troncal')}`;
  }

  enlaceWhatsapp(m: FilaMensaje): string {
    return `https://wa.me/${m.whatsapp}?text=${encodeURIComponent(`¡Hola ${m.nombre}! Te escribimos de Arepas La Troncal por tu mensaje.`)}`;
  }
}
