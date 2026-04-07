const { app } = require('@azure/functions');
const { logSwearHandler } = require('./functions/logSwear');
const { summaryHandler } = require('./functions/summary');

app.http('logSwear', {
  route: 'logSwear',
  methods: ['POST'],
  authLevel: 'function',
  handler: logSwearHandler
});

app.http('summary', {
  route: 'summary',
  methods: ['GET'],
  authLevel: 'function',
  handler: summaryHandler
});
