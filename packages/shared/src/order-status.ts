import { z } from 'zod';
import type { Role } from './schemas/common';

/**
 * Order statuses, straight from the BLUEPRINT "Order lifecycle" diagram.
 * The diagram's "Accepted · preparing" box is the single status `preparing`
 * (the kitchen board's New / Preparing / Ready columns).
 *
 * Payment status (pending, paid, refunded) is a separate field on the order — see schemas/common.ts.
 */
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PLACED: 'placed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COLLECTED: 'collected',
  NOT_DELIVERED: 'not_delivered',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUSES = Object.values(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]];

export const orderStatusSchema = z.enum(ORDER_STATUSES);

const S = ORDER_STATUS;

/**
 * Every legal move. Nothing outside this map may happen to an order.
 * Who may make each move (kitchen, rider, admin, system) is enforced by
 * orders.transition() on the API, built in Session 5. Cancellation roles are fixed below.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [S.PENDING_PAYMENT]: [S.PLACED, S.EXPIRED], // webhook confirms payment | no payment within 15 min
  // kitchen accepts with prep time | kitchen declines | customer or admin cancels before acceptance
  [S.PLACED]: [S.PREPARING, S.REJECTED, S.CANCELLED],
  [S.PREPARING]: [S.READY, S.CANCELLED], // food packed | restaurant/admin cancels (auto-refund if prepaid)
  [S.READY]: [S.OUT_FOR_DELIVERY, S.COLLECTED, S.CANCELLED], // rider picks up | pickup order collected | cancel
  [S.OUT_FOR_DELIVERY]: [S.DELIVERED, S.NOT_DELIVERED], // customer gives 4-digit OTP | customer unreachable
  [S.DELIVERED]: [],
  [S.COLLECTED]: [],
  [S.NOT_DELIVERED]: [],
  [S.REJECTED]: [],
  [S.CANCELLED]: [],
  [S.EXPIRED]: [],
};

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(
  ORDER_STATUSES.filter((s) => ALLOWED_TRANSITIONS[s].length === 0),
);

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Who may cancel an order, by the status it is in.
 * - placed: the customer or an admin, until the kitchen accepts. Once the kitchen accepts (preparing),
 *   the customer can no longer cancel.
 * - preparing / ready: the restaurant (staff) or an admin, per the BLUEPRINT diagram.
 * Statuses not listed here cannot be cancelled by anyone.
 */
export const CANCELLABLE_BY: Readonly<Partial<Record<OrderStatus, readonly Role[]>>> = {
  [S.PLACED]: ['customer', 'admin'],
  [S.PREPARING]: ['staff', 'admin'],
  [S.READY]: ['staff', 'admin'],
};

export function canCancel(from: OrderStatus, role: Role): boolean {
  return canTransition(from, S.CANCELLED) && (CANCELLABLE_BY[from]?.includes(role) ?? false);
}

/**
 * Moving into one of these statuses refunds the order automatically if it was paid online
 * (Razorpay Refunds API; the refund.processed webhook closes it out). COD orders have nothing to refund.
 */
export const AUTO_REFUND_STATUSES: ReadonlySet<OrderStatus> = new Set([S.REJECTED, S.CANCELLED]);

/** Customer-facing labels (English; Punjabi strings arrive in v1.1). */
export const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  [S.PENDING_PAYMENT]: 'Awaiting payment',
  [S.PLACED]: 'Order placed',
  [S.PREPARING]: 'Being prepared',
  [S.READY]: 'Ready',
  [S.OUT_FOR_DELIVERY]: 'Out for delivery',
  [S.DELIVERED]: 'Delivered',
  [S.COLLECTED]: 'Collected',
  [S.NOT_DELIVERED]: 'Not delivered',
  [S.REJECTED]: 'Rejected',
  [S.CANCELLED]: 'Cancelled',
  [S.EXPIRED]: 'Payment expired',
};
