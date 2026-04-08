/**
 * Date handling strategy:
 * - Default mode is UTC to ensure stable partition keys and cross-region consistency.
 * - Set DATE_TIME_MODE=LOCAL to bucket by the server's local timezone instead.
 */
const DATE_TIME_MODE = (process.env.DATE_TIME_MODE || 'UTC').toUpperCase();

function toDate(input) {
  if (!input) {
    return new Date();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid timestamp format. Use an ISO-8601 date/time string.');
  }

  return parsed;
}

function formatDatePart(date) {
  const year = DATE_TIME_MODE === 'LOCAL' ? date.getFullYear() : date.getUTCFullYear();
  const month = DATE_TIME_MODE === 'LOCAL' ? date.getMonth() + 1 : date.getUTCMonth() + 1;
  const day = DATE_TIME_MODE === 'LOCAL' ? date.getDate() : date.getUTCDate();

  return [year, month, day].map((x) => String(x).padStart(2, '0')).join('-');
}

function normalizeTimestamp(input) {
  const eventDate = toDate(input);
  return {
    eventDate,
    isoTimestamp: eventDate.toISOString(),
    dayKey: formatDatePart(eventDate)
  };
}

function todayKey() {
  return formatDatePart(new Date());
}

module.exports = {
  DATE_TIME_MODE,
  formatDatePart,
  normalizeTimestamp,
  todayKey
};
