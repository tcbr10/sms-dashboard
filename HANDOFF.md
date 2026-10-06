# Session handoff

Last updated 2026-10-06. Read this before changing or deploying anything. The repository is **public**: never commit secrets, emails, phone numbers, account or database IDs, Access values or hostnames. Those live only in the local config files described below.

## What this is

A Hebrew RTL dashboard of SMS traffic on the owner's Micropay numbers, with user management and manual sending by authorized users. Two Cloudflare Workers share one D1 database:

- **Ingest Worker** (`workers/ingest`). Receives Micropay's incoming-SMS callbacks and outgoing-message logs, and stores them in D1. It sits on its own custom domain; `workers.dev` and preview URLs are off.
- **Dashboard Worker** (`workers/dashboard`). Behind Cloudflare Access on its own custom domain. Every request verifies the Access JWT, then requires an active row in `users`; that table, not the Access policy, is the allowlist. Users see and send only from their assigned numbers; admins see every active number and manage everything at `/admin`.

The README documents setup, routes, field mapping and operations in detail.

## Current state

| Area | State |
| --- | --- |
| Code | `main` is pushed to GitHub. CI runs typecheck and tests on every push. |
| Dashboard | Deployed (version `ace59d41`): table view with sorting, filters, stats and 5-second live updates. Access protection verified: unauthenticated requests get 302 to the Access login. **Not yet deployed:** row spacing, users and roles, the admin page and sending (see Rollout below). |
| Ingest | Deployed (version `8c1f4340`) with the two-secret auth. `INCOMING_TOKEN` and `OUTGOING_TOKEN` are set as Worker secrets. The owner holds the values; they are not stored anywhere in the repo. |
| Micropay | A Dynamic Text service on the owner's number posts JSON to `/hooks/micropay/incoming?token=<INCOMING_TOKEN>`. The owner confirmed it works after setup. |
| D1 | `0001` applied. One system number registered and assigned to the owner's email. `0002` (users, settings, opt-outs, sends, activity log) is not applied yet. |
| Outgoing logging | Not wired yet. Nothing posts to `/events/outgoing`, so the dashboard shows incoming messages only. |

## Local-only state on the owner's machine

- **`workers/dashboard/wrangler.jsonc` and `workers/ingest/wrangler.jsonc` are git-ignored** and exist only on the owner's machine. They hold the real `database_id`, `ACCESS_ISSUER`, `ACCESS_AUD` and custom-domain `routes`, and deploys read them. The committed `wrangler.jsonc.example` files are the templates. When a config setting changes (not a real value), update the matching `.example` file too.
- **Commits before `wrangler.jsonc` was ignored still track it with placeholders.** Checking one out will refuse to overwrite the local files, so move them aside first.
- **Wrangler auth:** a named auth profile is bound to this directory (`npx wrangler auth list`). Other profiles on the machine belong to other Cloudflare accounts; don't use them for this project. The custom domains, D1, both Workers and the Access app are all in the account this directory's profile uses.

## Code map

| Path | Role |
| --- | --- |
| `workers/ingest/src/index.ts` | Routes, `authorize()` (secret check), `store()` (validation, dedup on `[direction, event_id]`, D1 upsert) |
| `workers/ingest/src/micropay.ts` | Parses Micropay GET/form/JSON callbacks; no-reply acknowledgement (`OK` or `{"reply":""}`) |
| `workers/dashboard/src/index.ts` | Access JWT check, then `handle()`: user lookup, same-origin check for POSTs, routing; nonce CSP |
| `workers/dashboard/src/users.ts` | `loadUser`, numbers per user, 24-hour send usage, `/api/me`, preferences, `audit()` |
| `workers/dashboard/src/data.ts` | `/api/stats`, `/api/messages` (whitelisted sorts, filters, keyset `cursor`, `since` sync), scoped by role |
| `workers/dashboard/src/admin.ts` | `/api/admin/*`: users, numbers, settings, opt-outs, activity log |
| `workers/dashboard/src/send.ts` | `/api/send`: permission and limit checks, idempotent send ID, Micropay call, per-recipient rows |
| `workers/dashboard/src/ui.ts` | Shared CSS, header, icons and browser helpers; the no-access page |
| `workers/dashboard/src/page.ts` | Messages page and compose panel (including the CSV/Excel reader) |
| `workers/dashboard/src/admin-page.ts` | Admin page |
| `shared/validation.ts` | `Env`, phone and recipient normalization, body reading, cursors |
| `shared/settings.ts` | Settings defaults and validation, opt-out word matching (also used by ingest) |
| `migrations/` | `0001_initial.sql` schema; `0002_users_and_sending.sql` users, settings, opt-outs, sends, activity log |
| `tests/workers.test.ts` | Miniflare D1 tests: ingest, isolation, table queries, access, admin, sending (fake Micropay) |
| `scripts/preview.ts` | Local preview with seeded data, live inserts and a fake Micropay (`npm run preview`; `PREVIEW_USER=agent@example.com` for a regular user) |

