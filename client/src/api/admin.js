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

// The audit log, newest first. `action` is optional and must be one of
// AUDIT_ACTIONS (the API rejects anything else).
export const AUDIT_ACTIONS = ['admin_gig_deleted', 'admin_gig_deactivated', 'password_changed', 'logout_all', 'account_locked'];

export function listAuditLogs({ page, limit, action }, signal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (AUDIT_ACTIONS.includes(action)) params.set('action', action);
  return apiRequest(`/api/admin/audit-logs?${params}`, { signal });
}
