import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, timeout } from 'rxjs';
import { ENV } from '../config/env.generated';

/** Tiempo maximo de espera de la API (en prerender y en el navegador). */
const TIEMPO_MAXIMO_MS = 10_000;

export type TipoErrorApi = 'validacion' | 'limite' | 'pausado' | 'no_disponible' | 'sin_conexion';

/** Error de la API ya traducido a algo que la interfaz sabe mostrar. */
export class ErrorApi extends Error {
  constructor(
    readonly tipo: TipoErrorApi,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

const MENSAJE_SIN_CONEXION = 'No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Traduce errores de PostgREST/red. Las funciones de la BD lanzan excepciones con
 * `hint` = validacion | limite | pedidos_pausados | producto_no_disponible.
 */
export function interpretarErrorApi(err: unknown): ErrorApi {
  if (err instanceof ErrorApi) return err;
  if (err instanceof TimeoutError) return new ErrorApi('sin_conexion', MENSAJE_SIN_CONEXION);
  if (err instanceof HttpErrorResponse) {
    const cuerpo = (typeof err.error === 'object' && err.error) || {};
    const hint: string | undefined = cuerpo.hint;
    const mensaje: string = typeof cuerpo.message === 'string' && cuerpo.message ? cuerpo.message : MENSAJE_SIN_CONEXION;
    if (err.status === 400 && hint) {
      if (hint === 'limite') return new ErrorApi('limite', mensaje);
      if (hint === 'pedidos_pausados') return new ErrorApi('pausado', mensaje);
      if (hint === 'producto_no_disponible') return new ErrorApi('no_disponible', mensaje);
      return new ErrorApi('validacion', mensaje);
    }
    return new ErrorApi('sin_conexion', MENSAJE_SIN_CONEXION);
  }
  return new ErrorApi('sin_conexion', MENSAJE_SIN_CONEXION);
}

/**
 * Acceso minimo a la API REST de Supabase para la parte publica de la web.
 * Usa HttpClient (funciona en el prerender y en el navegador) y la clave PUBLICABLE:
 * la seguridad la ponen las politicas RLS y las funciones de la BD, no el navegador.
 * El panel de administracion usa supabase-js (carga diferida) porque necesita sesion.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseRestService {
  private readonly http = inject(HttpClient);
  private readonly headers = new HttpHeaders({ apikey: ENV.supabaseKey });

  /** false si faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY en la configuracion. */
  readonly configurado = Boolean(ENV.supabaseUrl && ENV.supabaseKey);

  /** GET /rest/v1/<consulta>, ej. leer('productos?select=id,nombre'). */
  leer<T>(consulta: string): Observable<T> {
    return this.http
      .get<T>(`${ENV.supabaseUrl}/rest/v1/${consulta}`, { headers: this.headers })
      .pipe(timeout(TIEMPO_MAXIMO_MS));
  }

  /** POST /rest/v1/rpc/<funcion> con los argumentos con nombre. */
  rpc<T>(funcion: string, args: Record<string, unknown>): Observable<T> {
    return this.http
      .post<T>(`${ENV.supabaseUrl}/rest/v1/rpc/${funcion}`, args, { headers: this.headers })
      .pipe(timeout(TIEMPO_MAXIMO_MS));
  }
}
