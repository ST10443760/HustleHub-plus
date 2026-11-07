const moneyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

// 150 -> "R 150,00"
export function formatMoney(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? moneyFormatter.format(value) : '-';
}

const wholeRandFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 245100 -> "R 245 100" (tax brackets and chart axes, no cents)
export function formatWholeRand(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? wholeRandFormatter.format(value) : '-';
}

// 13.52 -> "13,52%"
export function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${percentFormatter.format(number)}%` : '-';
}

// "2026-03" -> "Mar 2026". Parsed by hand so the browser's time zone can't
// shift it into the previous month.
export function formatMonth(key) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key));
  const month = match ? Number(match[2]) : 0;
  return month >= 1 && month <= 12 ? `${MONTH_SHORT[month - 1]} ${match[1]}` : '-';
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
