# swearjar

## Azure Static Web Apps notes

When calling the backend from the front end, use relative API paths so the app works in local development and in Azure Static Web Apps without hardcoded hostnames:

- `/api/logSwear`
- `/api/summary`

The repository includes `staticwebapp.config.json` with SPA navigation fallback and API route handling for `/api/*`.
