import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Deja solo digitos y agrega el indicativo 57 a los celulares colombianos escritos
 * sin el (10 digitos que empiezan por 3). Es la misma regla que aplica la BD.
 */
export function normalizarTelefono(valor: string): string {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 10 && digitos.startsWith('3') ? `57${digitos}` : digitos;
}

export function esTelefonoValido(valor: string): boolean {
  return /^[0-9]{7,15}$/.test(normalizarTelefono(valor));
}

/** Validador de formularios reactivos. */
export function validarTelefono(control: AbstractControl<string>): ValidationErrors | null {
  const valor = control.value ?? '';
  if (!valor.trim()) return null; // de "vacio" se encarga Validators.required
  return esTelefonoValido(valor) ? null : { telefono: true };
}
