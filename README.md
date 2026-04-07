# swearjar

## Azure Functions API (`api/`)

This repository now includes a Node.js Azure Functions project under `api/`.

### Endpoints

- `POST /api/logSwear`
  - Body:
    - `userId` (required string)
    - `timestamp` (optional ISO-8601 string; defaults to server time)
  - Returns `201` with logged event metadata.

- `GET /api/summary?userId=<id>&lookbackDays=<n>`
  - `userId` required.
  - `lookbackDays` optional (default 180).
  - Returns:
    - `todayCount`
    - `lifetimeTotal`
    - `calendarDays` map keyed by `YYYY-MM-DD`.

### Environment settings

Set these in Azure Function App settings or `local.settings.json`:

- `AZURE_TABLES_CONNECTION_STRING` (required)
- `SWEARJAR_TABLE_NAME` (optional, default `SwearLog`)
- `DATE_TIME_MODE` (`UTC` default, or `LOCAL`)

Date handling defaults to UTC for consistent partitioning across regions. Set `DATE_TIME_MODE=LOCAL` to bucket days using server-local date values.

### Run locally

```bash
cd api
npm install
func start
```
