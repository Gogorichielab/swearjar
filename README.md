# Swearjar MVP (Azure Static Web Apps + Azure Functions)

Swearjar is a personal accountability app that tracks swear events, today's total, today's jar amount, recent activity, and a 7-day trend.

This repository is organized for deployment with **Azure Static Web Apps** and a **Node.js Azure Functions API** backed by **Azure Table Storage**.

## 1) Project Folder Structure

```text
swearjar/
├─ frontend/
│  ├─ index.html                # Main UI (title, counters, button, settings, activity, trend)
│  ├─ styles.css                # Modern responsive + dark-mode-friendly CSS
│  └─ app.js                    # Vanilla JS state, rendering, and fetch calls to /api/*
├─ api/
│  ├─ host.json                 # Functions host config
│  ├─ package.json              # Functions runtime dependencies/scripts
│  ├─ local.settings.sample.json# Example local env vars (copy to local.settings.json)
│  └─ src/
│     ├─ index.js               # Azure Function registrations
│     ├─ functions/
│     │  ├─ logSwear.js         # POST /api/logSwear
│     │  ├─ todayStats.js       # GET /api/todayStats
│     │  └─ summary.js          # Legacy compatibility endpoint
│     └─ lib/
│        ├─ tableClient.js      # Azure Table Storage client (auto-create table)
│        ├─ dateUtils.js        # Date/day-key helpers
│        └─ http.js             # API response helpers
├─ staticwebapp.config.json     # SWA route + fallback config
└─ README.md
```

## 2) `package.json` (Azure Functions)

The Functions app uses the `api/package.json` file with:
- `@azure/functions` (v4 model)
- `@azure/data-tables`
- Node.js >= 20 runtime

## 3) Azure Function Files

### `POST /api/logSwear`
- File: `api/src/functions/logSwear.js`
- Input JSON:
  ```json
  { "userId": "string", "timestamp": "optional ISO string" }
  ```
- Behavior:
  - validates `userId`
  - builds partition key `{userId}|{YYYY-MM-DD}`
  - writes a row to Azure Table Storage
  - returns `201`

### `GET /api/todayStats?userId=<id>`
- File: `api/src/functions/todayStats.js`
- Returns:
  - `todayCount`
  - `recentEvents` (latest entries for today)
  - `trend` (last 7 day buckets)

### Registration file
- `api/src/index.js` registers:
  - `logSwear`
  - `todayStats`
  - `summary` (legacy compatibility)

## 4) Front-End Files (HTML/CSS/Vanilla JS)

### `frontend/index.html`
Includes all required MVP sections:
- app title
- today's swear count
- today's jar dollar amount
- one large button to log a swear
- recent activity list
- simple 7-day trend section
- settings section for configurable fine amount

### `frontend/styles.css`
- clean card-based UI
- mobile-friendly responsive layout
- dark-mode-friendly theme (with light-mode media override)

### `frontend/app.js`
- generates/persists `userId` in localStorage
- persists fine amount setting in localStorage
- calls API via `fetch`:
  - `POST /api/logSwear`
  - `GET /api/todayStats`
- updates all UI sections after API responses

## 5) Setup and Deployment

## Prerequisites
- Node.js 20+
- Azure Functions Core Tools v4
- Azure Storage account (or Azurite for local emulation)
- Azure Static Web Apps resource

## Local Setup

1. Install API dependencies:
   ```bash
   cd api
   npm install
   ```

2. Create local function settings:
   ```bash
   cp local.settings.sample.json local.settings.json
   ```
   Update values in `api/local.settings.json`.

3. Run Functions API:
   ```bash
   npm start
   ```

4. In a separate terminal, serve the frontend:
   ```bash
   npx serve frontend
   ```

5. (Recommended) Run SWA CLI for integrated local routing:
   ```bash
   npx @azure/static-web-apps-cli start frontend --api-location api
   ```

## Deployment (GitHub + Azure Static Web Apps)

1. Push this repository to GitHub.
2. Create Azure Static Web Apps and connect the GitHub repo.
3. In workflow config, ensure paths point to this structure:
   - app location: `frontend`
   - api location: `api`
4. Add required application settings in Azure (see env vars below).
5. Deploy from `main` branch.

## 6) Example Environment Variables

Set these in `api/local.settings.json` for local use and in Azure Function App settings for cloud use.

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "AZURE_TABLES_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "SWEARJAR_TABLE_NAME": "SwearLogs",
    "DATE_TIME_MODE": "UTC"
  }
}
```

## Notes
- The table name default is `SwearLogs` to match the MVP requirement.
- Do not commit `api/local.settings.json` with secrets.
- Keep frontend API calls relative (`/api/...`) for SWA compatibility.
