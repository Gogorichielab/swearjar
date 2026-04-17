const { app } = require('@azure/functions');
const { logSwearHandler } = require('./functions/logSwear');
const { resetJarHandler } = require('./functions/resetJar');
const { summaryHandler } = require('./functions/summary');
const { todayStatsHandler } = require('./functions/todayStats');

app.http('logSwear', {
  route: 'logSwear',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: logSwearHandler
});

app.http('todayStats', {
  route: 'todayStats',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: todayStatsHandler
});

app.http('resetJar', {
  route: 'resetJar',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: resetJarHandler
});

// Legacy endpoint retained for compatibility with older clients.
app.http('summary', {
  route: 'summary',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: summaryHandler
});
