'use strict';

jest.mock('../lib/tableClient');

const { getTableClient } = require('../lib/tableClient');
const { resetJarHandler } = require('./resetJar');

function makeContext() {
  return { error: jest.fn() };
}

function makeRequest(body) {
  return { json: jest.fn().mockResolvedValue(body) };
}

async function* entitiesOf(rows) {
  for (const row of rows) {
    yield row;
  }
}

describe('resetJarHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validation', () => {
    it('returns 400 when userId is missing', async () => {
      const req = { json: jest.fn().mockResolvedValue({}) };
      const res = await resetJarHandler(req, makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when body is not valid JSON', async () => {
      const req = { json: jest.fn().mockRejectedValue(new SyntaxError('bad json')) };
      const res = await resetJarHandler(req, makeContext());
      expect(res.status).toBe(400);
    });

    it('returns 400 when userId is whitespace only', async () => {
      const req = makeRequest({ userId: '   ' });
      const res = await resetJarHandler(req, makeContext());
      expect(res.status).toBe(400);
    });
  });

  describe('successful resets', () => {
    it('deletes all user entities and returns the count', async () => {
      const rows = [
        { partitionKey: 'BOLD-JAR-5432|2024-06-14', rowKey: 'rk1' },
        { partitionKey: 'BOLD-JAR-5432|2024-06-15', rowKey: 'rk2' },
        { partitionKey: 'BOLD-JAR-5432|2024-06-15', rowKey: 'rk3' }
      ];
      const mockClient = {
        listEntities: jest.fn().mockReturnValue(entitiesOf(rows)),
        deleteEntity: jest.fn().mockResolvedValue({})
      };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({ userId: 'BOLD-JAR-5432' });
      const res = await resetJarHandler(req, makeContext());

      expect(res.status).toBe(200);
      expect(res.jsonBody.data).toEqual({ deleted: 3 });
      expect(mockClient.deleteEntity).toHaveBeenCalledTimes(3);
    });

    it('returns deleted:0 when the user has no stored events', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue(entitiesOf([])),
        deleteEntity: jest.fn()
      };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({ userId: 'EMPTY-USER-0001' });
      const res = await resetJarHandler(req, makeContext());

      expect(res.status).toBe(200);
      expect(res.jsonBody.data.deleted).toBe(0);
      expect(mockClient.deleteEntity).not.toHaveBeenCalled();
    });
  });

  describe('storage errors', () => {
    it('returns 500 when listEntities throws', async () => {
      const mockClient = {
        listEntities: jest.fn().mockImplementation(() => {
          throw new Error('storage fail');
        })
      };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const req = makeRequest({ userId: 'BOLD-JAR-5432' });
      const res = await resetJarHandler(req, ctx);
      expect(res.status).toBe(500);
      expect(ctx.error).toHaveBeenCalled();
    });

    it('returns 500 when deleteEntity throws during iteration', async () => {
      const rows = [{ partitionKey: 'U|2024-01-01', rowKey: 'rk1' }];
      const mockClient = {
        listEntities: jest.fn().mockReturnValue(entitiesOf(rows)),
        deleteEntity: jest.fn().mockRejectedValue(new Error('delete fail'))
      };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const req = makeRequest({ userId: 'U' });
      const res = await resetJarHandler(req, ctx);
      expect(res.status).toBe(500);
    });
  });
});
