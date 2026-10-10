import { apiRequest } from './client';

// Freelancer only: { totalEarned, bookingCount, items }
export function getIncome(signal) {
  return apiRequest('/api/income', { signal });
}
