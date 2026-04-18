'use strict';

jest.mock('../lib/tableClient');

const { getTableClient } = require('../lib/tableClient');
const { todayStatsHandler } = require('./todayStats');

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

describe('todayStatsHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validation', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await todayStatsHandler(makeRequest(), makeContext());
      expect(res.status).toBe(400);
      expect(res.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when userId is empty after trimming', async () => {
      const res = await todayStatsHandler(makeRequest({ userId: '   ' }), makeContext());
      expect(res.status).toBe(400);
    });
  });

  describe('successful responses', () => {
    it('returns 200 with todayCount, recentEvents, and trend', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const ts1 = `${today}T09:00:00.000Z`;
      const ts2 = `${today}T11:00:00.000Z`;
      const rows = [
        { partitionKey: `U|${today}`, dayKey: today, eventTimestamp: ts1 },
        { partitionKey: `U|${today}`, dayKey: today, eventTimestamp: ts2 }
      ];
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());

      expect(res.status).toBe(200);
      const { data } = res.jsonBody;
      expect(data.userId).toBe('U');
      expect(data.todayCount).toBe(2);
      // recentEvents are sorted newest-first
      expect(data.recentEvents[0]).toBe(ts2);
      expect(data.recentEvents[1]).toBe(ts1);
    });

    it('trend always has exactly 7 entries', async () => {
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf([])) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());
      expect(res.jsonBody.data.trend).toHaveLength(7);
    });

    it('trend entries each have day (YYYY-MM-DD) and count properties', async () => {
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf([])) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());
      for (const entry of res.jsonBody.data.trend) {
        expect(entry.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof entry.count).toBe('number');
      }
    });

    it('caps recentEvents at 10', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const rows = Array.from({ length: 15 }, (_, i) => ({
        partitionKey: `U|${today}`,
        dayKey: today,
        eventTimestamp: `${today}T${String(i).padStart(2, '0')}:00:00.000Z`
      }));
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());
      expect(res.jsonBody.data.recentEvents).toHaveLength(10);
    });

    it('falls back to recordedAt when eventTimestamp is absent', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const fallbackTs = `${today}T08:00:00.000Z`;
      const rows = [{ partitionKey: `U|${today}`, dayKey: today, recordedAt: fallbackTs }];
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());
      expect(res.jsonBody.data.recentEvents).toContain(fallbackTs);
    });

    it('correctly counts non-today events in trend without adding them to todayCount', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const rows = [
        { partitionKey: `U|${yesterday}`, dayKey: yesterday, eventTimestamp: `${yesterday}T10:00:00.000Z` }
      ];
      const mockClient = { listEntities: jest.fn().mockReturnValue(entitiesOf(rows)) };
      getTableClient.mockResolvedValue(mockClient);

      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), makeContext());
      const { data } = res.jsonBody;
      expect(data.todayCount).toBe(0);
      const yesterdayTrend = data.trend.find((t) => t.day === yesterday);
      expect(yesterdayTrend).toBeDefined();
      expect(yesterdayTrend.count).toBe(1);
    });
  });

  describe('storage errors', () => {
    it('returns 500 when listEntities throws', async () => {
      const mockClient = {
        listEntities: jest.fn().mockImplementation(() => {
          throw new Error('storage error');
        })
      };
      getTableClient.mockResolvedValue(mockClient);

      const ctx = makeContext();
      const res = await todayStatsHandler(makeRequest({ userId: 'U' }), ctx);
      expect(res.status).toBe(500);
      expect(ctx.error).toHaveBeenCalled();
    });
  });
});
