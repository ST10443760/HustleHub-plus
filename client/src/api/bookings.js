import { apiRequest } from './client';

// Only the gig id is sent. Price, freelancer and client are decided by the
// API from the database and the token - and it rejects any other field.
export function createBooking(gigId) {
  return apiRequest('/api/bookings', { method: 'POST', body: { gigId } });
}

export function listMyBookings(signal) {
  return apiRequest('/api/bookings/mine', { signal });
}

export function listMyTransactions(signal) {
  return apiRequest('/api/transactions/mine', { signal });
}
