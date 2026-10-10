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
