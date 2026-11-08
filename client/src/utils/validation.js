/**
 * Client-side checks that mirror api/src/middleware/validators.js, so most
 * mistakes are shown next to the field before anything is sent. The API
 * still validates everything - these are for convenience, not security.
 */

// A pragmatic email shape check; the API's isEmail() has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// bcrypt only uses the first 72 bytes of a password (an emoji is 4 bytes).
export const MAX_PASSWORD_BYTES = 72;

// API: at least 8 characters, at least one number, at most 72 bytes.
// The same rules for registration and for a new password.
export function passwordProblem(password, label) {
  if (!password) return `${label} is required`;
  if (password.length < 8) return `${label} must be at least 8 characters`;
  if (!/\d/.test(password)) return `${label} must contain at least one number`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `${label} must be at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} plain characters)`;
  }
  return '';
}

// Account page: current password, new password and its confirmation.
export function validateChangePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Current password is required';

  const newError = passwordProblem(newPassword, 'New password');
  if (newError) errors.newPassword = newError;
  else if (newPassword === currentPassword) errors.newPassword = 'New password must be different from the current password';

  if (!confirmPassword) errors.confirmPassword = 'Type the new password again';
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'The passwords do not match';
  return errors;
}

export function validateRegister({ name, email, password, role }) {
  const errors = {};

  // API: trimmed, 2-60 characters
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2-60 characters';

  // API: required, valid email
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Must be a valid email address';

  const passwordError = passwordProblem(password, 'Password');
  if (passwordError) errors.password = passwordError;

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

/**
 * Gig form, mirroring api/src/middleware/gigValidators.js. Takes the raw
 * form strings and returns { errors, values } where values has trimmed text
 * and REAL numbers for price and deliveryDays - the API rejects "150" as a
 * string, so nothing is sent until these convert cleanly.
 */
export function validateGig(form, { categories, maxPrice }) {
  const errors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const category = form.category;
  const priceText = String(form.price).trim();
  const daysText = String(form.deliveryDays).trim();

  // API: 3-100 characters after trimming
  if (title.length < 3 || title.length > 100) errors.title = 'Title must be 3-100 characters';

  // API: 10-1000 characters after trimming
  if (description.length < 10 || description.length > 1000) {
    errors.description = 'Description must be 10-1000 characters';
  }

  // API: a number from 1 to 100000 with at most 2 decimal places
  const price = Number(priceText);
  if (priceText === '') errors.price = 'Price is required';
  // Two plain alternatives (no quantifier nested in another): always linear time.
  else if (!/^(?:\d+|\d+\.\d\d?)$/.test(priceText) || !Number.isFinite(price)) {
    errors.price = 'Enter a price like 150 or 149.99';
  } else if (price < 1 || price > maxPrice) errors.price = `Price must be between 1 and ${maxPrice}`;

  // API: a whole number from 1 to 90
  const deliveryDays = Number(daysText);
  if (daysText === '') errors.deliveryDays = 'Delivery days is required';
  else if (!/^\d+$/.test(daysText) || deliveryDays < 1 || deliveryDays > 90) {
    errors.deliveryDays = 'Delivery days must be a whole number from 1 to 90';
  }

  // API: one of the fixed categories
  if (!categories.includes(category)) errors.category = 'Choose a category';

  return { errors, values: { title, description, price, category, deliveryDays } };
}
