# SwearJar

<!-- markdownlint-disable MD013 -->

SwearJar is a personal accountability app that helps you track and reduce
swearing. Tap an animated jar to log each offense, watch the jar fill up with
coins, and review your daily and weekly history. Each user's data is stored
under a shareable session code, so your jar goes with you across devices.

The app is built with plain HTML/CSS/JavaScript on the frontend and Azure
Functions on the backend, deployed as an Azure Static Web App.

---

## Table of contents

- [What the app does](#what-the-app-does)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Repo structure](#repo-structure)
- [Environment variables](#environment-variables)
- [Local development setup](#local-development-setup)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Deployment](#deployment)
- [Infrastructure as code](#infrastructure-as-code)
- [Coding conventions](#coding-conventions)

---

## What the app does

When a user opens SwearJar for the first time, an onboarding dialog generates a
unique **session code** (e.g. `BOLD-JAR-5432`, format: `WORD-WORD-1234`). The
user writes down this code and can enter it later on any device to rejoin their
jar.

From the main screen the user can:

- **Tap the jar** (or click "Add offense") to log a swear. Each tap animates
  the jar, drops a coin, and triggers a reaction like "Again?!" or "For shame!".
- **See live stats** — today's count, this week's total, and their all-time
  daily record.
- **See total owed** — today's count × the configurable fine amount
  (default \$1.00 per offense). Tap the dollar amount to change the fine.
- **Browse recent history** — timestamps of the last eight offenses logged
  today.
- **Reset the jar** — permanently deletes all stored data for the current
  session code.
- **Switch jar** — load a different session code, useful for sharing a jar
  with a partner.

---

## Screenshots

<table>
  <tr>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/ec5682b0-c986-4acf-98f2-5769d28d3f75" alt="Onboarding dialog — generate or enter a session code" width="220" />
      <br /><sub><b>Onboarding</b> — generate or enter a session code</sub>
    </td>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/fa996f98-78dc-4e65-b4cf-0d1c54587d3c" alt="Main screen — empty jar, clean slate" width="220" />
      <br /><sub><b>Empty jar</b> — clean slate on a fresh day</sub>
    </td>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/1401438c-6508-410a-97f5-80fa41a20f5c" alt="Main screen — jar filling up after 5 offenses" width="220" />
      <br /><sub><b>Filling up</b> — 5 offenses logged, coins visible in jar</sub>
    </td>
  </tr>
</table>

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Vanilla HTML/CSS/JavaScript — no framework, no build step |
| Backend | Azure Functions v4 SDK (`@azure/functions ^4`) · Node.js ≥ 20 |
| Storage | Azure Table Storage (`@azure/data-tables ^13`) |
| Hosting | Azure Static Web Apps (Free tier) |
| IaC | Bicep (`iac/main.bicep`) |
| Monitoring | Azure Application Insights |
| CI/CD | GitHub Actions |

---

## Repo structure

```text
swearjar/
├─ frontend/                        # Static site — deployed by SWA
│  ├─ index.html                    # App shell: jar SVG, stats cards, history
│  ├─ app.js                        # All client-side state, rendering, and API calls
│  ├─ session.js                    # Session-code generation, validation, localStorage helpers
│  └─ styles.css                    # CSS custom properties, dark mode, responsive layout
├─ api/                             # Azure Functions app
│  ├─ host.json                     # Functions host config (v2 extension bundle 4.x)
│  ├─ package.json                  # Runtime deps: @azure/data-tables, @azure/functions
│  ├─ local.settings.sample.json    # Template for local env vars (copy → local.settings.json)
│  └─ src/
│     ├─ index.js                   # Registers all HTTP functions via app.http(...)
│     ├─ functions/
│     │  ├─ logSwear.js             # POST /api/logSwear
│     │  ├─ todayStats.js           # GET  /api/todayStats
│     │  ├─ resetJar.js             # POST /api/resetJar
│     │  └─ summary.js             # GET  /api/summary  (legacy)
│     └─ lib/
│        ├─ tableClient.js          # Singleton Azure Table Storage client; auto-creates table
│        ├─ dateUtils.js            # UTC/LOCAL day-key helpers
│        └─ http.js                 # ok() / fail() response-shape helpers
├─ iac/
│  ├─ main.bicep                    # Bicep template — provisions all Azure resources
│  └─ README.md                     # IaC parameter reference and deploy commands
├─ staticwebapp.config.json         # SWA route rules and navigation fallback
├─ app.js                           # ⚠️ LEGACY prototype — do not use or edit
└─ .github/workflows/
   ├─ azure-static-web-apps-purple-forest-00c60bc0f.yml   # Primary CI/CD (push to main)
   └─ deploy-function-app.yml       # Disabled — standalone Function App deploy (reference only)
```

> **Note:** `app.js` at the repo root is a leftover prototype. All active frontend code lives in `frontend/`.

---

## Environment variables

Set these in `api/local.settings.json` for local development and in the Azure
portal (or via GitHub Secrets) for cloud deployments.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `FUNCTIONS_WORKER_RUNTIME` | Yes | — | Must be `node` |
| `AzureWebJobsStorage` | Yes | — | Functions host storage. Use `UseDevelopmentStorage=true` with Azurite locally |
| `AZURE_TABLES_CONNECTION_STRING` | Yes | — | Connection string for the Storage account holding the `SwearLogs` table |
| `SWEARJAR_TABLE_NAME` | No | `SwearLogs` | Table name. Created automatically on first use |
| `DATE_TIME_MODE` | No | `UTC` | `UTC` or `LOCAL`. Controls the timezone for the `YYYY-MM-DD` day-bucket partition key |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | No | — | Enables Application Insights telemetry in production |
| `DEPLOYMENT_STORAGE_CONNECTION_STRING` | No | — | Required for Flex Consumption Function App deployments |

**Never commit `api/local.settings.json`.** It is listed in `.gitignore`. Use the sample file as your template:

```bash
cp api/local.settings.sample.json api/local.settings.json
# Edit api/local.settings.json and fill in real values
```

`api/local.settings.sample.json` contents for reference:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_TABLES_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "SWEARJAR_TABLE_NAME": "SwearLogs",
    "DATE_TIME_MODE": "UTC"
  }
}
```

---

## Local development setup

### Prerequisites

- **Node.js 20+** — [download](https://nodejs.org/)
- **Azure Functions Core Tools v4** —
  `npm install -g azure-functions-core-tools@4`
- **Azurite** (local storage emulator) —
  `npm install -g azurite`, or use the VS Code Azurite extension
- **Static Web Apps CLI** (optional, for integrated routing) —
  `npm install -g @azure/static-web-apps-cli`

### Step-by-step

#### 1. Start the local storage emulator

```bash
azurite --silent --location /tmp/azurite --debug /tmp/azurite-debug.log &
```

Or start Azurite via the VS Code command palette: _"Azurite: Start"_.

#### 2. Install API dependencies

```bash
cd api
npm install
```

#### 3. Configure local settings

```bash
cp api/local.settings.sample.json api/local.settings.json
# Sample already points to UseDevelopmentStorage=true — no edits needed locally
```

#### 4. Start the Functions host

```bash
cd api
npm start          # alias for: func start
# API is now available at http://localhost:7071/api/*
```

#### 5. Serve the frontend

Open a second terminal:

```bash
# Option A — any static server
npx serve frontend
# Opens at http://localhost:3000

# Option B — SWA CLI (recommended: proxies /api/* automatically)
npx @azure/static-web-apps-cli start frontend --api-location api
# Opens at http://localhost:4280
```

#### 6. Smoke-test the API

```bash
# Log a swear
curl -X POST http://localhost:7071/api/logSwear \
  -H "Content-Type: application/json" \
  -d '{"userId": "BOLD-JAR-5432"}'

# Fetch today's stats
curl "http://localhost:7071/api/todayStats?userId=BOLD-JAR-5432"
```

---

## API reference

All responses share a common envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Failure
{ "success": false, "error": { "code": "STRING", "message": "Human-readable message" } }
```

### `POST /api/logSwear`

Logs one swear event for a user.

#### Request body

```json
{
  "userId": "BOLD-JAR-5432",
  "timestamp": "2024-06-15T14:30:00Z"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | string | Yes | The user's session code |
| `timestamp` | ISO-8601 string | No | Defaults to server time if omitted |

#### Response — 201 Created

```json
{
  "success": true,
  "data": {
    "id": "2024-06-15T14:30:00.000Z-550e8400-e29b-41d4-a716-446655440000",
    "partitionKey": "BOLD-JAR-5432|2024-06-15",
    "dayKey": "2024-06-15",
    "eventTimestamp": "2024-06-15T14:30:00.000Z"
  }
}
```

#### Error responses

| Status | Code | Cause |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Missing/empty `userId`, or invalid `timestamp` format |
| 500 | `INTERNAL_ERROR` | Storage write failure |

---

### `GET /api/todayStats?userId=<code>`

Returns today's count, the ten most recent events, and a 7-day trend array.

#### Query parameters

| Parameter | Required | Notes |
| --- | --- | --- |
| `userId` | Yes | The user's session code |

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "userId": "BOLD-JAR-5432",
    "todayKey": "2024-06-15",
    "todayCount": 3,
    "recentEvents": [
      "2024-06-15T14:30:00.000Z",
      "2024-06-15T11:15:00.000Z",
      "2024-06-15T09:02:00.000Z"
    ],
    "trend": [
      { "day": "2024-06-09", "count": 1 },
      { "day": "2024-06-10", "count": 0 },
      { "day": "2024-06-11", "count": 4 },
      { "day": "2024-06-12", "count": 2 },
      { "day": "2024-06-13", "count": 0 },
      { "day": "2024-06-14", "count": 5 },
      { "day": "2024-06-15", "count": 3 }
    ]
  }
}
```

`recentEvents` is sorted newest-first and capped at 10 items. `trend` always
contains exactly 7 entries (today plus the prior 6 days), with zero-filled gaps
for days with no activity.

---

### `POST /api/resetJar`

Permanently deletes **all** stored rows for a given `userId`. This action
is irreversible.

Request body:

```json
{ "userId": "BOLD-JAR-5432" }
```

Response — 200 OK:

```json
{
  "success": true,
  "data": { "deleted": 14 }
}
```

`deleted` is the number of table rows removed.

---

### `GET /api/summary` _(legacy)_

Kept for backward compatibility with older clients. Prefer `todayStats` for
new code.

#### Parameters

| Parameter | Required | Default | Notes |
| --- | --- | --- | --- |
| `userId` | Yes | — | The user's session code |
| `lookbackDays` | No | `180` | Maximum past days to include in `calendarDays` |

#### Example response

```json
{
  "success": true,
  "data": {
    "userId": "BOLD-JAR-5432",
    "timezoneMode": "UTC",
    "todayKey": "2024-06-15",
    "todayCount": 3,
    "lifetimeTotal": 47,
    "calendarDays": {
      "2024-06-14": 5,
      "2024-06-15": 3
    }
  }
}
```

`calendarDays` is a map of `YYYY-MM-DD` → count, limited to the most recent
`lookbackDays` days that have at least one event.

---

## Data model

SwearJar uses a single **Azure Table Storage** table (default name:
`SwearLogs`). Each row represents one swear event.

| Field | Example value | Notes |
| --- | --- | --- |
| `PartitionKey` | `BOLD-JAR-5432\|2024-06-15` | Groups events for one user-day. Format: `{userId}\|{YYYY-MM-DD}` |
| `RowKey` | `2024-06-15T14:30:00.000Z-<uuid>` | Unique per event. Format: `{isoTimestamp}-{uuid}` |
| `userId` | `BOLD-JAR-5432` | User's session code |
| `dayKey` | `2024-06-15` | Redundant date copy for query convenience |
| `eventTimestamp` | `2024-06-15T14:30:00.000Z` | ISO-8601 time of the event (client or server) |
| `recordedAt` | `2024-06-15T14:30:01.123Z` | ISO-8601 server time of the insert |

### Key design decisions

- The `{userId}|{YYYY-MM-DD}` partition key keeps all events for one user-day
  physically co-located, making per-day queries fast.
- The table is created automatically by `tableClient.js` on first use
  (HTTP 409 Conflict on re-create is silently ignored).
- **Do not change the partition key format.** Existing rows depend on it.
- Timezone bucketing (UTC vs. local) is controlled by `DATE_TIME_MODE`.
  Changing this after data has been written will misplace existing rows.

### Session codes

Session codes (`userId`) are generated client-side in `frontend/session.js`
using the pattern:

```text
{ADJECTIVE}-{NOUN}-{4-digit number}
```

For example: `SWIFT-COIN-7341`. Codes are validated against the regex
`/^[A-Z]{2,8}-[A-Z]{2,8}-\d{4}$/` before being accepted. They are stored in
`localStorage` under the key `swearjar:userId` and can be transferred to
another device by copying and entering the code manually.

---

## Deployment

### How it works

Deployment is fully automated via GitHub Actions. Every push to `main` triggers
the workflow at
`.github/workflows/azure-static-web-apps-purple-forest-00c60bc0f.yml`, which:

1. Checks out the repo.
2. Runs `npm ci` in the `api/` directory to install backend dependencies.
3. Deploys `frontend/` as the static site and `api/` as the managed Azure
   Functions API using the `Azure/static-web-apps-deploy@v1` action.

Pull requests to `main` create a **preview environment** (a temporary SWA
staging URL). The preview is torn down when the PR is closed.

### Required GitHub secrets

Configure these in your repository's **Settings → Secrets and variables →
Actions**:

| Secret | Description |
| --- | --- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PURPLE_FOREST_00C60BC0F` | Deployment token from your Azure Static Web App resource |
| `AZURE_TABLES_CONNECTION_STRING` | Connection string for the Azure Storage account |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights instrumentation string |
| `DEPLOYMENT_STORAGE_CONNECTION_STRING` | Storage connection string for Flex Consumption deployments |
| `SWEARJAR_TABLE_NAME` | Table name (e.g. `SwearLogs`). Optional — falls back to `SwearLogs` |
| `DATE_TIME_MODE` | `UTC` or `LOCAL`. Optional — falls back to `UTC` |

### Deploying for the first time

1. Create an **Azure Static Web App** resource in the Azure portal, linked to this GitHub repo and the `main` branch.
2. Azure automatically adds the `AZURE_STATIC_WEB_APPS_API_TOKEN_…` secret to your repository.
3. Add the remaining secrets listed above.
4. Push to `main` — the Actions workflow handles the rest.

### Post-deployment verification

```bash
# 1. Confirm the frontend loads at your SWA URL
curl https://<your-swa-url>/

# 2. Log a swear and confirm a 201 response
curl -X POST https://<your-swa-url>/api/logSwear \
  -H "Content-Type: application/json" \
  -d '{"userId": "BOLD-JAR-5432"}'

# 3. Confirm the row was written
curl "https://<your-swa-url>/api/todayStats?userId=BOLD-JAR-5432"
```

> **Note:** `deploy-function-app.yml` is disabled (manual trigger only) and
> kept for reference. The SWA workflow above is the canonical deployment path.

---

## Infrastructure as code

The `iac/main.bicep` Bicep template provisions all Azure resources for the
production environment:

| Resource | Type | Notes |
| --- | --- | --- |
| `swearjar` | Azure Static Web App (Free) | Serves the frontend; connects to GitHub |
| `swearjar` | Azure Function App (Flex Consumption · Linux · Node.js 22) | Hosts the API |
| `ASP-swearjar-9827` | App Service Plan (FC1 Flex Consumption) | Backing plan for the Function App |
| `swearjar9003` | Storage Account (Standard LRS) | Functions host storage + Table Storage |
| `swearlogs` | Table Storage table | One row per swear event |
| `swearjar` | Application Insights (workspace-based) | Telemetry, 90-day retention |
| `failure anomalies - swearjar` | Smart Detector Alert Rule | Fires on abnormal failure rate |

All resources deploy to **East US 2**. See `iac/README.md` for the full
parameter reference and deploy command.

```bash
az deployment group create \
  --resource-group <your-resource-group> \
  --template-file iac/main.bicep \
  --parameters \
      sites_swearjar_name=swearjar \
      staticSites_swearjar_name=swearjar \
      storageAccounts_swearjar9003_name=swearjar9003
```

---

## Coding conventions

### General

- **Node.js ≥ 20** required. Use `const`/`let` and `async`/`await`.
  No transpilation, no TypeScript.
- Prefer existing helpers — do not inline logic from `lib/http.js`,
  `lib/dateUtils.js`, or `lib/tableClient.js`.

### Azure Functions

- Use the **`@azure/functions` v4 SDK**. Register handlers via `app.http(...)`
  in `src/index.js`.
- Do **not** create `function.json` binding files — the v4 SDK replaces them.
- Always return responses through `ok()` / `fail()` from `lib/http.js`.
- Log errors with `context.error(...)`, not `console.error`.

```js
// ✅ correct
context.error('logSwear error', error);
return fail(500, 'INTERNAL_ERROR', 'Unable to log swear event.');

// ❌ avoid
console.error(error);
return { status: 500, body: JSON.stringify({ error: 'oops' }) };
```

### Frontend

- All API calls use **relative paths** (`/api/logSwear`, `/api/todayStats`).
  Never hardcode hostnames.
- Access DOM nodes through the `elements` map in `app.js`. Do not scatter
  `document.getElementById` calls.
- Mutate application state through the `state` object, then call
  `updateCounters()`, `updatePenalty()`, and `renderHistory()` to sync the UI.
- Handle API errors gracefully and always re-enable buttons in a `finally`
  block.

### Styles

- Use **CSS custom properties** defined in `:root` in `styles.css`. Do not
  use raw colour values.
- No CSS-in-JS, no preprocessors (Sass/Less). Plain CSS only.
- Responsive breakpoint is at `640px` — see the existing `@media` query
  in `styles.css`.
