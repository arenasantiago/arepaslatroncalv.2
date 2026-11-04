import { Pipe, PipeTransform } from '@angular/core';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** 2400 -> "$ 2.400" (formato colombiano, sin decimales). */
export function formatearPrecio(valor: number): string {
  return formatoPesos.format(valor);
}

/** Fecha ISO -> "25 sept 2026, 1:20 a. m." en hora de Colombia. */
export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

/** Colombia usa UTC-5 todo el ano (sin horario de verano). */
const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000;

/** Inicio del dia actual en Bogota, en ISO UTC (para filtrar "pedidos de hoy"). */
export function inicioDelDiaBogota(ahora: Date = new Date()): string {
  const local = new Date(ahora.getTime() - DESFASE_BOGOTA_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + DESFASE_BOGOTA_MS).toISOString();
}

@Pipe({ name: 'precio' })
export class PrecioPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor == null ? '' : formatearPrecio(valor);
  }
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    return iso ? formatearFecha(iso) : '';
  }
}
