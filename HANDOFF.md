# Session handoff

Last updated 2026-10-06. Read this before changing or deploying anything. The repository is **public**: never commit secrets, emails, phone numbers, account or database IDs, Access values or hostnames. Those live only in the local config files described below.

## What this is

A read-only, Hebrew RTL dashboard of SMS traffic on the owner's Micropay numbers. Two Cloudflare Workers share one D1 database:

- **Ingest Worker** (`workers/ingest`). Receives Micropay's incoming-SMS callbacks and outgoing-message logs, and stores them in D1. It sits on its own custom domain; `workers.dev` and preview URLs are off.
- **Dashboard Worker** (`workers/dashboard`). Behind Cloudflare Access on its own custom domain. Every request verifies the Access JWT, and every query is limited to the numbers assigned to the signed-in email.

The README documents setup, routes, field mapping and operations in detail.

## Current state

| Area | State |
| --- | --- |
| Code | `main` is pushed to GitHub. CI runs typecheck and tests on every push. |
| Dashboard | Deployed (version `ace59d41`): table view with sorting, filters, stats and 5-second live updates. Access protection verified: unauthenticated requests get 302 to the Access login. |
| Ingest | Deployed (version `8c1f4340`) with the two-secret auth. `INCOMING_TOKEN` and `OUTGOING_TOKEN` are set as Worker secrets. The owner holds the values; they are not stored anywhere in the repo. |
| Micropay | A Dynamic Text service on the owner's number posts JSON to `/hooks/micropay/incoming?token=<INCOMING_TOKEN>`. The owner confirmed it works after setup. |
| D1 | Migrated. One system number registered and assigned to the owner's email. |
| Outgoing logging | Not wired yet. Nothing posts to `/events/outgoing`, so the dashboard shows incoming messages only. |

## Local-only state on the owner's machine

- **`workers/dashboard/wrangler.jsonc` and `workers/ingest/wrangler.jsonc` have uncommitted real values**: `database_id`, `ACCESS_ISSUER`, `ACCESS_AUD`, the custom-domain `routes`, and `workers_dev: false` / `preview_urls: false` on ingest. Deploys read them from the working tree. Keep them out of commits. The committed files hold placeholders.
- **Committing other changes in those files:** stage a sanitized copy instead of the working file (`git update-index --cacheinfo 100644,$(git hash-object -w <sanitized-file>),<path>`). Interactive `git add -p` isn't available to Claude.
- **Switching branches** fails while those edits differ from the target branch. Fast-forward without checkout (`git fetch . <branch>:main`) or stash first.
- **Wrangler auth:** a named auth profile is bound to this directory (`npx wrangler auth list`). Other profiles on the machine belong to other Cloudflare accounts; don't use them for this project. The custom domains, D1, both Workers and the Access app are all in the account this directory's profile uses.
- `.DS_Store` files are untracked; consider adding them to `.gitignore`.

## Code map

| Path | Role |
| --- | --- |
| `workers/ingest/src/index.ts` | Routes, `authorize()` (secret check), `store()` (validation, dedup on `[direction, event_id]`, D1 upsert) |
| `workers/ingest/src/micropay.ts` | Parses Micropay GET/form/JSON callbacks; no-reply acknowledgement (`OK` or `{"reply":""}`) |
| `workers/dashboard/src/index.ts` | Access JWT check, then the page or `/api/*`; nonce CSP |
| `workers/dashboard/src/data.ts` | `/api/numbers`, `/api/stats`, `/api/messages` (whitelisted sorts, filters, keyset `cursor`, `since` sync) |
| `workers/dashboard/src/page.ts` | Entire UI: CSS, HTML and browser JS in `String.raw` templates |
| `shared/validation.ts` | `Env`, phone normalization, body reading, cursors |
| `migrations/0001_initial.sql` | Schema |
| `tests/workers.test.ts` | Miniflare D1 tests for ingest, auth isolation and table queries |
| `scripts/preview.ts` | Local UI preview with seeded data and live inserts (`npm run preview`, port 8791) |

## Decisions and their reasons

- **Two plain secrets instead of a credential list.** Micropay's webhook is configured with a URL only (no headers, no signature), and there is one incoming and one outgoing producer. Only the Micropay route accepts `?token=`; the other routes need `Authorization: Bearer`.
- **`dest` is required.** Micropay always sends it, and only active registered `system_numbers` are accepted.
- **The Micropay route never returns reply text.** Any text it returns would be sent to the customer as an SMS. Errors return non-200, and Micropay may then send the customer its own error message, so don't break this route casually.
- **Sorting is server-side with per-sort keyset cursors.** Live sync merges rows changed since the last sync. Rows that sort past the last loaded page wait for "load more", and the status filter is re-applied in the browser because a status change can move a row out of it.
- **Polling every 5 s (30 s in background tabs).** That is about 12 small D1 queries a minute per open tab.
- **Real config values stay local** because the repo is public and the README forbids committing them.

## Working on the UI

- `page.ts` is three `String.raw` templates. Inside them, never use backticks or `${`. Backslashes are kept literally, but the current code avoids them anyway.
- The CSP allows only nonce'd `<script>`/`<style>`. Don't use `style="…"` attributes, external fonts or images. Setting styles through JS (`el.style.x`) and inline SVG markup are fine.
- Render untrusted text only with `textContent` or `append(string)`. `icon()` uses `innerHTML` with constant SVG strings only.
- To check the browser script's syntax, extract it from `page('n')` and run `node --check`.
- To see the UI: `npm run preview`, then open http://localhost:8791. The deployed dashboard can't be used locally because of Access. The preview depends on `vite-node`, which vitest installs.

## Commands

```sh
npm run typecheck && npm test
npm run preview
npm run deploy:dashboard
npm run deploy:ingest
npx wrangler tail --config workers/ingest/wrangler.jsonc
npx wrangler d1 execute sms-dashboard --remote --config workers/ingest/wrangler.jsonc --command "SELECT ..."
```

## Micropay research (from the public docs)

- **One number can host several services, split by keyword** (the first word of the SMS, up to the first character that isn't a letter or digit). Each SMS goes to one service. Messages routed to data collection, SMS-to-email or auto-removal do **not** reach this system.
- **Data collection** stores replies inside Micropay (report or Excel export). Its docs describe no forwarding to a URL.
- **Automations** can be triggered by an incoming SMS to a number and can include an HTTP request step that calls an external URL. This is the way to combine Micropay logic with this dashboard. The step's payload format is not publicly documented. The Micropay route needs `origsms`, `phone`, `dest` and `msgid`; if the step has no unique message ID, the endpoint must be adapted. A generated ID would lose retry deduplication.

## Open items

1. The owner is asking Micropay support two questions: can one incoming SMS trigger both an automation and a Dynamic Text service? And with keywords assigned, which service receives messages that match no keyword?
2. If an automation HTTP step is used, get a screenshot of its fields and map them to the Micropay route (or add a route for its format).
3. Wire the sending workflow to `POST /events/outgoing` with `OUTGOING_TOKEN` (format in the README).
4. Retention, backups and monitoring of ingestion failures are not configured (see the README).
5. An unused Access application from an earlier domain attempt remains in a different Cloudflare account. It's harmless and the owner can delete it.
