'use strict';

jest.mock('../lib/tableClient');

const { getTableClient } = require('../lib/tableClient');
const { undoSwearHandler } = require('./undoSwear');

function makeContext() {
  return { error: jest.fn() };
}

function makeRequest(body) {
  return { json: jest.fn().mockResolvedValue(body) };
}

describe('undoSwearHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('successful deletion', () => {
    it('returns 200 with deleted:true when the entity exists', async () => {
      const mockClient = { deleteEntity: jest.fn().mockResolvedValue({}) };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({
        userId: 'BOLD-JAR-5432',
        partitionKey: 'BOLD-JAR-5432|2024-06-15',
        id: '2024-06-15T14:30:00.000Z-some-uuid'
      });
      const res = await undoSwearHandler(req, makeContext());

      expect(res.status).toBe(200);
      expect(res.jsonBody.data).toEqual({ deleted: true });
      expect(mockClient.deleteEntity).toHaveBeenCalledWith(
        'BOLD-JAR-5432|2024-06-15',
        '2024-06-15T14:30:00.000Z-some-uuid'
      );
    });
  });

  describe('validation errors', () => {
    it('returns 400 when request body is not valid JSON', async () => {
      const req = { json: jest.fn().mockRejectedValue(new SyntaxError('bad json')) };
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when userId is missing', async () => {
      const req = makeRequest({ partitionKey: 'X|2024-01-01', id: 'some-id' });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
    });

    it('returns 400 when userId is whitespace only', async () => {
      const req = makeRequest({ userId: '  ', partitionKey: 'X|2024-01-01', id: 'some-id' });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
    });

    it('returns 400 when partitionKey is missing', async () => {
      const req = makeRequest({ userId: 'BOLD-JAR-5432', id: 'some-id' });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when id is missing', async () => {
      const req = makeRequest({ userId: 'BOLD-JAR-5432', partitionKey: 'BOLD-JAR-5432|2024-06-15' });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(400);
    });

    it('returns 403 when partitionKey does not belong to the userId', async () => {
      const req = makeRequest({
        userId: 'BOLD-JAR-5432',
        partitionKey: 'OTHER-USER-0001|2024-06-15',
        id: 'some-id'
      });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(403);
      expect(res.jsonBody.error.code).toBe('FORBIDDEN');
    });
  });

  describe('storage errors', () => {
    it('returns 404 when the entity is not found in storage', async () => {
      const notFoundErr = Object.assign(new Error('not found'), { statusCode: 404 });
      const mockClient = { deleteEntity: jest.fn().mockRejectedValue(notFoundErr) };
      getTableClient.mockResolvedValue(mockClient);

      const req = makeRequest({
        userId: 'BOLD-JAR-5432',
        partitionKey: 'BOLD-JAR-5432|2024-06-15',
        id: 'missing-uuid'
      });
      const res = await undoSwearHandler(req, makeContext());
      expect(res.status).toBe(404);
      expect(res.jsonBody.error.code).toBe('NOT_FOUND');
    });

    it('returns 500 for unexpected storage errors', async () => {
      const mockClient = { deleteEntity: jest.fn().mockRejectedValue(new Error('storage fail')) };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const req = makeRequest({
        userId: 'BOLD-JAR-5432',
        partitionKey: 'BOLD-JAR-5432|2024-06-15',
        id: 'some-id'
      });
      const res = await undoSwearHandler(req, ctx);
      expect(res.status).toBe(500);
      expect(ctx.error).toHaveBeenCalled();
    });
  });
});
