# AGENTS.md — SwearJar

Guidance for AI agents (Copilot, Claude, Codex, etc.) working in this repository.
Read this file before writing, editing, or reviewing any code.

---

## Repository purpose

SwearJar is a personal accountability app that logs swear-word events.
It is an **Azure Static Web Apps** project: a static HTML/CSS/JS frontend served by SWA, backed by **Azure Functions (Node.js ≥ 20)** that read and write to **Azure Table Storage**.

---

## Repo layout

```
swearjar/
├─ frontend/                  # Static site deployed by SWA
│  ├─ index.html              # Entry point
│  ├─ app.js                  # All client-side logic
│  └─ styles.css              # All styles
├─ api/                       # Azure Functions app
│  ├─ host.json               # Functions host config (v2 extension bundle 4.x)
│  ├─ package.json            # Node deps: @azure/data-tables, @azure/functions ^4
│  ├─ local.settings.sample.json   # Copy → local.settings.json (never commit secrets)
│  └─ src/
│     ├─ index.js             # Function registrations (app.http calls)
│     └─ functions/
│        ├─ logSwear.js       # POST /api/logSwear
│        └─ summary.js        # GET  /api/summary
│     └─ lib/
│        ├─ tableClient.js    # Singleton Azure Table Storage client
│        ├─ dateUtils.js      # UTC/LOCAL day-key helpers
│        └─ http.js           # ok() / fail() response helpers
├─ staticwebapp.config.json   # SWA routing + nav fallback
├─ app.js                     # ROOT-LEVEL — legacy/scratch; prefer frontend/app.js
└─ .github/workflows/         # CI/CD — do not edit without understanding SWA deploy
```

> **Important:** `app.js` at the repo root is a legacy/prototype file.
> Canonical front-end code lives in `frontend/`. Do not merge or confuse the two.

---

## Environment variables

Never hardcode secrets. All configuration is injected via environment variables.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `AZURE_TABLES_CONNECTION_STRING` | **Yes** | — | Full connection string to Storage Account |
| `SWEARJAR_TABLE_NAME` | No | `SwearLog` | Auto-created on first use |
| `DATE_TIME_MODE` | No | `UTC` | `UTC` or `LOCAL`; controls day-bucket timezone |
| `FUNCTIONS_WORKER_RUNTIME` | **Yes** | — | Must be `node` |
| `AzureWebJobsStorage` | **Yes** | — | Functions host storage; use `UseDevelopmentStorage=true` locally |

Local development: copy `api/local.settings.sample.json` → `api/local.settings.json` and populate values. **Never commit `local.settings.json`.**

---

## API contracts

### POST `/api/logSwear`

**Request body (JSON):**
```json
{ "userId": "string (required)", "timestamp": "ISO-8601 string (optional)" }
```

**Success — 201:**
```json
{
  "success": true,
  "data": {
    "id": "<rowKey>",
    "partitionKey": "<userId>|<YYYY-MM-DD>",
    "dayKey": "YYYY-MM-DD",
    "eventTimestamp": "ISO string"
  }
}
```

**Error shape (all failures):**
```json
{ "success": false, "error": { "code": "string", "message": "string" } }
```

### GET `/api/summary?userId=<id>&lookbackDays=<n>`

