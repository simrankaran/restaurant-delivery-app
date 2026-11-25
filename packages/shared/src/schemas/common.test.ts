import { describe, expect, it } from 'vitest';
import { objectIdSchema, phoneINSchema } from './common';
import { formatINR, toPaise } from '../money';

describe('phoneINSchema', () => {
  it.each([
    '9876543210',
    '98765 43210',
    '+91 98765-43210',
    '09876543210',
    '919876543210',
    ' 6123456789 ',
  ])('accepts %j', (input) => {
    expect(phoneINSchema.parse(input)).toMatch(/^\+91[6-9]\d{9}$/);
  });

  it('normalises to E.164', () => {
    expect(phoneINSchema.parse('098765 43210')).toBe('+919876543210');
  });

  it.each(['12345', '5876543210', '98765432101', 'abcdefghij', '+1 9876543210', ''])(
    'rejects %j',
    (input) => {
      expect(phoneINSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe('objectIdSchema', () => {
  it('accepts a 24-char hex id and rejects others', () => {
    expect(objectIdSchema.safeParse('64b7f0c2a1b2c3d4e5f60718').success).toBe(true);
    expect(objectIdSchema.safeParse('not-an-id').success).toBe(false);
  });
});

describe('money', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(toPaise(129.5)).toBe(12950);
    expect(toPaise(0.1 + 0.2)).toBe(30);
  });

  it('formats paise as Indian rupees', () => {
    expect(formatINR(12950)).toBe('₹129.50');
    expect(formatINR(20000)).toBe('₹200');
    expect(formatINR(12345600)).toBe('₹1,23,456');
  });
});
