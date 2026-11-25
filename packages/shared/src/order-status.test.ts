import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  AUTO_REFUND_STATUSES,
  CANCELLABLE_BY,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  TERMINAL_STATUSES,
  canCancel,
  canTransition,
  orderStatusSchema,
  type OrderStatus,
} from './order-status';
import { ROLES } from './schemas/common';

const S = ORDER_STATUS;

// The BLUEPRINT diagram, written out independently of the map under test.
const EXPECTED: Array<[OrderStatus, OrderStatus]> = [
  [S.PENDING_PAYMENT, S.PLACED],
  [S.PENDING_PAYMENT, S.EXPIRED],
  [S.PLACED, S.PREPARING],
  [S.PLACED, S.REJECTED],
  [S.PLACED, S.CANCELLED],
  [S.PREPARING, S.READY],
  [S.PREPARING, S.CANCELLED],
  [S.READY, S.OUT_FOR_DELIVERY],
  [S.READY, S.COLLECTED],
  [S.READY, S.CANCELLED],
  [S.OUT_FOR_DELIVERY, S.DELIVERED],
  [S.OUT_FOR_DELIVERY, S.NOT_DELIVERED],
];

describe('order status transitions', () => {
  it('has 11 statuses, each with a transition entry and a label', () => {
    expect(ORDER_STATUSES).toHaveLength(11);
    for (const s of ORDER_STATUSES) {
      expect(ALLOWED_TRANSITIONS[s]).toBeDefined();
      expect(ORDER_STATUS_LABEL[s]).toBeTruthy();
    }
  });

  it.each(EXPECTED)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('rejects every pair not in the diagram', () => {
    const allowed = new Set(EXPECTED.map(([a, b]) => `${a}>${b}`));
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (!allowed.has(`${from}>${to}`))
          expect(canTransition(from, to), `${from} -> ${to}`).toBe(false);
      }
    }
  });

  it('never allows a status to transition to itself', () => {
    for (const s of ORDER_STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it('treats delivered, collected, not_delivered, rejected, cancelled and expired as terminal', () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(
      [S.CANCELLED, S.COLLECTED, S.DELIVERED, S.EXPIRED, S.NOT_DELIVERED, S.REJECTED].sort(),
    );
  });

  it('cannot skip the kitchen: placed never jumps straight to ready or out_for_delivery', () => {
    expect(canTransition(S.PLACED, S.READY)).toBe(false);
    expect(canTransition(S.PLACED, S.OUT_FOR_DELIVERY)).toBe(false);
  });

  it('cannot cancel once the rider has the food', () => {
    expect(canTransition(S.OUT_FOR_DELIVERY, S.CANCELLED)).toBe(false);
  });

  it('keeps the name `preparing` for an accepted order (no separate `accepted` status)', () => {
    expect(ORDER_STATUSES).toContain('preparing');
    expect(ORDER_STATUSES).not.toContain('accepted');
  });

  it('validates status strings with zod', () => {
    expect(orderStatusSchema.parse('ready')).toBe('ready');
    expect(orderStatusSchema.safeParse('accepted').success).toBe(false);
  });
});

describe('cancellation rules', () => {
  // Written out independently: [status, roles that may cancel from it]
  const EXPECTED_CANCEL: Array<[OrderStatus, string[]]> = [
    [S.PLACED, ['customer', 'admin']],
    [S.PREPARING, ['staff', 'admin']],
    [S.READY, ['staff', 'admin']],
  ];

  it.each(EXPECTED_CANCEL)('from %s, only %j may cancel', (from, roles) => {
    for (const role of ROLES)
      expect(canCancel(from, role), `${role} @ ${from}`).toBe(roles.includes(role));
  });

  it('lets the customer cancel before the kitchen accepts, and never after', () => {
    expect(canCancel(S.PLACED, 'customer')).toBe(true);
    for (const s of ORDER_STATUSES.filter((x) => x !== S.PLACED)) {
      expect(canCancel(s, 'customer'), s).toBe(false);
    }
  });

  it('never lets staff cancel a placed order (the kitchen rejects with a reason instead)', () => {
    expect(canCancel(S.PLACED, 'staff')).toBe(false);
    expect(canTransition(S.PLACED, S.REJECTED)).toBe(true);
  });

  it('nobody, not even admin, can cancel unpaid, out-for-delivery or finished orders', () => {
    for (const s of [S.PENDING_PAYMENT, S.OUT_FOR_DELIVERY, ...TERMINAL_STATUSES]) {
      for (const role of ROLES) expect(canCancel(s, role), `${role} @ ${s}`).toBe(false);
    }
  });

  it('only lists cancel roles for statuses that can actually move to cancelled', () => {
    for (const s of Object.keys(CANCELLABLE_BY) as OrderStatus[]) {
      expect(canTransition(s, S.CANCELLED), s).toBe(true);
    }
  });

  it('auto-refunds paid orders on reject and cancel only', () => {
    expect([...AUTO_REFUND_STATUSES].sort()).toEqual([S.CANCELLED, S.REJECTED].sort());
  });
});
