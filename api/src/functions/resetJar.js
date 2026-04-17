const { getTableClient } = require('../lib/tableClient');
const { ok, fail } = require('../lib/http');

function escapeOdata(value) {
  return String(value).replace(/'/g, "''");
}

async function resetJarHandler(request, context) {
  try {
    let userId;
    try {
      const body = await request.json();
      userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    } catch (_err) {
      userId = '';
    }

    if (!userId) {
      return fail(400, 'VALIDATION_ERROR', 'userId is required and must be a non-empty string.');
    }

    const userEscaped = escapeOdata(userId);
    const startPartition = `${userEscaped}|0000-00-00`;
    const endPartition = `${userEscaped}|~~~~-~~-~~`;

    const tableClient = await getTableClient();
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey ge '${startPartition}' and PartitionKey lt '${endPartition}'`,
        select: ['partitionKey', 'rowKey']
      }
    });

    let deleted = 0;
    for await (const entity of entities) {
      await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
      deleted += 1;
    }

    return ok({ deleted });
  } catch (error) {
    context.error('resetJar error', error);
    return fail(500, 'INTERNAL_ERROR', 'Unable to reset jar at this time.');
  }
}

module.exports = {
  resetJarHandler
};
