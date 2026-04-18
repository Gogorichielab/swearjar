'use strict';

jest.mock('../lib/tableClient');

const { getTableClient } = require('../lib/tableClient');
const { summaryHandler } = require('./summary');

function makeContext() {
  return { error: jest.fn() };
}

function makeRequest(params = {}) {
  return {
    query: {
      get: (key) => params[key] ?? null
    }
  };
}

async function* entitiesOf(rows) {
  for (const row of rows) {
    yield row;
  }
}

describe('summaryHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validation', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await summaryHandler(makeRequest(), makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when userId is empty after trimming', async () => {
      const res = await summaryHandler(makeRequest({ userId: '   ' }), makeContext());
      expect(res.status).toBe(400);
    });
  });

  describe('successful responses', () => {
    it('returns 200 with correct aggregations for multiple entities', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const rows = [
        { partitionKey: `BOLD-JAR-5432|${today}`, dayKey: today },
        { partitionKey: `BOLD-JAR-5432|${today}`, dayKey: today },
        { partitionKey: 'BOLD-JAR-5432|2024-01-10', dayKey: '2024-01-10' }
      ];
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await summaryHandler(makeRequest({ userId: 'BOLD-JAR-5432' }), makeContext());

      expect(res.status).toBe(200);
      const { data } = res.jsonBody;
      expect(data.userId).toBe('BOLD-JAR-5432');
      expect(data.lifetimeTotal).toBe(3);
      expect(data.todayCount).toBe(2);
      expect(data.calendarDays[today]).toBe(2);
      expect(data.calendarDays['2024-01-10']).toBe(1);
    });

    it('returns zero counts when no entities exist', async () => {
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf([])) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await summaryHandler(makeRequest({ userId: 'EMPTY-USER-0001' }), makeContext());
      expect(res.status).toBe(200);
      expect(res.jsonBody.data.lifetimeTotal).toBe(0);
      expect(res.jsonBody.data.todayCount).toBe(0);
      expect(res.jsonBody.data.calendarDays).toEqual({});
    });

    it('falls back to extracting dayKey from partitionKey when dayKey field is absent', async () => {
      const mockClient = {
        listEntities: jest.fn().mockReturnValue(
          entitiesOf([{ partitionKey: 'USER-A-1234|2024-03-20' }])
        )
      };
      getTableClient.mockResolvedValue(mockClient);

      const res = await summaryHandler(makeRequest({ userId: 'USER-A-1234' }), makeContext());
      expect(res.jsonBody.data.calendarDays['2024-03-20']).toBe(1);
    });

    it('limits calendarDays to lookbackDays most-recent days', async () => {
      // Create 5 distinct days of activity.
      const rows = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'].map(
        (d) => ({ partitionKey: `U|${d}`, dayKey: d })
      );
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await summaryHandler(
        makeRequest({ userId: 'U', lookbackDays: '3' }),
        makeContext()
      );
      const days = Object.keys(res.jsonBody.data.calendarDays);
      expect(days).toHaveLength(3);
      // Should keep the 3 most recent.
      expect(days).toContain('2024-01-05');
      expect(days).toContain('2024-01-04');
      expect(days).toContain('2024-01-03');
      expect(days).not.toContain('2024-01-01');
    });

    it('uses default lookbackDays of 180 when not provided', async () => {
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf([])) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await summaryHandler(makeRequest({ userId: 'X' }), makeContext());
      // No error, just verify lookback doesn't blow up with default.
      expect(res.status).toBe(200);
    });

    it('includes timezoneMode in the response', async () => {
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf([])) };
      getTableClient.mockResolvedValue(mockClient);
      const res = await summaryHandler(makeRequest({ userId: 'X' }), makeContext());
      expect(res.jsonBody.data).toHaveProperty('timezoneMode');
    });
  });

  describe('storage errors', () => {
    it('returns 500 when listEntities throws', async () => {
      const mockClient = {
        listEntities: jest.fn().mockImplementation(() => {
          throw new Error('table error');
        })
      };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const res = await summaryHandler(makeRequest({ userId: 'BOLD-JAR-5432' }), ctx);
      expect(res.status).toBe(500);
      expect(ctx.error).toHaveBeenCalled();
    });
  });
});
