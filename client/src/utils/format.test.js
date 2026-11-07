import { describe, expect, it } from 'vitest';
import { formatCategory, formatDate, formatDays, formatMoney, formatMonth, formatPercent, formatWholeRand } from './format';

// en-ZA uses a (non-breaking) space between groups and a decimal comma.
const normalise = (text) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats rand with two decimals', () => {
    expect(normalise(formatMoney(1234.5))).toBe('R 1 234,50');
    expect(normalise(formatMoney(0))).toBe('R 0,00');
  });

  it('shows a dash for something that is not a number', () => {
    expect(formatMoney('abc')).toBe('-');
    expect(formatMoney(undefined)).toBe('-');
  });
});

describe('formatDate', () => {
  it('gives a readable date with the month name', () => {
    const text = formatDate('2026-10-10T12:30:00Z');
    expect(text).toMatch(/10 Oct 2026/);
  });

  it('shows a dash for an invalid date', () => {
    expect(formatDate('not a date')).toBe('-');
  });
});

describe('small formatters', () => {
  it('capitalises categories and pluralises days', () => {
    expect(formatCategory('development')).toBe('Development');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(7)).toBe('7 days');
  });
});

describe('tax dashboard formatters', () => {
  it('formats whole rand without cents', () => {
    expect(normalise(formatWholeRand(245100))).toBe('R 245 100');
    expect(normalise(formatWholeRand(0))).toBe('R 0');
    expect(formatWholeRand('x')).toBe('-');
  });

  it('formats a percentage with two decimals', () => {
    expect(formatPercent(13.52)).toBe('13,52%');
    expect(formatPercent(0)).toBe('0,00%');
    expect(formatPercent(undefined)).toBe('-');
  });

  it('turns a YYYY-MM key into a short month name', () => {
    expect(formatMonth('2026-03')).toBe('Mar 2026');
    expect(formatMonth('2027-02')).toBe('Feb 2027');
    expect(formatMonth('2026-13')).toBe('-');
    expect(formatMonth('March')).toBe('-');
  });
});
