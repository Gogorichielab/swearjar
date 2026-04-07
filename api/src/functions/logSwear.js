const crypto = require('node:crypto');
const { getTableClient } = require('../lib/tableClient');
const { normalizeTimestamp } = require('../lib/dateUtils');
const { ok, fail } = require('../lib/http');

function buildPartitionKey(userId, dayKey) {
  return `${userId}|${dayKey}`;
}

function buildRowKey(eventDate) {
  return `${eventDate.toISOString()}-${crypto.randomUUID()}`;
}

function parseBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === 'object') {
    return request.body;
  }

  try {
    return JSON.parse(request.body);
  } catch (_err) {
    throw new Error('Request body must be valid JSON.');
  }
}

async function logSwearHandler(request, context) {
  try {
    const body = parseBody(request);
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

    if (!userId) {
      return fail(400, 'VALIDATION_ERROR', 'userId is required and must be a non-empty string.');
    }

    let normalized;
    try {
      normalized = normalizeTimestamp(body.timestamp);
    } catch (validationErr) {
      return fail(400, 'VALIDATION_ERROR', validationErr.message, { field: 'timestamp' });
    }

    const partitionKey = buildPartitionKey(userId, normalized.dayKey);
    const rowKey = buildRowKey(normalized.eventDate);

    const entity = {
      partitionKey,
      rowKey,
      userId,
      dayKey: normalized.dayKey,
      eventTimestamp: normalized.isoTimestamp,
      recordedAt: new Date().toISOString()
    };

    const tableClient = await getTableClient();
    await tableClient.createEntity(entity);

    return ok({
      id: rowKey,
      partitionKey,
      dayKey: normalized.dayKey,
      eventTimestamp: normalized.isoTimestamp
    }, 201);
  } catch (error) {
    context.error('logSwear error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to log swear event at this time.');
  }
}

module.exports = {
  logSwearHandler
};
