import { describe, it, expect } from 'vitest';
import { calculateProratedAmount, applyDiscount } from '../payment-service';

describe('payment-service', () => {
  it('calculates prorated amount correctly', () => {
    expect(calculateProratedAmount(100, 30, 15)).toBe(50);
  });

  it('throws when period days is invalid', () => {
    expect(() => calculateProratedAmount(100, 0, 10)).toThrow(
      'periodDays must be greater than 0',
    );
  });

  it('applies discount correctly', () => {
    expect(applyDiscount(200, 10)).toBe(180);
  });

  it('throws when discount is out of range', () => {
    expect(() => applyDiscount(100, 120)).toThrow(
      'percent must be between 0 and 100',
    );
  });
});
