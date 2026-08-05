# CLAUDE.md — SwearJar

Instructions for Claude Code working in this repository.

> **Read [`AGENTS.md`](AGENTS.md) first.** It is the authoritative, tool-agnostic
> project brief — repo layout, API contracts, data model, coding conventions, and
> the explicit "do not do this" list. This file adds the Claude-specific bits and
> repeats only the rules that are easy to get wrong.

---

## Project overview

SwearJar is a personal accountability app: tap an animated jar to log a swear,
watch it fill with coins, and review daily/weekly history. Each user's data lives
under a shareable **session code** (`WORD-WORD-1234`), so a jar follows them
across devices and can be shared with a partner. Today's count × a configurable
fine shows what's owed.

- **Frontend:** plain HTML/CSS/JS in `frontend/` (`index.html`, `app.js`,
  `styles.css`). No build step.
- **API:** Azure Functions v4, Node ≥ 20, in `api/src/` — `functions/logSwear.js`
  (POST `/api/logSwear`), `functions/summary.js` (GET `/api/summary`), registered
  via `app.http(...)` in `api/src/index.js`.
- **Helpers:** `lib/tableClient.js` (singleton table client, auto-creates the
  table), `lib/dateUtils.js` (UTC/LOCAL day keys), `lib/http.js` (`ok()` / `fail()`).
- **Storage:** Azure Table Storage; `PartitionKey` = `{userId}|{YYYY-MM-DD}`,
  `RowKey` = `{isoTimestamp}-{uuid}`.
- **Hosting:** Azure Static Web Apps, deployed by the workflow on push to `main`.
- **IaC:** `iac/`. **Tests:** `tests/`.

### Non-negotiables

- Root-level `app.js` is **legacy**. All frontend work goes in `frontend/app.js`.
- Use the existing helpers — no second HTTP response helper, no inlined day-key
  math, no second table client.
- Keep `authLevel: 'function'`; never downgrade to `anonymous` without an explicit
  request. No wildcard CORS with credentials.
- Never commit `api/local.settings.json` or any real connection string.
- Don't rename `.github/workflows/azure-static-web-apps-purple-forest-00c60bc0f.yml`
  or edit it casually — the SWA deploy token is tied to the filename.
- Don't change the `PartitionKey` format; existing rows depend on it.
- No build/bundle step without also updating the workflow and
  `staticwebapp.config.json`.
- Log errors with `context.error(...)`, not `console.error`.
- All API responses go through `ok()` / `fail()`; the error shape is
  `{ success: false, error: { code, message } }`.

Local dev, `local.settings.sample.json`, and the `curl` smoke tests are in
[`AGENTS.md`](AGENTS.md#local-development-workflow).

---

## Commit conventions

**Every commit must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).**

```
<type>(<optional scope>): <imperative description>

<optional body explaining why>

<optional footers — Refs: #31, BREAKING CHANGE: ...>
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
  `ci`, `chore`, `revert`.
- Scopes used here: `frontend`, `api`, `functions`, `swa`, `iac`, `storage`,
  `auth`, `ui`, `docs`, `deps`.
- Imperative mood, no trailing period, subject ≤ 72 chars.
- Breaking = changed API response shape, changed key format, or renamed env var.
  Use `type(scope)!:` and/or a `BREAKING CHANGE:` footer.
- One logical change per commit; PR titles use the same format so squash merges
  stay valid. Leave Dependabot's generated titles alone.
- Security fixes get an ordinary `fix(scope): ...` subject — detail in the body,
  never credentials or exploit specifics in the message.

```
feat(frontend): add jar-switching from the settings dialog
fix(api): reject logSwear requests with a missing userId
ci(swa): skip build-and-deploy when the SWA token is missing
chore(deps): bump @azure/data-tables to 13.3.1
```

Full type table and more examples: [`AGENTS.md`](AGENTS.md#commit-conventions--conventional-commits).

---

## Skills to use

| Skill pack | Install (Claude Code) | Use it for |
|---|---|---|
| [ponytail](https://github.com/DietrichGebert/ponytail) | `/plugin marketplace add DietrichGebert/ponytail` then `/plugin install ponytail@ponytail` (two separate prompts) | Default posture for all code work — reuse `lib/http.js`, `lib/dateUtils.js`, `lib/tableClient.js` instead of adding siblings. `/ponytail-review` the diff before every PR. |
| [marketing skills](https://github.com/coreyhaines31/marketingskills) | `/plugin marketplace add coreyhaines31/marketingskills` then `/plugin install marketing-skills` — or `npx skills add coreyhaines31/marketingskills` | Onboarding and session-code copy, jar reactions, empty states, reset warnings, README presentation. Playful, never scolding. |
| [business analysis skills](https://github.com/45ck/business-analysis-skills) | `git clone https://github.com/45ck/business-analysis-skills.git && cd business-analysis-skills && bash install.sh` | Day-bucket and shared-jar rules (`DATE_TIME_MODE`, midnight, travel, two people on one code). `/business-rule-extraction` + acceptance criteria before touching key formats or aggregation. |

Ponytail's minimalism never licenses lowering `authLevel`, widening CORS, or
skipping validation — those are explicit prohibitions in `AGENTS.md`.

Order of operations: **frame** (business analysis) → **draft copy** (marketing) →
**build** (ponytail) → **verify with the local `curl` checks** → **commit**
(Conventional Commits).

Handy commands: `/ponytail-review`, `/ponytail-audit`, `/business-problem-framing`,
`/business-rule-extraction`, `/acceptance-criteria-writer`,
`/requirements-quality-check`.

Details, non-Claude install paths, and per-skill guidance: [`AGENTS.md`](AGENTS.md#skills-to-use).
