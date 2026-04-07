# SwearJar

SwearJar is an Azure Static Web Apps project with a static frontend and an Azure Functions backend that tracks daily and lifetime swear counts in Azure Table Storage.

## Project structure

Use (or align to) the following structure so local dev, deployment, and documentation stay consistent:

```text
swearjar/
├─ frontend/                  # Static site (HTML/CSS/JS or framework app)
│  ├─ index.html
│  └─ ...
├─ api/                       # Azure Functions app (Node/.NET/Python)
│  ├─ host.json
│  ├─ local.settings.json     # Local only; do not commit secrets
│  └─ <function-name>/
│     ├─ function.json
│     └─ ...
├─ .github/workflows/         # CI/CD workflow for Azure Static Web Apps
└─ README.md
```

> Current workflow note: `.github/workflows/azure-static-web-apps-purple-forest-00c60bc0f.yml` is currently configured with `app_location: "/"` and `api_location: ""`. If you move to `frontend/` + `api/`, update those values accordingly.

## Required environment variables

Configure these values for local development and in Azure (Static Web App / linked Function App settings).

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `TABLE_STORAGE_CONNECTION_STRING` | Yes | `DefaultEndpointsProtocol=...` | Connection string used by Functions to read/write Azure Table Storage. |
| `TABLE_STORAGE_TABLE_NAME` | Yes | `SwearEvents` | Table name that stores count entities. |
| `FUNCTIONS_WORKER_RUNTIME` | Yes (Functions) | `node` / `dotnet-isolated` / `python` | Selects runtime for Azure Functions. |
| `AzureWebJobsStorage` | Yes (Functions) | `UseDevelopmentStorage=true` or Azure Storage connection string | Required host storage account for Function triggers, logs, and runtime state. |
| `WEBSITE_RUN_FROM_PACKAGE` | Usually in Azure | `1` | Standard Azure Functions deployment setting (managed automatically in many deploy paths). |

### Where to set them

- **Local static app:** use your frontend tooling env file (for example `.env.local`) for non-secret UI config only.
- **Local Functions:** set values in `api/local.settings.json` under `Values`.
- **Azure:** set in Function App **Configuration > Application settings** (or SWA-linked API settings if managed there).

## Local development

### 1) Static site

1. Install dependencies (if using a framework):
   - `npm install`
2. Run the frontend dev server:
   - `npm run dev` (or equivalent for your stack)
3. Confirm the site loads (commonly `http://localhost:3000` or framework default).

### 2) Azure Functions API

1. Install Azure Functions Core Tools and your language runtime.
2. Create/update `api/local.settings.json` with required values.
3. Start the Functions host from the `api/` directory:
   - `func start`
4. Confirm API endpoints are live (commonly `http://localhost:7071/api/<route>`).

### 3) Run frontend + API together

- If using Azure Static Web Apps CLI, start both apps together for routed local testing:
  - `swa start <frontend-path> --api-location <api-path>`
- This helps validate auth headers, routes, and CORS behavior closer to Azure SWA runtime.

## Deployment notes (Azure Static Web Apps + linked Function App)

1. **Static Web App deployment**
   - Use the generated GitHub Actions workflow in `.github/workflows/`.
   - Set `app_location`, `api_location`, and `output_location` to match repo layout.

2. **Linked API behavior**
   - If using SWA-managed Functions, set `api_location` and keep API code in the same repo.
   - If using a separately hosted Function App, configure the frontend to call the Function App URL and ensure CORS/auth are aligned.

3. **Application settings**
   - Add `TABLE_STORAGE_CONNECTION_STRING`, `TABLE_STORAGE_TABLE_NAME`, and function runtime settings in Azure before first production requests.

4. **Secrets**
   - Store deployment tokens and connection strings in GitHub Secrets / Azure App Settings, never in source control.

## Data model (Azure Table Storage)

A practical model for swear counting uses two entity types in one table:

### Entity shapes

### 1) Daily aggregate entity
- `PartitionKey`: `user:{userId}` (or `global` for app-wide counter)
- `RowKey`: `day:{YYYY-MM-DD}` (UTC date)
- `count`: integer number of swears for that day
- `updatedAtUtc`: ISO timestamp

### 2) Running total entity
- `PartitionKey`: `user:{userId}` (or `global`)
- `RowKey`: `total`
- `count`: integer lifetime total
- `updatedAtUtc`: ISO timestamp

### Count computation flow

On each "swear" event:
1. Resolve current UTC day key (for example `2026-04-07`).
2. Upsert/increment daily entity `day:{YYYY-MM-DD}` by `+1`.
3. Upsert/increment total entity `total` by `+1`.
4. Return both values to the frontend (`dailyCount`, `totalCount`).

This keeps reads fast: one read for today + one read for lifetime (or return values after write).

## Troubleshooting

### Auth issues (401/403)

- Verify the request includes expected auth context (SWA auth headers or your custom token).
- Confirm route-level authorization settings in Functions (`authLevel`) match your client behavior.
- If using SWA roles, verify user role assignment and route rules.

### CORS issues

- In a standalone Function App, explicitly allow your frontend origin(s).
- Avoid wildcard + credentials combinations that browsers block.
- For local testing, ensure frontend and API URLs match what your CORS config expects.

### Connection string / table errors

- **`AuthenticationFailed` / `Forbidden`**: connection string key may be invalid or rotated.
- **`TableNotFound`**: verify `TABLE_STORAGE_TABLE_NAME` exists (or create on startup).
- **`ENOTFOUND` / DNS**: check storage account endpoint suffix and network/firewall rules.
- **Local mismatch**: ensure `local.settings.json` values are loaded by `func start` in the correct folder.

## Quick validation checklist

- Frontend can call `/api/...` successfully.
- Function logs show storage connection success.
- Table contains expected `PartitionKey`/`RowKey` entries.
- Daily and total counters both increment by exactly one per event.
