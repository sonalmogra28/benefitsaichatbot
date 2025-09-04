export function calculateProratedAmount(
  amount: number,
  periodDays: number,
  usedDays: number,
): number {
  if (periodDays <= 0) {
    throw new Error('periodDays must be greater than 0');
  }
  const prorated = (amount / periodDays) * usedDays;
  return Math.round(prorated * 100) / 100;
}

export function applyDiscount(amount: number, percent: number): number {
  if (percent < 0 || percent > 100) {
    throw new Error('percent must be between 0 and 100');
  }
  const discounted = amount * (1 - percent / 100);
  return Math.round(discounted * 100) / 100;
}
