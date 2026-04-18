const { getTableClient } = require('../lib/tableClient');
const { ok, fail } = require('../lib/http');

async function undoSwearHandler(request, context) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (_err) {
      return fail(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.', { field: 'body' });
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return fail(400, 'VALIDATION_ERROR', 'userId is required and must be a non-empty string.');
    }

    const partitionKey = typeof body.partitionKey === 'string' ? body.partitionKey : '';
    const rowKey = typeof body.id === 'string' ? body.id : '';

    if (!partitionKey || !rowKey) {
      return fail(400, 'VALIDATION_ERROR', 'partitionKey and id are required.');
    }

    if (!partitionKey.startsWith(`${userId}|`)) {
      return fail(403, 'FORBIDDEN', 'You can only undo your own swear events.');
    }

    const tableClient = await getTableClient();
    await tableClient.deleteEntity(partitionKey, rowKey);

    return ok({ deleted: true });
  } catch (error) {
    if (error.statusCode === 404) {
      return fail(404, 'NOT_FOUND', 'Swear event not found or already deleted.');
    }
    context.error('undoSwear error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to undo swear event at this time.');
  }
}

module.exports = {
  undoSwearHandler
};
