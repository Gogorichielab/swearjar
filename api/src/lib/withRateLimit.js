const { checkRateLimit, getClientIp } = require('./rateLimiter');
const { fail } = require('./http');

function withRateLimit(handler, options = {}) {
  const scope = options.name || 'default';

  return async function rateLimited(request, context) {
    const ip = getClientIp(request);
    const result = checkRateLimit(`${scope}|${ip}`, options);

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      const response = fail(
        429,
        'RATE_LIMITED',
        'Too many requests. Please slow down and try again shortly.'
      );
      response.headers = {
        ...(response.headers || {}),
        'Retry-After': String(retryAfterSeconds)
      };
      return response;
    }

    return handler(request, context);
  };
}

module.exports = { withRateLimit };
