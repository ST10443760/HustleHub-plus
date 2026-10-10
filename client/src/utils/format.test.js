import { describe, expect, it } from 'vitest';
import { formatCategory, formatDate, formatDays, formatMoney } from './format';

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
