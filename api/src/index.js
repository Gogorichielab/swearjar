const { app } = require('@azure/functions');
const { logSwearHandler } = require('./functions/logSwear');
const { undoSwearHandler } = require('./functions/undoSwear');
const { resetJarHandler } = require('./functions/resetJar');
const { summaryHandler } = require('./functions/summary');
const { todayStatsHandler } = require('./functions/todayStats');
const { withRateLimit } = require('./lib/withRateLimit');

// Per-endpoint sliding-window defaults; tune via RATE_LIMIT_* env vars.
// `resetJar` is intentionally tighter because each call can delete arbitrarily
// many rows for a single user — repeated calls are pure abuse.
const writeLimit = { windowMs: 60_000, max: 30 };
const readLimit = { windowMs: 60_000, max: 60 };
const destructiveLimit = { windowMs: 60_000, max: 5 };

app.http('logSwear', {
  route: 'logSwear',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withRateLimit(logSwearHandler, { name: 'logSwear', ...writeLimit })
});

app.http('undoSwear', {
  route: 'undoSwear',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withRateLimit(undoSwearHandler, { name: 'undoSwear', ...writeLimit })
});

app.http('todayStats', {
  route: 'todayStats',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withRateLimit(todayStatsHandler, { name: 'todayStats', ...readLimit })
});

app.http('resetJar', {
  route: 'resetJar',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withRateLimit(resetJarHandler, { name: 'resetJar', ...destructiveLimit })
});

// Legacy endpoint retained for compatibility with older clients.
app.http('summary', {
  route: 'summary',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withRateLimit(summaryHandler, { name: 'summary', ...readLimit })
});
