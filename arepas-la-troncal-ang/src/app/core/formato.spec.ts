import { formatearPrecio, inicioDelDiaBogota } from './formato';

/** Intl usa espacio de no separacion entre "$" y el numero. */
const normalizar = (texto: string) => texto.replace(/\u00a0/g, ' ');

describe('formatearPrecio', () => {
  it('usa el formato colombiano: signo peso, punto de miles y sin decimales', () => {
    expect(normalizar(formatearPrecio(2400))).toBe('$ 2.400');
    expect(normalizar(formatearPrecio(1234567))).toBe('$ 1.234.567');
    expect(normalizar(formatearPrecio(400))).toBe('$ 400');
    expect(normalizar(formatearPrecio(0))).toBe('$ 0');
  });
});

describe('inicioDelDiaBogota', () => {
  it('devuelve la medianoche de Colombia (05:00 UTC) del mismo dia', () => {
    expect(inicioDelDiaBogota(new Date('2026-09-25T15:30:00Z'))).toBe('2026-09-25T05:00:00.000Z');
  });

  it('antes de las 5 a. m. UTC todavia es el dia anterior en Colombia', () => {
    expect(inicioDelDiaBogota(new Date('2026-09-25T03:00:00Z'))).toBe('2026-09-24T05:00:00.000Z');
  });
});
