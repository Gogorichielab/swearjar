# SwearJar — Infrastructure as Code

Bicep template (`main.bicep`) that provisions all Azure infrastructure backing the SwearJar application.

---

## Resources provisioned

| Resource | Type | SKU / Tier | Purpose |
|---|---|---|---|
| `swearjar` | Azure Static Web App | Free | Serves the static frontend; connected to the `main` GitHub branch via GitHub Actions |
| `ASP-swearjar-9827` | App Service Plan | FC1 Flex Consumption (Linux) | Backing plan for the Function App |
| `swearjar` | Azure Function App | Linux · Node.js 22 · Flex Consumption | Hosts the `/api/logSwear` and `/api/summary` HTTP functions |
| `swearjar9003` | Storage Account | Standard LRS · StorageV2 | Azure Functions host storage, deployment package storage, and Table Storage for swear-event data |
| `swearlogs` | Table Storage table (in `swearjar9003`) | — | App data: one row per swear event |
| `swearjar` | Application Insights | Workspace-based · 90-day retention | Request/dependency tracking, performance monitoring, error alerting |
| `failure anomalies - swearjar` | Smart Detector Alert Rule | Sev3 · 1-minute frequency | Fires when the rate of failed HTTP requests or dependency calls rises abnormally |
| _(multiple)_ | Application Insights Proactive Detection configs | — | Smart detection rules: slow response, dependency duration, exception spikes, memory leaks, security anomalies, trace severity, and others |

### Storage containers created inside `swearjar9003`

| Container | Purpose |
|---|---|
| `app-package-swearjar-*` | Deployment package for the Flex Consumption Function App |
| `azure-webjobs-hosts` | Azure Functions internal lease/lock storage |
| `azure-webjobs-secrets` | Azure Functions key storage |

---

## External dependencies

The following resources are **referenced** by this template but are **not created** by it. They must already exist in the subscription before deploying:

| Resource | Parameter |
|---|---|
| Log Analytics workspace (`DefaultWorkspace-*-EUS2`) | `workspaces_DefaultWorkspace_..._externalid` |
| Application Insights action group (for smart detection alerts) | `actiongroups_application_insights_smart_detection_externalid` |

---

## Parameters

All parameters have defaults matching the live deployment. Override them when deploying to a different environment.

| Parameter | Default | Notes |
|---|---|---|
| `sites_swearjar_name` | `swearjar` | Function App name |
| `staticSites_swearjar_name` | `swearjar` | Static Web App name |
| `components_swearjar_name` | `swearjar` | Application Insights name |
| `serverfarms_ASP_swearjar_9827_name` | `ASP-swearjar-9827` | App Service Plan name |
| `storageAccounts_swearjar9003_name` | `swearjar9003` | Storage Account name (must be globally unique) |
| `smartdetectoralertrules_failure_anomalies_swearjar_name` | `failure anomalies - swearjar` | Smart detector alert rule name |
| `actiongroups_application_insights_smart_detection_externalid` | _(required, no default)_ | Full Azure resource ID of the action group for alert notifications. Supply via `main.bicepparam`; never commit. |
| `logAnalyticsWorkspaceId` | _(required, no default)_ | Full Azure resource ID of the Log Analytics workspace. Supply via `main.bicepparam`; never commit. |
| `customDomainVerificationId` | `''` (optional) | Domain verification token. Leave empty to let Azure generate a fresh value. |

> **Why no defaults for the resource IDs?**
> Those values embed the Azure **subscription ID** and **resource group name**.
> Hardcoding them in source enables targeted reconnaissance of the tenant and
> leaks naming conventions for other resources. They are now required deploy-time
> inputs sourced from a gitignored `main.bicepparam` file.

---

## Deploy

1. Copy the sample parameter file and fill in the values for your subscription:

   ```bash
   cp iac/main.bicepparam.sample iac/main.bicepparam
   # edit iac/main.bicepparam — replace <SUBSCRIPTION_ID>, <RESOURCE_GROUP>, etc.
   ```

   `iac/main.bicepparam` is gitignored — keep it that way.

2. Deploy with the parameter file:

   ```bash
   az deployment group create \
     --resource-group <your-resource-group> \
     --template-file iac/main.bicep \
     --parameters iac/main.bicepparam
   ```

   You can also pass parameters individually with repeated `--parameters key=value`
   flags, but the parameter file keeps sensitive resource IDs out of your shell
   history.

---

## Notes

- All resources deploy to **East US 2**.
- Public network access is **disabled** on the Function App; it is only reachable via the Static Web App managed API proxy and Azure internal routing.
- FTP and SCM publishing credentials are **disabled** on the Function App.
- The Storage Account enforces **TLS 1.2 minimum**, has blob public access **disabled**, and does not allow cross-tenant replication.
- The Static Web App is on the **Free** tier; upgrade to Standard if custom domains or private endpoints are required.
