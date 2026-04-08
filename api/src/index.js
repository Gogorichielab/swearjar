const { app } = require('@azure/functions');
const { logSwearHandler } = require('./functions/logSwear');
const { summaryHandler } = require('./functions/summary');
const { todayStatsHandler } = require('./functions/todayStats');

app.http('logSwear', {
  route: 'logSwear',
  methods: ['POST'],
  authLevel: 'function',
  handler: logSwearHandler
});

app.http('todayStats', {
  route: 'todayStats',
  methods: ['GET'],
  authLevel: 'function',
  handler: todayStatsHandler
});

// Legacy endpoint retained for compatibility with older clients.
app.http('summary', {
  route: 'summary',
  methods: ['GET'],
  authLevel: 'function',
  handler: summaryHandler
});
