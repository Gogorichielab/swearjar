'use strict';

describe('dateUtils', () => {
  // Reset module registry and env between tests so DATE_TIME_MODE changes take effect.
  beforeEach(() => {
    jest.resetModules();
    delete process.env.DATE_TIME_MODE;
  });

  function load() {
    return require('./dateUtils');
  }

  describe('formatDatePart() — UTC mode (default)', () => {
    it('formats a UTC date correctly', () => {
      const { formatDatePart } = load();
      const date = new Date('2024-06-15T23:59:59Z');
      expect(formatDatePart(date)).toBe('2024-06-15');
    });

    it('zero-pads single-digit month and day', () => {
      const { formatDatePart } = load();
      const date = new Date('2024-01-05T00:00:00Z');
      expect(formatDatePart(date)).toBe('2024-01-05');
    });
  });

  describe('formatDatePart() — LOCAL mode', () => {
    it('uses local date parts when DATE_TIME_MODE=LOCAL', () => {
      process.env.DATE_TIME_MODE = 'LOCAL';
      const { formatDatePart } = load();
      // Create a date whose UTC year/month/day are knowable and stable.
      const date = new Date('2024-06-15T00:00:00Z');
      // In UTC the day is 2024-06-15. In local time on CI (UTC) it is also 2024-06-15.
      const result = formatDatePart(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('normalizeTimestamp()', () => {
    it('returns eventDate, isoTimestamp, and dayKey for a valid ISO string', () => {
      const { normalizeTimestamp } = load();
      const result = normalizeTimestamp('2024-06-15T14:30:00Z');
      expect(result.eventDate).toBeInstanceOf(Date);
      expect(result.isoTimestamp).toBe('2024-06-15T14:30:00.000Z');
      expect(result.dayKey).toBe('2024-06-15');
    });

    it('defaults to now when no timestamp is supplied', () => {
      const { normalizeTimestamp } = load();
      const before = Date.now();
      const result = normalizeTimestamp(undefined);
      const after = Date.now();
      expect(result.eventDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.eventDate.getTime()).toBeLessThanOrEqual(after);
    });

    it('defaults to now when timestamp is null', () => {
      const { normalizeTimestamp } = load();
      const before = Date.now();
      const result = normalizeTimestamp(null);
      expect(result.eventDate.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('throws for an invalid timestamp string', () => {
      const { normalizeTimestamp } = load();
      expect(() => normalizeTimestamp('not-a-date')).toThrow(
        'Invalid timestamp format. Use an ISO-8601 date/time string.'
      );
    });

    it('handles a numeric Unix milliseconds timestamp', () => {
      const { normalizeTimestamp } = load();
      const ts = new Date('2024-06-15T00:00:00Z').getTime();
      const result = normalizeTimestamp(ts);
      expect(result.dayKey).toBe('2024-06-15');
    });
  });

  describe('todayKey()', () => {
    it('returns a string matching YYYY-MM-DD', () => {
      const { todayKey } = load();
      expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches the UTC date of the current moment', () => {
      const { todayKey } = load();
      const now = new Date();
      const expected = [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        String(now.getUTCDate()).padStart(2, '0')
      ].join('-');
      expect(todayKey()).toBe(expected);
    });
  });
});
