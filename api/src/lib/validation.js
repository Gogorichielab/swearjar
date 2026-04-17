/**
 * Shared input-validation utilities for SwearJar API functions.
 *
 * userId / session-code format: WORD-WORD-NNNN
 *   - WORD  : 2–8 uppercase ASCII letters  (matches frontend session.js generateCode)
 *   - NNNN  : exactly 4 decimal digits
 *   - Total max length: 8 + 1 + 8 + 1 + 4 = 22 characters
 *
 * The strict allowlist prevents the userId from carrying characters that could
 * corrupt the PartitionKey structure (the pipe `|` separator) or inject into
 * OData filter strings (single-quote `'`, parentheses, etc.).
 */

const USER_ID_PATTERN = /^[A-Z]{2,8}-[A-Z]{2,8}-\d{4}$/;

// Maximum length of a valid userId: 8 (WORD) + 1 (-) + 8 (WORD) + 1 (-) + 4 (NNNN) = 22 chars.
// The pre-check below bounds input length before the regex runs, preventing any
// theoretical ReDoS risk from very long strings.
const USER_ID_MAX_LENGTH = 22;

/**
 * Returns null when userId is valid, or a human-readable error string when it
 * is not.  Callers should pass the error message to fail(400, …) unchanged.
 *
 * @param {unknown} userId
 * @returns {string|null}
 */
function validateUserId(userId) {
  if (typeof userId !== 'string') {
    return 'userId must be a non-empty string in the format WORD-WORD-NNNN.';
  }

  const trimmed = userId.trim();

  if (!trimmed) {
    return 'userId is required and must be a non-empty string.';
  }

  if (trimmed.length > USER_ID_MAX_LENGTH) {
    return `userId is too long and must match the format WORD-WORD-NNNN (max ${USER_ID_MAX_LENGTH} characters).`;
  }

  if (!USER_ID_PATTERN.test(trimmed)) {
    return 'userId must match the format WORD-WORD-NNNN (e.g., BOLD-JAR-1234).';
  }

  return null; // valid
}

module.exports = { validateUserId };
