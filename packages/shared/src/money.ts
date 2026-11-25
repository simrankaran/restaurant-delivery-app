import { z } from 'zod';

/**
 * All money is integer paise (₹1 = 100 paise). Never store or compute with rupee floats.
 */
export type Paise = number & { readonly __brand: 'Paise' };

export const paiseSchema = z.number().int().nonnegative();

export function asPaise(value: number): Paise {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Paise must be an integer, got ${value}`);
  return value as Paise;
}

/** Converts rupees (e.g. from an admin form) to paise, rounding to the nearest paisa. */
export function toPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) throw new RangeError(`Invalid rupee amount: ${rupees}`);
  return asPaise(Math.round(rupees * 100));
}

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** 12950 -> "₹129.50", 20000 -> "₹200" (whole rupees drop the ".00") */
export function formatINR(paise: number): string {
  return (paise % 100 === 0 ? inrWhole : inrPaise).format(paise / 100);
}
