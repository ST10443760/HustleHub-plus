const moneyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

// 150 -> "R 150,00"
export function formatMoney(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? moneyFormatter.format(value) : '-';
}

// ISO string -> "10 Oct 2026, 14:32" in the browser's time zone
export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
}

// "development" -> "Development"
export function formatCategory(category) {
  if (typeof category !== 'string' || category.length === 0) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// 1 -> "1 day", 5 -> "5 days"
export function formatDays(days) {
  return `${days} ${Number(days) === 1 ? 'day' : 'days'}`;
}
