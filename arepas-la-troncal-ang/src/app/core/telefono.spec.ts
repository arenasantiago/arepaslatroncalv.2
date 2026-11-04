import { FormControl } from '@angular/forms';
import { esTelefonoValido, normalizarTelefono, validarTelefono } from './telefono';

describe('normalizarTelefono', () => {
  it('agrega el indicativo 57 a un celular colombiano de 10 digitos', () => {
    expect(normalizarTelefono('300 123 4567')).toBe('573001234567');
    expect(normalizarTelefono('(310) 555-0123')).toBe('573105550123');
  });

  it('no duplica el indicativo si ya viene', () => {
    expect(normalizarTelefono('+57 300 123 4567')).toBe('573001234567');
  });

  it('deja intactos los fijos y los numeros extranjeros', () => {
    expect(normalizarTelefono('604 839 1234')).toBe('6048391234');
    expect(normalizarTelefono('+1 (555) 010-9999')).toBe('15550109999');
  });
});

describe('esTelefonoValido / validarTelefono', () => {
  it('acepta entre 7 y 15 digitos', () => {
    expect(esTelefonoValido('300 123 4567')).toBeTrue();
    expect(esTelefonoValido('1234567')).toBeTrue();
    expect(esTelefonoValido('123456')).toBeFalse();
    expect(esTelefonoValido('abc')).toBeFalse();
  });

  it('el validador deja pasar el campo vacio (de eso se encarga required)', () => {
    expect(validarTelefono(new FormControl('', { nonNullable: true }))).toBeNull();
    expect(validarTelefono(new FormControl('12', { nonNullable: true }))).toEqual({ telefono: true });
  });
});
