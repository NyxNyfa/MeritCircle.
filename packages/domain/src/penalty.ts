/**
 * Calculates number of days a payment is late beyond the standard payment window.
 *
 * @param cycleDay The day of the cycle when payment is made (1-based)
 * @param paymentWindowDays The payment window duration in days (default 10)
 * @returns Number of late days (>= 0)
 */
export function calculateLateDays(
  cycleDay: number,
  paymentWindowDays: number = 10
): number {
  return Math.max(0, cycleDay - paymentWindowDays);
}

/**
 * Calculates reputation penalty points for late payment.
 * Rule: -10 points per day after day 10, capped at 100 points maximum per cycle.
 * Returned as a positive integer.
 *
 * @param daysLate Number of days past the payment window
 * @returns Penalty points as positive number (0 - 100)
 */
export function calculateLatePenalty(daysLate: number): number {
  const late = Math.max(0, daysLate);
  return Math.min(late * 10, 100);
}
