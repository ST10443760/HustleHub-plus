/**
 * Client-side checks that mirror api/src/middleware/validators.js, so most
 * mistakes are shown next to the field before anything is sent. The API
 * still validates everything - these are for convenience, not security.
 */

// A pragmatic email shape check; the API's isEmail() has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister({ name, email, password, role }) {
  const errors = {};

  // API: trimmed, 2-60 characters
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2-60 characters';

  // API: required, valid email
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Must be a valid email address';

  // API: at least 8 characters with at least one number
  if (!password) errors.password = 'Password is required';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/\d/.test(password)) errors.password = 'Password must contain at least one number';

  // API: optional, client or freelancer only
  if (role !== 'client' && role !== 'freelancer') errors.role = 'Choose client or freelancer';

  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Must be a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

// Gig list price filters: optional, 0 to max, min not above max.
export function validatePriceRange(minPrice, maxPrice, maxAllowed) {
  const errors = {};
  const min = minPrice === '' ? null : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);

  if (min !== null && (!Number.isFinite(min) || min < 0 || min > maxAllowed)) {
    errors.minPrice = `Enter a price from 0 to ${maxAllowed}`;
  }
  if (max !== null && (!Number.isFinite(max) || max < 0 || max > maxAllowed)) {
    errors.maxPrice = `Enter a price from 0 to ${maxAllowed}`;
  }
  if (!errors.minPrice && !errors.maxPrice && min !== null && max !== null && min > max) {
    errors.maxPrice = 'Max price must be at least the min price';
  }
  return errors;
}
