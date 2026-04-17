const { getTableClient } = require('../lib/tableClient');
const { todayKey, formatDatePart } = require('../lib/dateUtils');
const { ok, fail } = require('../lib/http');
const { validateUserId } = require('../lib/validation');

function escapeOdata(value) {
  return String(value).replace(/'/g, "''");
}

function getLastSevenDayKeys() {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(formatDatePart(date));
  }
  return days;
}

async function todayStatsHandler(request, context) {
  try {
    const userId = (request.query.get('userId') || '').trim();
    const userIdError = validateUserId(userId);
    if (userIdError) {
      return fail(400, 'VALIDATION_ERROR', userIdError);
    }

    const userEscaped = escapeOdata(userId);
    const startPartition = `${userEscaped}|0000-00-00`;
    const endPartition = `${userEscaped}|~~~~-~~-~~`;

    const tableClient = await getTableClient();
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey ge '${startPartition}' and PartitionKey lt '${endPartition}'`
      }
    });

    const today = todayKey();
    const todayEvents = [];
    const countsByDay = {};

    for await (const entity of entities) {
      const dayKey = entity.dayKey || String(entity.partitionKey).split('|')[1];
      countsByDay[dayKey] = (countsByDay[dayKey] || 0) + 1;

      if (dayKey === today) {
        todayEvents.push(entity.eventTimestamp || entity.recordedAt || new Date().toISOString());
      }
    }

    todayEvents.sort((a, b) => new Date(b) - new Date(a));

    const trend = getLastSevenDayKeys().map((day) => ({
      day,
      count: countsByDay[day] || 0
    }));

    return ok({
      userId,
      todayKey: today,
      todayCount: todayEvents.length,
      recentEvents: todayEvents.slice(0, 10),
      trend
    });
  } catch (error) {
    context.error('todayStats error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch today stats at this time.');
  }
}

module.exports = {
  todayStatsHandler
};
