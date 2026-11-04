import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ErrorApi, interpretarErrorApi } from './supabase-rest.service';

const errorBd = (hint: string, message = 'Mensaje de la BD') =>
  new HttpErrorResponse({ status: 400, error: { code: 'P0001', hint, message } });

describe('interpretarErrorApi', () => {
  it('traduce el hint de las funciones de la BD al tipo de error', () => {
    expect(interpretarErrorApi(errorBd('validacion')).tipo).toBe('validacion');
    expect(interpretarErrorApi(errorBd('limite')).tipo).toBe('limite');
    expect(interpretarErrorApi(errorBd('pedidos_pausados')).tipo).toBe('pausado');
    expect(interpretarErrorApi(errorBd('producto_no_disponible')).tipo).toBe('no_disponible');
  });

  it('conserva el mensaje en espanol que escribio la BD', () => {
    expect(interpretarErrorApi(errorBd('validacion', 'Escribe tu nombre.')).message).toBe('Escribe tu nombre.');
  });

  it('trata como "sin conexion" los errores de red, 5xx y tiempos agotados', () => {
    expect(interpretarErrorApi(new HttpErrorResponse({ status: 0 })).tipo).toBe('sin_conexion');
    expect(interpretarErrorApi(new HttpErrorResponse({ status: 503 })).tipo).toBe('sin_conexion');
    expect(interpretarErrorApi(new TimeoutError()).tipo).toBe('sin_conexion');
    expect(interpretarErrorApi(new Error('x')).tipo).toBe('sin_conexion');
  });

  it('un 400 sin hint no expone detalles tecnicos', () => {
    const e = interpretarErrorApi(new HttpErrorResponse({ status: 400, error: { message: 'syntax error at or near' } }));
    expect(e.tipo).toBe('sin_conexion');
    expect(e.message).not.toContain('syntax');
  });

  it('deja pasar un ErrorApi tal cual', () => {
    const original = new ErrorApi('limite', 'x');
    expect(interpretarErrorApi(original)).toBe(original);
  });
});
