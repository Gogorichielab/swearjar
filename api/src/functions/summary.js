const { getTableClient } = require('../lib/tableClient');
const { todayKey } = require('../lib/dateUtils');
const { ok, fail } = require('../lib/http');
const { validateUserId } = require('../lib/validation');

function escapeOdata(value) {
  return String(value).replace(/'/g, "''");
}

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return n;
}

function parsePositiveIntBounded(value, fallback, max) {
  return Math.min(parsePositiveInt(value, fallback), max);
}

async function summaryHandler(request, context) {
  try {
    const userId = (request.query.get('userId') || '').trim();
    const userIdError = validateUserId(userId);
    if (userIdError) {
      return fail(400, 'VALIDATION_ERROR', userIdError);
    }

    // Cap lookbackDays to 365 (one calendar year) to keep response sizes bounded
    // and prevent excessive Azure Table Storage scan queries.
    const lookbackDays = parsePositiveIntBounded(request.query.get('lookbackDays'), 180, 365);
    const userEscaped = escapeOdata(userId);
    const startPartition = `${userEscaped}|0000-00-00`;
    const endPartition = `${userEscaped}|~~~~-~~-~~`;

    const tableClient = await getTableClient();
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey ge '${startPartition}' and PartitionKey lt '${endPartition}'`
      }
    });

    const dayCounts = {};
    let lifetimeTotal = 0;
    const today = todayKey();
    let todayCount = 0;

    for await (const entity of entities) {
      const dayKey = entity.dayKey || String(entity.partitionKey).split('|')[1];
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
      lifetimeTotal += 1;
      if (dayKey === today) {
        todayCount += 1;
      }
    }

    // Keep payload bounded for UI: return most recent N days where activity exists.
    const sortedDays = Object.keys(dayCounts).sort();
    const limitedDays = sortedDays.slice(-lookbackDays);
    const calendarDays = {};
    for (const day of limitedDays) {
      calendarDays[day] = dayCounts[day];
    }

    return ok({
      userId,
      timezoneMode: process.env.DATE_TIME_MODE || 'UTC',
      todayKey: today,
      todayCount,
      lifetimeTotal,
      calendarDays
    });
  } catch (error) {
    context.error('summary error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch summary at this time.');
  }
}

module.exports = {
  summaryHandler
};
