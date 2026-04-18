'use strict';

jest.mock('../lib/tableClient');

const { getTableClient } = require('../lib/tableClient');
const { logSwearHandler } = require('./logSwear');

function makeContext() {
  return { error: jest.fn() };
}

function makeRequest(body) {
  return {
    json: jest.fn().mockResolvedValue(body),
    body: null
  };
}

describe('logSwearHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful logging', () => {
    it('returns 201 with entity fields on a valid request', async () => {
      const mockClient = { createEntity: jest.fn().mockResolvedValue({}) };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({ userId: 'BOLD-JAR-5432', timestamp: '2024-06-15T14:30:00Z' });
      const res = await logSwearHandler(req, makeContext());

      expect(res.status).toBe(201);
      expect(res.jsonBody.success).toBe(true);
      expect(res.jsonBody.data).toMatchObject({
        partitionKey: 'BOLD-JAR-5432|2024-06-15',
        dayKey: '2024-06-15',
        eventTimestamp: '2024-06-15T14:30:00.000Z'
      });
      expect(res.jsonBody.data.id).toMatch(/^2024-06-15T14:30:00\.000Z-/);
      expect(mockClient.createEntity).toHaveBeenCalledTimes(1);
    });

    it('defaults to server time when timestamp is omitted', async () => {
      const mockClient = { createEntity: jest.fn().mockResolvedValue({}) };
      getTableClient.mockResolvedValue(mockClient);

      const before = new Date().toISOString().slice(0, 10);
      const req = makeRequest({ userId: 'BOLD-JAR-5432' });
      const res = await logSwearHandler(req, makeContext());

      expect(res.status).toBe(201);
      expect(res.jsonBody.data.dayKey).toBe(before);
    });

    it('trims whitespace from userId', async () => {
      const mockClient = { createEntity: jest.fn().mockResolvedValue({}) };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({ userId: '  BOLD-JAR-5432  ' });
      const res = await logSwearHandler(req, makeContext());

      expect(res.status).toBe(201);
      expect(res.jsonBody.data.partitionKey).toMatch(/^BOLD-JAR-5432\|/);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when userId is missing', async () => {
      const req = makeRequest({});
      const res = await logSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when userId is empty after trimming', async () => {
      const req = makeRequest({ userId: '   ' });
      const res = await logSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid timestamp', async () => {
      const req = makeRequest({ userId: 'BOLD-JAR-5432', timestamp: 'not-a-date' });
      const res = await logSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
      expect(res.jsonBody.error.details).toEqual({ field: 'timestamp' });
    });

    it('returns 400 for a non-JSON body (request.json throws)', async () => {
      const req = { json: jest.fn().mockRejectedValue(new SyntaxError('bad json')), body: null };
      // Override: simulate the parse failure path
      const badReq = {
        json: jest.fn().mockRejectedValue(new SyntaxError()),
        body: null
      };
      // body is null so the parseBody helper falls through to throwing
      const res = await logSwearHandler(badReq, makeContext());
      // body is null → returns {} → userId is missing → 400
      expect(res.status).toBe(400);
    });
  });

  describe('storage errors', () => {
    it('returns 500 when createEntity throws', async () => {
      const mockClient = { createEntity: jest.fn().mockRejectedValue(new Error('storage fail')) };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const req = makeRequest({ userId: 'BOLD-JAR-5432' });
      const res = await logSwearHandler(req, ctx);

      expect(res.status).toBe(500);
      expect(res.jsonBody.error.code).toBe('INTERNAL_ERROR');
      expect(ctx.error).toHaveBeenCalled();
    });
  });
});
