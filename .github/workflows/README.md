# SwearJar workflows

Source of the adopted patterns: [`Gogorichielab/.github`](https://github.com/Gogorichielab/.github)
`workflow-templates/`, commit `6599d2688f322bb63a01452e032777d7c0bf6eb9` (merged as `dade354`).

These are **copied** templates, not `workflow_call` reusable workflows. Upstream template
changes do not propagate here; they arrive through a separate PR in this repository.

| Workflow | File | Template | Actions state |
| --- | --- | --- | --- |
| Azure Static Web Apps CI/CD | `azure-static-web-apps-purple-forest-00c60bc0f.yml` | `azure-static-web-apps.yml` | active |
| Maintenance | `maintenance.yml` | `stale-maintenance.yml` (stale job only) | disabled (inactivity) |
| Deploy Azure Function App | `deploy-function-app.yml` | — not adopted | active, `workflow_dispatch` only |
| Cleanup SWA Preview Environments | `cleanup-swa-preview-environments.yml` | — not adopted | disabled manually |

The last two are unchanged by the template adoption and keep their existing dry-run and
deletion limits. Editing a workflow file does **not** re-enable a disabled workflow; that is
a deliberate action in **Actions → *workflow* → Enable**.

## Azure Static Web Apps CI/CD

The filename is load-bearing: the SWA deployment token is bound to it. **Do not rename it.**

Repository-specific adaptations to the template:

- **Paths.** `app_location: frontend`, `api_location: api`, `output_location` empty,
  `skip_app_build: true`. The frontend is plain HTML/CSS/JS with no bundler, and the API is
  deployed as the SWA managed API. The template's `dist` default does not apply.
- **API prerequisite.** `cd api && npm ci` runs before deployment.
- **Token mapping.** Upload *and* close both use
  `AZURE_STATIC_WEB_APPS_API_TOKEN_PURPLE_FOREST_00C60BC0F`. Previously the close job used a
  generic `AZURE_STATIC_WEB_APPS_API_TOKEN` reference, which did not necessarily resolve to
  this app; preview cleanup could therefore target the wrong resource or silently no-op.
- **OIDC.** The template is token-only. This repository's SWA deployment also passes
  `github_id_token`, so the job keeps `id-token: write` and mints the token from the runner's
  `ACTIONS_ID_TOKEN_REQUEST_URL`. This replaces the previous `npm install @actions/core` plus
  `actions/github-script` steps — same token, no unpinned action dependencies.
- **Missing-token policy.** `skip_deploy_on_missing_secrets: true` is retained, and the
  template's `test -n "$SWA_TOKEN"` gate is adapted to warn and skip rather than fail, which
  preserves the behavior added in `ci(swa): skip build-and-deploy when SWA token is missing`.
- **Environments.** `production` on push to `main`, `preview` on pull requests.

### Preview deployments

Internal PR previews and their cleanup are gated on the repository variable
`SWA_ENABLE_PREVIEWS`. **It is intentionally unset, so previews are off.** Both jobs are
skipped until someone sets `SWA_ENABLE_PREVIEWS=true` (Settings → Secrets and variables →
Actions → Variables) after validating one internal PR's preview creation *and* closure.

Fork PRs and Dependabot PRs never reach either job and therefore never receive deployment
credentials. Do not switch these triggers to `pull_request_target`. Disabling previews does
not remove Azure preview environments that already exist — that is what
`cleanup-swa-preview-environments.yml` is for.

## Maintenance

Adopted from `stale-maintenance.yml`, with this repository's approved policy preserved:

- Issues: stale after **60** days, closed **7** days later. The starter disables issue aging
  entirely; SwearJar does not, so the starter's `-1` values were not copied.
- Pull requests: stale after **30** days, closed **7** days later.
- Labels `no-issue-activity` / `no-pr-activity` and the existing messages are unchanged.
  These labels must exist in the repository before enabling.
- Added from the template: `exempt-issue-labels` / `exempt-pr-labels`
  (`pinned,security,keep-open`) and `operations-per-run: 30`.

**Dry run first.** Run the workflow manually (`workflow_dispatch`) with `dry_run` left at its
default of `true`; that maps to the action's `debug-only` mode and changes nothing. Scheduled
runs additionally require the repository variable `STALE_AUTOMATION_ENABLED=true`, which is
intentionally unset.

Stale processing runs on the template's weekly Tuesday cron (`28 8 * * 2`); the daily cron
(`0 4 * * *`) now drives only `cleanup-branches`, matching the intent recorded in the previous
file's comments. Branch deletion is deliberately outside the template — its age, prefix, and
merged-status policy is repository-specific — and its script is unchanged.

## Rollback

Revert the adoption commit. Deployment resources, secret values, and branch protection are
untouched by this adoption and must not be changed as part of a rollback.
