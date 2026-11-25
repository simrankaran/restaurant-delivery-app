import { z } from 'zod';

/**
 * Indian mobile number. Accepts "98765 43210", "+91 98765-43210", "09876543210", "919876543210".
 * Normalises to E.164 ("+919876543210"), the form WhatsApp and MSG91 expect.
 */
export const phoneINSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))
  .transform((v) => `+91${v}`);

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const ROLES = ['customer', 'staff', 'rider', 'admin'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const PAYMENT_METHODS = ['online', 'cod'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const ORDER_TYPES = ['delivery', 'pickup'] as const;
export const orderTypeSchema = z.enum(ORDER_TYPES);
export type OrderType = z.infer<typeof orderTypeSchema>;
