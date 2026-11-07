/**
 * South African tax year dates. A tax year runs from 1 March to the last
 * day of February, and is identified here by the calendar year it starts
 * in (2026 = 1 March 2026 to 28 February 2027).
 *
 * Boundaries are worked out in South African time (SAST, UTC+02:00, no
 * daylight saving), so a booking at 00:30 on 1 March in Johannesburg falls
 * in the new tax year even though it's still 28 February in UTC.
 */

const SA_UTC_OFFSET = '+02:00';
const SA_OFFSET_MS = 2 * 60 * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');

function assertYear(startYear) {
  if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 9999) {
    throw new TypeError('Tax year must be a whole calendar year');
  }
}

// Tax year (start year) that contains `date`, in SA time.
function taxYearForDate(date = new Date()) {
  const sa = new Date(date.getTime() + SA_OFFSET_MS);
  const year = sa.getUTCFullYear();
  return sa.getUTCMonth() >= 2 ? year : year - 1; // getUTCMonth: 2 = March
}

// Last day of February in a given calendar year (28 or 29).
function lastDayOfFebruary(year) {
  return new Date(Date.UTC(year, 2, 0)).getUTCDate();
}

/**
 * Everything about one tax year that the API needs:
 * - startUtc / endUtc: the query range as instants, end EXCLUSIVE
 *   (00:00 SAST on 1 March of the next year).
 * - start / end: the first and last day as "YYYY-MM-DD" dates.
 * - label: plain text for the UI.
 * - months: the 12 "YYYY-MM" keys from March to February.
 */
function getTaxYearRange(startYear) {
  assertYear(startYear);
  const endYear = startYear + 1;
  const febDays = lastDayOfFebruary(endYear);

  const months = [];
  for (let i = 0; i < 12; i += 1) {
    const monthIndex = (2 + i) % 12; // March (2) round to February (1)
    const year = monthIndex >= 2 ? startYear : endYear;
    months.push(`${year}-${pad(monthIndex + 1)}`);
  }

  return {
    startYear,
    start: `${startYear}-03-01`,
    end: `${endYear}-02-${pad(febDays)}`,
    startUtc: new Date(Date.UTC(startYear, 2, 1) - SA_OFFSET_MS),
    endUtc: new Date(Date.UTC(endYear, 2, 1) - SA_OFFSET_MS),
    label: `1 ${MONTH_NAMES[2]} ${startYear} to ${febDays} ${MONTH_NAMES[1]} ${endYear} (SARS ${endYear} tax year)`,
    months,
  };
}

module.exports = { SA_UTC_OFFSET, taxYearForDate, getTaxYearRange };
