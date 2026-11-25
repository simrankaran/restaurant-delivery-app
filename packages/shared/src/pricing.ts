import type { Paise } from './money';

/**
 * THE ONLY PLACE AN ORDER TOTAL IS COMPUTED.
 * The cart calls it for display; the API calls it as the authority. A total sent by the client is never trusted.
 *
 * Implemented in Session 3 (subtotal, packaging, delivery fee by slab, coupon discount, GST, round-off).
 * The types below are the contract the cart and API will code against.
 */

export interface PricingLine {
  unitPrice: Paise; // base or variant price + selected add-ons, re-read from the DB on the server
  quantity: number;
}

export interface FeeSlab {
  upToKm: number;
  fee: Paise;
}

export interface PricingInput {
  lines: PricingLine[];
  orderType: 'delivery' | 'pickup';
  distanceKm: number | null; // null for pickup
  outlet: {
    feeSlabs: FeeSlab[];
    freeDeliveryAbove: Paise | null;
    packagingCharge: Paise;
    gstRatePercent: number;
  };
  coupon: {
    type: 'flat' | 'percent';
    value: number; // paise for flat, percent for percent
    maxDiscount: Paise | null;
  } | null;
}

export interface PricingBreakdown {
  subtotal: Paise;
  discount: Paise;
  packaging: Paise;
  deliveryFee: Paise;
  tax: Paise;
  roundOff: Paise | number; // may be negative
  total: Paise;
}

export function computeTotals(_input: PricingInput): PricingBreakdown {
  throw new Error('computeTotals() is implemented in Session 3 (storefront and cart)');
}
