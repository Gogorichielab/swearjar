/**
 * Identity resolution for Azure Static Web Apps Easy Auth.
 *
 * When the SWA platform authenticates a request, it forwards a base64-encoded
 * JSON payload in the `x-ms-client-principal` header (see SWA "Accessing user
 * information" docs). When that header is present, we treat its `userId` as the
 * authoritative identity for the request, regardless of any body-supplied
 * `userId`.
 *
 * To preserve the legacy session-code flow during migration, body-supplied
 * `userId` is still accepted when no principal header is present and the
 * `REQUIRE_AUTH` env var is not enabled. Operators should set
 * `REQUIRE_AUTH=true` once Easy Auth is wired up at the SWA routing layer.
 */

function isAuthRequired() {
  return String(process.env.REQUIRE_AUTH || '').toLowerCase() === 'true';
}

function decodeClientPrincipal(request) {
  if (!request || !request.headers || typeof request.headers.get !== 'function') {
    return null;
  }

  const header = request.headers.get('x-ms-client-principal');
  if (!header) {
    return null;
  }

  try {
    const json = Buffer.from(header, 'base64').toString('utf8');
    const principal = JSON.parse(json);
    if (!principal || typeof principal !== 'object') {
      return null;
    }
    const userId = principal.userId || principal.userDetails;
    if (!userId || typeof userId !== 'string') {
      return null;
    }
    return {
      userId: userId.trim(),
      identityProvider: principal.identityProvider || null,
      raw: principal
    };
  } catch (_err) {
    return null;
  }
}

/**
 * Resolve the authenticated user id for a request.
 *
 * @returns {{userId: string|null, authenticated: boolean, error?: string}}
 *   - When `authenticated` is true, `userId` came from the trusted SWA principal header.
 *   - When `authenticated` is false and `error` is set, the caller should reject
 *     with the matching HTTP status (`401` for `AUTH_REQUIRED`).
 */
function resolveUserId(request, fallbackUserId) {
  const principal = decodeClientPrincipal(request);
  if (principal && principal.userId) {
    return { userId: principal.userId, authenticated: true };
  }

  if (isAuthRequired()) {
    return { userId: null, authenticated: false, error: 'AUTH_REQUIRED' };
  }

  const fallback = typeof fallbackUserId === 'string' ? fallbackUserId.trim() : '';
  if (fallback) {
    return { userId: fallback, authenticated: false };
  }

  return { userId: null, authenticated: false, error: 'MISSING_USER_ID' };
}

module.exports = {
  decodeClientPrincipal,
  isAuthRequired,
  resolveUserId
};
