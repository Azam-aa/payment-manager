const indianNumberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

/**
 * Formats an integer amount in Indian Rupee format (e.g., 250000 -> 2,50,000)
 */
export function formatRupees(amount: number): string {
  const rounded = Math.round(Math.abs(amount || 0));
  return indianNumberFormatter.format(rounded);
}

/**
 * Formats with ₹ symbol and Indian grouping, with no minus symbol
 */
export function formatCurrency(amount: number): string {
  const absFormatted = formatRupees(amount);
  return `₹${absFormatted}`;
}

/**
 * Validates a user input string as a whole-rupee positive integer.
 * Returns null if valid, or an error code string if invalid.
 */
export function validateWholeRupeeAmount(value: string | number): {
  valid: boolean;
  amount: number;
  error?: 'EMPTY' | 'NOT_A_NUMBER' | 'NOT_AN_INTEGER' | 'ZERO_OR_NEGATIVE' | 'EXCEEDS_LIMIT';
} {
  const str = String(value).trim();
  if (!str) {
    return { valid: false, amount: 0, error: 'EMPTY' };
  }

  // Must only contain digits (no decimals, no letters, no negative signs)
  if (!/^\d+$/.test(str)) {
    if (str.includes('.')) {
      return { valid: false, amount: 0, error: 'NOT_AN_INTEGER' };
    }
    return { valid: false, amount: 0, error: 'NOT_A_NUMBER' };
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return { valid: false, amount: 0, error: 'NOT_A_NUMBER' };
  }

  if (num <= 0) {
    return { valid: false, amount: 0, error: 'ZERO_OR_NEGATIVE' };
  }

  const MAX_LIMIT = 1000000; // 10,00,000 rupees
  if (num > MAX_LIMIT) {
    return { valid: false, amount: num, error: 'EXCEEDS_LIMIT' };
  }

  return { valid: true, amount: num };
}
