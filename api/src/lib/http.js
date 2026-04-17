/**
 * Common security headers applied to every API response.
 * - nosniff  : prevents MIME-type sniffing attacks
 * - no-store : sensitive user data must not be cached by intermediaries
 * - DENY     : belt-and-suspenders frame-ancestor protection alongside the
 *              CSP `frame-ancestors 'none'` set in staticwebapp.config.json
 */
const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'X-Frame-Options': 'DENY'
};

function json(status, payload) {
  return {
    status,
    jsonBody: payload,
    headers: { ...SECURITY_HEADERS }
  };
}

function ok(data, status = 200) {
  return json(status, {
    success: true,
    data
  });
}

function fail(status, code, message, details) {
  return json(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

module.exports = {
  ok,
  fail
};
