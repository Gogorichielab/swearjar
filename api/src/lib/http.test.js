'use strict';

const { ok, fail } = require('./http');

describe('ok()', () => {
  it('returns status 200 and wraps data by default', () => {
    const result = ok({ foo: 'bar' });
    expect(result.status).toBe(200);
    expect(result.jsonBody).toEqual({ success: true, data: { foo: 'bar' } });
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('accepts a custom status code', () => {
    const result = ok({ id: '1' }, 201);
    expect(result.status).toBe(201);
    expect(result.jsonBody.success).toBe(true);
  });
});

describe('fail()', () => {
  it('returns the given status and error envelope', () => {
    const result = fail(400, 'VALIDATION_ERROR', 'userId is required.');
    expect(result.status).toBe(400);
    expect(result.jsonBody).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'userId is required.' }
    });
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('includes details when provided', () => {
    const result = fail(400, 'VALIDATION_ERROR', 'Bad field.', { field: 'timestamp' });
    expect(result.jsonBody.error.details).toEqual({ field: 'timestamp' });
  });

  it('omits details key when details is undefined', () => {
    const result = fail(500, 'INTERNAL_ERROR', 'Oops.');
    expect(result.jsonBody.error).not.toHaveProperty('details');
  });

  it('works for 404 and 403 status codes', () => {
    expect(fail(404, 'NOT_FOUND', 'Not found.').status).toBe(404);
    expect(fail(403, 'FORBIDDEN', 'Forbidden.').status).toBe(403);
  });
});