**Success — 200:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "todayKey": "YYYY-MM-DD",
    "todayCount": 0,
    "lifetimeTotal": 0,
    "calendarDays": { "YYYY-MM-DD": 3 }
  }
}
```

---

## Data model (Azure Table Storage)

| Field | Value |
|---|---|
| `PartitionKey` | `{userId}\|{YYYY-MM-DD}` |
| `RowKey` | `{isoTimestamp}-{uuid}` — unique per event |
| `userId` | string |
| `dayKey` | `YYYY-MM-DD` |
| `eventTimestamp` | ISO-8601 string |
| `recordedAt` | ISO-8601 server time of insert |

The table is **created automatically** by `tableClient.js` on first use (409 Conflict on re-create is silently ignored).

---

## Coding conventions

### General
- Node.js **≥ 20** required; use `const`/`let`, async/await, no transpilation.
- No TypeScript — plain JS throughout.
- No build step for the frontend; `index.html` loads `app.js` and `styles.css` directly.
- Prefer the existing helper modules (`http.js`, `dateUtils.js`, `tableClient.js`) — do not inline their logic elsewhere.

### Azure Functions
- Use `@azure/functions` v4 SDK — register handlers via `app.http(...)` in `src/index.js`.
- Do **not** use `function.json` binding files — the v4 SDK replaces them.
- Auth level is `function` (requires `?code=` key). Do not downgrade to `anonymous` in production.
- Always return responses through `ok()` / `fail()` from `lib/http.js`.
- Log errors with `context.error(...)`, not `console.error`.

### Frontend
- All API calls use **relative paths** (`/api/logSwear`, `/api/summary`) — never hardcode hostnames.
- `userId` must be passed in every API request body/query. The front-end is responsible for generating or persisting a stable `userId`.
- DOM queries go through the `elements` map; do not scatter `getElementById` calls.
- State mutations go through the `state` object; update UI by calling `updateCounters()`, `updatePenalty()`, `renderCalendar()` after state changes.
- Optimistic UI updates are acceptable; always handle errors gracefully and re-enable buttons.

### Styles
- CSS custom properties are defined in `:root` in `styles.css` — use variables, not raw colour values.
- No CSS-in-JS, no preprocessors. Plain CSS only.
- Responsive breakpoint at `640px` (see existing `@media` query).

---

## What agents should NOT do

- Do not commit `api/local.settings.json` or any file containing real connection strings or keys.
- Do not change `authLevel` from `function` to `anonymous` in `src/index.js` without an explicit request.
- Do not introduce a build/bundle step (Webpack, Vite, etc.) without updating the GitHub Actions workflow and `staticwebapp.config.json`.
- Do not edit `.github/workflows/azure-static-web-apps-purple-forest-00c60bc0f.yml` unless the task explicitly requires CI/CD changes — the SWA deploy token is tied to the workflow filename.
- Do not add a second HTTP response helper; use `lib/http.js`.
- Do not add new top-level `app.js` logic — that file is legacy. All new front-end code goes in `frontend/app.js`.
- Do not change the Table Storage `PartitionKey` format (`{userId}|{YYYY-MM-DD}`) — existing rows depend on it.
- Do not use wildcard CORS (`*`) with credentials in production; restrict to the SWA origin.

---

## Local development workflow

```bash
# 1. Install API dependencies
cd api && npm install

# 2. Set up local config
cp api/local.settings.sample.json api/local.settings.json
# Edit local.settings.json — add real or Azurite connection strings

# 3. Start Functions host
cd api && func start        # listens on http://localhost:7071

# 4. Serve the frontend (in a separate terminal)
# Any static server works, e.g.:
npx serve frontend          # or: python3 -m http.server 3000 -d frontend

# 5. (Optional) Use SWA CLI for unified local routing
npx @azure/static-web-apps-cli start frontend --api-location api
# Proxies /api/* to the Functions host automatically
```

---

## Testing an API endpoint locally

```bash
# Log a swear
curl -X POST http://localhost:7071/api/logSwear \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","timestamp":"2026-04-07T10:00:00Z"}'

# Fetch summary
curl "http://localhost:7071/api/summary?userId=test-user"
```

---

## Deployment

Deployment is handled by the GitHub Actions workflow on push to `main`.

- `app_location: "/"` — SWA serves from repo root (adjust to `frontend/` if `index.html` moves there permanently).
- `api_location: ""` — currently blank; set to `"api"` if the workflow should deploy the Functions app via SWA managed API.
- Secrets live in **GitHub Secrets** (`AZURE_STATIC_WEB_APPS_API_TOKEN_PURPLE_FOREST_00C60BC0F`) and **Azure Function App → Configuration → Application Settings**.

After deploying, verify:
1. Frontend loads at the SWA URL.
2. `/api/logSwear` returns 201 and a row appears in Table Storage.
3. `/api/summary` returns correct `todayCount` and `lifetimeTotal`.
