const { TableClient } = require('@azure/data-tables');

let client;
let initPromise;

function getEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getTableClient() {
  if (client) {
    return client;
  }

  const connectionString = getEnv('AZURE_TABLES_CONNECTION_STRING');
  const tableName = getEnv('SWEARJAR_TABLE_NAME', 'SwearLogs');

  client = TableClient.fromConnectionString(connectionString, tableName);

  if (!initPromise) {
    initPromise = client.createTable().catch((err) => {
      // Ignore if table already exists.
      if (err.statusCode !== 409) {
        throw err;
      }
    });
  }

  await initPromise;
  return client;
}

module.exports = {
  getTableClient
};
