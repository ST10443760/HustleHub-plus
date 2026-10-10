import { apiRequest } from './client';

// Admin only. The API decides what each user record contains (never the
// password hash); the client just shows what comes back.
export function listUsers(signal) {
  return apiRequest('/api/admin/users', { signal });
}

export function listAllTransactions({ page, limit }, signal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiRequest(`/api/admin/transactions?${params}`, { signal });
}

// Same rule as the owner's delete: deactivated instead if it has bookings.
export function adminDeleteGig(id) {
  return apiRequest(`/api/admin/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
