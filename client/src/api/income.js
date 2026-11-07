import { apiRequest } from './client';

// Freelancer only: { totalEarned, bookingCount, items }
export function getIncome(signal) {
  return apiRequest('/api/income', { signal });
}

// Freelancer only: tax estimate for one SA tax year. `taxYear` is the year
// the tax year starts in (2026 = 1 March 2026 to 28 February 2027); leave it
// out for the current one. Only a 4-digit year is ever put in the URL.
export function getTaxEstimate(taxYear, signal) {
  const year = Number(taxYear);
  const query = Number.isInteger(year) && year >= 1000 && year <= 9999 ? `?taxYear=${year}` : '';
  return apiRequest(`/api/income/tax-estimate${query}`, { signal });
}
