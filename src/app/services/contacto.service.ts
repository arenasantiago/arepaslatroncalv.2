import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ErrorApi, SupabaseRestService, interpretarErrorApi } from '../core/supabase-rest.service';

export interface MensajeContacto {
  nombre: string;
  email: string;
  whatsapp: string;
  mensaje: string;
  aceptaDatos: boolean;
}

/** Guarda los mensajes del formulario de contacto en Supabase (RPC con validacion y limites). */
@Injectable({ providedIn: 'root' })
export class ContactoService {
  private readonly rest = inject(SupabaseRestService);

  enviar(m: MensajeContacto): Observable<void> {
    if (!this.rest.configurado) {
      return throwError(
        () => new ErrorApi('sin_conexion', 'El formulario no está disponible en este momento. Escríbenos por WhatsApp.'),
      );
    }
    return this.rest
      .rpc<null>('enviar_mensaje_contacto', {
        p_nombre: m.nombre.trim(),
        p_email: m.email.trim(),
        p_whatsapp: m.whatsapp.trim() || null,
        p_mensaje: m.mensaje.trim(),
        p_acepta_tratamiento_datos: m.aceptaDatos,
      })
      .pipe(
        map(() => undefined),
        catchError((err) => throwError(() => interpretarErrorApi(err))),
      );
  }
}
