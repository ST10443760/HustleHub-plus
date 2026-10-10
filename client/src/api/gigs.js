import { apiRequest } from './client';

// The API only accepts these query params (anything else is a 400).
const LIST_PARAMS = ['page', 'limit', 'category', 'q', 'minPrice', 'maxPrice'];

export function listGigs(filters, signal) {
  const params = new URLSearchParams();
  for (const key of LIST_PARAMS) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return apiRequest(`/api/gigs${query ? `?${query}` : ''}`, { signal });
}

// Ids are 24 hex characters. Anything else is never put into a URL, so a
// crafted id like "../admin/users" can't change which endpoint is called.
export function isValidId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
}

export function getGig(id, signal) {
  return apiRequest(`/api/gigs/${encodeURIComponent(id)}`, { signal });
}

// ---- Freelancer: their own gigs ----

export function listMyGigs(signal) {
  return apiRequest('/api/gigs/mine', { signal });
}

// Only these fields are sent; the API rejects anything else (including
// "freelancer", which it always takes from the token).
function gigBody({ title, description, price, category, deliveryDays }) {
  return { title, description, price, category, deliveryDays };
}

export function createGig(fields) {
  return apiRequest('/api/gigs', { method: 'POST', body: gigBody(fields) });
}

export function updateGig(id, fields) {
  return apiRequest(`/api/gigs/${encodeURIComponent(id)}`, { method: 'PUT', body: gigBody(fields) });
}

export function setGigActive(id, isActive) {
  return apiRequest(`/api/gigs/${encodeURIComponent(id)}`, { method: 'PUT', body: { isActive } });
}

// Resolves to { id, deleted, deactivated, message? } - a gig with bookings
// is deactivated instead of deleted.
export function deleteGig(id) {
  return apiRequest(`/api/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
