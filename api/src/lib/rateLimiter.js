/**
 * In-memory sliding-window rate limiter.
 *
 * This is a best-effort, per-instance interim mitigation against bulk abuse
 * (DoS, session-code enumeration, cost amplification). It does NOT coordinate
 * across Function App instances — for production-grade throttling, place
 * Azure API Management, Azure Front Door, or the SWA Standard-tier WAF in
 * front of the API.
 */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;
const CLEANUP_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 5 * 60_000;

const buckets = new Map();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getWindowMs() {
  return parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
}

function getMaxRequests() {
  return parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS);
}

function getClientIp(request) {
  const headerGet = request && request.headers && typeof request.headers.get === 'function'
    ? (name) => request.headers.get(name)
    : () => null;

  const forwarded = headerGet('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return (
    headerGet('x-azure-clientip') ||
    headerGet('x-azure-socketip') ||
    headerGet('client-ip') ||
    'unknown'
  );
}

function checkRateLimit(key, options = {}) {
  const windowMs = options.windowMs || getWindowMs();
  const max = options.max || getMaxRequests();
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = buckets.get(key) || [];
  const recent = existing.filter((ts) => ts > windowStart);

  if (recent.length >= max) {
    buckets.set(key, recent);
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return { allowed: false, retryAfterMs, remaining: 0, limit: max };
  }

  recent.push(now);
  buckets.set(key, recent);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, max - recent.length),
    limit: max
  };
}

const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  for (const [key, timestamps] of buckets.entries()) {
    const fresh = timestamps.filter((ts) => ts > cutoff);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else if (fresh.length !== timestamps.length) {
      buckets.set(key, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

function __resetForTests() {
  buckets.clear();
}

module.exports = {
  checkRateLimit,
  getClientIp,
  __resetForTests
};
