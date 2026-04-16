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

async function parseBody(request) {
  if (typeof request.json === 'function') {
    try {
      const parsed = await request.json();
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      // Fall through to legacy body parsing for non-JSON or empty bodies.
    }
  }

  if (!request.body) {
    return {};
  }

  if (
    typeof request.body === 'object' &&
    request.body !== null &&
    !('getReader' in request.body)
  ) {
    return request.body;
  }

  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch (_err) {
      throw new Error('Request body must be valid JSON.');
    }
  }

  throw new Error('Request body must be valid JSON.');
}

async function logSwearHandler(request, context) {
  try {
    const body = await parseBody(request);
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
    if (error.message === 'Request body must be valid JSON.') {
      return fail(400, 'VALIDATION_ERROR', error.message, { field: 'body' });
    }
    context.error('logSwear error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to log swear event at this time.');
  }
}

module.exports = {
  logSwearHandler
};