## Decisions and their reasons

- **Two plain secrets instead of a credential list.** Micropay's webhook is configured with a URL only (no headers, no signature), and there is one incoming and one outgoing producer. Only the Micropay route accepts `?token=`; the other routes need `Authorization: Bearer`.
- **`dest` is required.** Micropay always sends it, and only active registered `system_numbers` are accepted.
- **The Micropay route never returns reply text.** Any text it returns would be sent to the customer as an SMS. Errors return non-200, and Micropay may then send the customer its own error message, so don't break this route casually.
- **Sorting is server-side with per-sort keyset cursors.** Live sync merges rows changed since the last sync. Rows that sort past the last loaded page wait for "load more", and the status filter is re-applied in the browser because a status change can move a row out of it.
- **Polling every 5 s (30 s in background tabs).** That is about 12 small D1 queries a minute per open tab.
- **Real config values stay local** because the repo is public and the README forbids committing them.
- **No separate admin password.** Admins sign in like everyone else; the role lives in `users`. Removing a user or a role takes effect on the next request.
- **Send rights are per number**; bulk sending and a rolling 24-hour recipient limit are per user. Admins have no daily limit.
- **A send is never repeated.** The browser's UUID is claimed in `sends` before Micropay is called; timeouts become `unknown` and are not retried. A rejected send gets a new ID in the browser so the user can fix and resend.
- **Opt-outs** come from replies that are exactly an opt-out word (checked in ingest) and from admins. Micropay's own removal service doesn't reach this system.

## Working on the UI

- `ui.ts`, `page.ts` and `admin-page.ts` hold CSS, HTML and browser JS in `String.raw` templates. Inside them, never use backticks or `${`. Backslashes are kept literally.
- The CSP allows only nonce'd `<script>`/`<style>`. Don't use `style="…"` attributes, external fonts or images. Setting styles through JS (`el.style.x`) and inline SVG markup are fine.
- Render untrusted text only with `textContent` or `append(string)`. `icon()` uses `innerHTML` with constant SVG strings only.
- To check browser script syntax, extract the `<script>` from `page('n')` and `adminPage('n')` and run `node --check`.
- To see the UI: `npm run preview`, then open http://localhost:8791 (signed in as a sample admin). The deployed dashboard can't be used locally because of Access. The preview depends on `vite-node`, which vitest installs.

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

## Rollout of users, admin and sending

Order matters: the migration must exist before code that uses it, and the Access policy may only be opened after the user allowlist is live.

1. Apply `0002`: `npm run db:migrate`. Existing assigned emails become regular users.
2. Make the owner an admin with the SQL in the README setup section.
3. The owner creates a Micropay API token with SMS permissions and runs `npx wrangler secret put MICROPAY_TOKEN --config workers/dashboard/wrangler.jsonc`.
4. Deploy ingest (opt-out detection), then the dashboard.
5. In Zero Trust, change the dashboard Access policy to admit any email that completes One-time PIN, so users added on the admin page can sign in.
6. Send one test message to the owner's own phone and confirm the sender format Micropay accepts.

## Open items

1. The owner is asking Micropay support two questions: can one incoming SMS trigger both an automation and a Dynamic Text service? And with keywords assigned, which service receives messages that match no keyword?
2. If an automation HTTP step is used, get a screenshot of its fields and map them to the Micropay route (or add a route for its format).
3. Messages sent from the dashboard are logged automatically. Any other sending system still needs to `POST /events/outgoing` with `OUTGOING_TOKEN` (format in the README).
4. Retention, backups and monitoring of ingestion failures are not configured (see the README).
5. An unused Access application from an earlier domain attempt remains in a different Cloudflare account. It's harmless and the owner can delete it.
