# Session handoff

Last updated 2026-10-22. Read this before changing or deploying anything. The repository is **public**: never commit secrets, emails, phone numbers, account or database IDs, Access values or hostnames. Those live only in the local config files described below.

## What this is

A Hebrew RTL dashboard of SMS traffic on the owner's Micropay numbers, with user management and manual sending by authorized users. Two Cloudflare Workers share one D1 database:

- **Ingest Worker** (`workers/ingest`). Receives Micropay's incoming-SMS callbacks and outgoing-message logs, and stores them in D1. It sits on its own custom domain; `workers.dev` and preview URLs are off.
- **Dashboard Worker** (`workers/dashboard`). Behind Cloudflare Access on its own custom domain. Every request verifies the Access JWT, then requires an active row in `users`; that table, not the Access policy, is the allowlist. Users see and send only from their assigned numbers; admins see every active number and manage everything at `/admin`.
- **Links Worker** (`workers/links`). The public short-link domain: redirects tracked links in sent messages and counts the clicks. No Access; it only reads and counts links.

The README documents setup, routes, field mapping and operations in detail.

## Current state

| Area | State |
| --- | --- |
| Code | `main` is pushed to GitHub. CI runs typecheck and tests on every push. |
| Dashboard | Deployed (version `1a924500`): sender IDs (admin tab, user permissions, compose choice), bot chats page, tracked links (compose checkbox, clicks column), scheduled sends, single-call personalized setting (off), message variables, view restrictions, export with one row per number, up to 20 contact fields with a manage-fields dialog, per-number bot reply method, webhook forwarding and bot tabs, number parsing with import reports, Access sync (token set, working), message import, read-usage fix, typed recent-hours filter, table with column choice and header filters (including hours), profile menu with sign-out, contact editing by users, row spacing, users and roles, admin page, contacts, export, disconnect, sending with test sends and distribution lists. Access protection verified: unauthenticated requests get 302 to the Access login. Sending answers 503 until `MICROPAY_TOKEN` is set. |
| Ingest | Deployed (version `e3fb6dde`) with sender IDs in scheduled sends, bot chat threads and bot notes on messages, tracked links in scheduled sends, scheduled sends on the cron, variables in bot replies, lenient JSON for Micropay automations (multi-line messages), bot replies through the response or Micropay's API, the two-secret auth, opt-out detection, bot replies, webhook forwarding and an every-minute cron for delivery retries. `INCOMING_TOKEN` and `OUTGOING_TOKEN` are set as Worker secrets. The owner holds the values; they are not stored anywhere in the repo. |
| Micropay | A Dynamic Text service on the owner's number posts JSON to `/hooks/micropay/incoming?token=<INCOMING_TOKEN>`. The owner confirmed it works after setup. |
| Links | Deployed (version `b2ebc367`, with the opt-out page) on its own subdomain of the owner's domain; `link_base` is set in Settings. Checked live: robots.txt, 404 for unknown codes, 302 and click counting on a temporary link (deleted). A tap from a phone has not been tried yet. |
| Links tab | Built, tested and checked in the local preview; **not deployed**. Needs `0014`, then the links Worker, ingest and the dashboard. |
| Sender IDs | Deployed 2026-10-23. `0013` rebuilt `opt_outs` with all 20 rows unchanged (a copy from before is in the git-ignored `backups/`). Checked live: the opt-out page asks and does not opt out on opening (temporary code, deleted). Still to do by the owner: set "טקסט קישור הסרה", then verify a number on the "זיהוי שולח" tab, which is the first real call to senderVerify.php. |
| Bot chats | Deployed 2026-10-23. `0012` filled 593 threads from past bot conversations. Opening the page reads about 190 rows on the live data (checked with the page's query). The page itself has not been opened by the owner yet. |
| D1 | `0001` to `0013` applied (`0014` waits for the links tab rollout). On 2026-10-07 the account hit the free plan's 5M rows read per day and D1 refused every query (including ingestion) until midnight UTC; after the fix, polls read 9–27 rows each and the database reads about 250K rows a day. One system number registered; the owner is an admin, and further users are managed on the admin page. |
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
| `workers/dashboard/src/data.ts` | `/api/stats`, `/api/messages`: joins contacts and sends, per-column filters, whitelisted sorts (including contact fields), keyset `cursor`, `since` sync, export paging and logging; scoped by role |
| `workers/dashboard/src/auth.ts` | Access JWT verification; returns the email and the login time (`iat`) |
| `workers/dashboard/src/admin.ts` | `/api/admin/*`: users (including disconnect), numbers, contacts (including import), settings, opt-outs, activity log |
| `workers/dashboard/src/lists.ts` | `/api/lists*`: private and admin-shared distribution lists |
| `workers/dashboard/src/contacts.ts` | `/api/contacts/save`: contact edits by admins and permitted users, merging only the changed fields |
| `workers/dashboard/src/imports.ts` | `/api/admin/imports*`: message import from spreadsheets (start, rows, undo), duplicate checks |
| `workers/dashboard/src/access.ts` | Cloudflare Access policy sync (active users' emails) |
| `shared/forwarding.ts` | Webhook deliveries: queue, signed request, retries (ingest cron) |
| `shared/micropay-send.ts` | One scheduleSms call, used by dashboard sends and API bot replies |
| `shared/template.ts` | Message variables ({field}, {field|default}, {טלפון}) for sends and bot replies |
| `shared/dispatch.ts` | Sending: prepareSend (permissions, recipients, variables, flow) and executeSend (opt-outs, daily limit, Micropay calls, records, bot state); used by the send button and scheduled sends |
| `shared/scheduled.ts` | Scheduled sends, run by the ingest cron one batch at a time |
| `shared/links.ts` | Tracked links: finding links (`findLinks`, and `LINKS_JS` for the browser, kept identical), codes, replacing links per recipient, classifying and counting clicks |
| `workers/links/src/index.ts` | Links Worker: `GET /<code>` redirect (SMS links via their group, then general links), click counting after the response, 404 page, robots.txt; `/x/<code>` opt-out page (GET asks, POST opts out) |
| `shared/records.ts` | audit() and sentLast24h(), shared by both Workers |
| `shared/bot.ts` | Bot engine: conversation state, option matching, replies, answers |
| `workers/dashboard/src/shortlinks.ts` | `/api/admin/links*` (admins only): general short links (create, edit, on/off, delete, 30-day counts) and the groups of links in sent messages (list, change destination) |
| `workers/dashboard/src/senders.ts` | `/api/admin/senders*` (admins only): Micropay senderVerify (code, verify), text names, who may use each sender ID, removal |
| `workers/dashboard/src/chats.ts` | `/api/chats` (threads, live updates by `since`), `/api/chats/counts` (by state, plus flows), `/api/chats/thread` (bot state, answers and flows of one chat); scoped like messages |
| `workers/dashboard/src/chats-page.ts` | Bot chats page: list, chat with the bot's tags and answer options, side panel, manual reply |
| `workers/dashboard/src/forwards.ts` | `/api/admin/forwards*`: rules, delivery log, test, resend |
| `workers/dashboard/src/flows.ts` | `/api/admin/flows*` (admins), `/api/bot/info` and `/api/bot/block` (users) |
| `workers/dashboard/src/scope.ts` | Which messages a user may see: assigned numbers plus per-number view restrictions; used by every message query |
| `workers/dashboard/src/send.ts` | `/api/send`: permission and limit checks, idempotent send ID, Micropay call, per-recipient rows |
| `workers/dashboard/src/ui.ts` | Shared CSS, header, icons and browser helpers (requests, popover menus, confirm dialog, CSV/Excel reader); the no-access and session-ended pages |
| `workers/dashboard/src/page.ts` | Messages page: columns and header menus, export (CSV and a small .xlsx writer), lists, compose panel with test sends |
| `workers/dashboard/src/admin-page.ts` | Admin page |
| `shared/validation.ts` | `Env`, phone and recipient normalization, body reading, cursors |
| `shared/settings.ts` | Settings defaults and validation, opt-out word matching (also used by ingest) |
| `migrations/` | `0001_initial.sql` schema; `0002_users_and_sending.sql` users, settings, opt-outs, sends, activity log; `0003_contacts_lists.sql` contacts, lists, user columns, test numbers, session revocation, test sends; `0004_user_contacts.sql` the per-user contact editing permission; `0005_read_indexes.sql` time and customer indexes; `0006_message_imports.sql` imports table and `messages.import_id`; `0007_forwarding_bot.sql` forwarding rules and deliveries, bot flows, conversations, answers and blocks; `0008_bot_reply_via.sql` per-number bot reply method; `0009_view_restrictions.sql` per-assignment view start and conditions; `0010_scheduled_sends.sql` scheduled sends; `0011_tracked_links.sql` links (WITHOUT ROWID, one written row per link), click columns on messages, `track_links` on scheduled sends; `0012_bot_threads.sql` bot chat threads (filled from existing bot messages, conversations and answers) and `messages.bot`; `0014_link_management.sql` link groups (one per send and address; `links.group_id`), general short links and their daily counts; `0013_senders.sql` sender IDs and their users, sender on sends, scheduled sends and messages, opt-out codes, and `opt_outs` rebuilt to allow the source `link` |
| `tests/workers.test.ts` | Miniflare D1 tests: ingest, isolation, table queries, access, admin, sending (fake Micropay) |
| `scripts/preview.ts` | Local preview with seeded data, live inserts, a fake Micropay and the links Worker on port 8792 (`npm run preview`; `PREVIEW_USER=agent@example.com` for a regular user) |

## Decisions and their reasons

- **Two plain secrets instead of a credential list.** Micropay's webhook is configured with a URL only (no headers, no signature), and there is one incoming and one outgoing producer. Only the Micropay route accepts `?token=`; the other routes need `Authorization: Bearer`.
- **`dest` is required.** Micropay always sends it, and only active registered `system_numbers` are accepted.
- **The Micropay route never returns reply text.** Any text it returns would be sent to the customer as an SMS. Errors return non-200, and Micropay may then send the customer its own error message, so don't break this route casually.
- **Sorting is server-side with per-sort keyset cursors.** Live sync merges rows changed since the last sync. Rows that sort past the last loaded page wait for "load more", and the status filter is re-applied in the browser because a status change can move a row out of it.
- **Polling every 5 s (30 s in background tabs).** That is about 12 small D1 queries a minute per open tab. D1 bills rows *read*, and the free plan allows 5M a day, so every polling query must seek in an index (check `npx wrangler d1 insights sms-dashboard --config workers/ingest/wrangler.jsonc --sort-by reads`). The test "D1 rows read" guards this.
- **Keyset cursors are written `expr >= t AND (expr > t OR id > n)`.** The equivalent `expr > t OR (expr = t AND id > n)` can't seek, and made each poll read the whole table. The access condition is `+m.system_number IN (…)`; the `+` keeps it from pulling queries onto the per-number index. Live-update queries use `INDEXED BY idx_messages_updates`.
- **Summary counts scan every matching message.** They run when the filters change and then at most every 10 minutes; in between the page adds new messages to the totals itself. The customer count updates only with the full count. These counts grow with history and are the main remaining read cost.
- **Real config values stay local** because the repo is public and the README forbids committing them.
- **No separate admin password.** Admins sign in like everyone else; the role lives in `users`. Removing a user or a role takes effect on the next request.
- **Send rights are per number**; bulk sending and a rolling 24-hour recipient limit are per user. Admins have no daily limit.
- **A send is never repeated.** The browser's UUID is claimed in `sends` before Micropay is called; timeouts become `unknown` and are not retried. A rejected send gets a new ID in the browser so the user can fix and resend.
- **Opt-outs** come from replies that are exactly an opt-out word (checked in ingest) and from admins. Micropay's own removal service doesn't reach this system.
- **Disconnect needs no Cloudflare API token.** The app refuses Access JWTs whose `iat` is before `users.sessions_revoked_at`; signing in again issues a new JWT.
- **Exports are built in the browser** from paged API calls (500 per page, 50,000 rows maximum), so the Worker never holds a whole export. Anyone can export what they can see; each export is logged.
- **Contact field IDs are restricted** to lowercase letters, digits and underscores because they are inlined in JSON paths and column IDs. Removing a field only hides it.
- **Sign-out from the profile menu ends only this device's session** (Cloudflare Access logout). It doesn't touch `sessions_revoked_at`, so other devices stay signed in; the admin's disconnect is still the way to end every session.
- **Contact data is shared, and users edit it with a merge.** Users with `can_edit_contacts` (default on) may edit customers that appear in messages on their numbers. Only changed fields are sent and merged with `json_patch`, so concurrent edits of different fields both survive. Other open tabs see the change after a reload, because contact edits don't touch `messages.updated_at`.
- **Hour filters are browser-only.** The server already filters by millisecond `from`/`to`; the page converts Israel wall-clock dates and times. "Last hour" and "24 hours" are recomputed on every request.
- **Message imports write one INSERT … SELECT per batch.** The free plan allows 50 queries per Worker request, so a statement per row would fail. The duplicate check inside it seeks `idx_messages_conversation_time`. Rows without a msgid get a content key (`[dir,'import',system,peer,time,sha256(body),n]`, where n separates identical rows of one file), which is why re-uploading a file adds nothing.
- **One phone parser, written twice.** `parseRecipient()` (server) and `PHONE_JS`/`parsePhone()` (browser) must stay identical; the "phone number parsing" test runs both on the same cases. `phone()`, used for Micropay's own numbers in ingest, stays lenient.
- **Access sync rewrites only email rules,** always the full list of active users, and never blocks a user change. The policy ID and account ID live only in the local `wrangler.jsonc`.
- **The bot answers through Micropay's webhook response,** which Micropay sends as an SMS from the same number. No API call or token is needed in ingest, but only messages that come through `/hooks/micropay/incoming` get replies. Bot errors are caught and mean "no reply"; they never fail the callback.
- **Forwarding runs after the response** (`ctx.waitUntil`) and its retries run on the ingest cron. Each delivery claims itself by pushing `next_at` a minute ahead, so the cron and an immediate try never send the same delivery at once. A cron run handles at most 10 deliveries because of the free plan's 50 queries per invocation.
- **The Micropay route repairs automation JSON.** Automations paste the message into their JSON template unescaped; raw control characters are escaped and, failing that, known fields are read by name (`lenientJson` in `micropay.ts`). Keep other routes strict.
- **Every message query must start from `scope()`** (scope.ts). It returns the user's visibility SQL, including view restrictions, and needs contacts joined as `c`. Unrestricted users keep the single `+m.system_number IN (…)` condition, so their queries are unchanged.
- **Personalized sends are batched by the browser (40 recipients)** because each distinct text is one Micropay call and the free plan allows 50 outgoing calls per request. Plain sends stay one call.
- **The ingest cron takes turns:** a due scheduled send (one batch) first, otherwise forwarding retries, because one invocation may make only 50 outgoing calls and 50 D1 queries on the free plan. Scheduled batches use send IDs `<id>:<offset>`, so a batch is never sent twice.
- **Clicks from a VPN or cloud network count as automatic.** A test with curl from the owner's Mac (whose traffic leaves through France) was counted as automatic, as designed; test with a phone on its normal connection.
- **micropay_listjson is unverified against the real API** until the owner sends a personalized test with it on. If Micropay rejects the format, turn the setting off; the per-text calls keep working.
- **Statements over many rows use `json_each`** (imports, flow starts, bot blocks) rather than one statement per row, for the same 50-query limit.
- **Lists are expanded in the browser** into recipients; the send endpoint stays the single place that validates and limits recipients.
- **Cursors are UTF-8 base64url**, because contact sort values can be Hebrew.
- **Bot chats read from a thread table, not from messages.** Building the list from messages on every poll would read far too much on the free plan. `bot_threads` holds one row per customer and number, touched by every message on it (ingest `store()`, bot replies, dashboard sends) and by bot blocks, so polls read only changed rows. The state (active, done, blocked, opted out) is derived when read. A thread's `updated_at` only moves forward, so live updates never miss a change in the same millisecond.
- **What the bot did is stored on the messages** (`messages.bot`), because the bot never recorded unrecognized replies or which question a message asks. Older messages have no note.
- **Sender IDs are managed by admins only, and assigned per user** (any number the user may send from). Replies to a sender ID don't reach this system, so it can't start a bot flow, and several recipients need a personal opt-out link: Israeli law requires a working way to refuse advertising, and "reply הסר" doesn't work there.
- **The opt-out link asks before it acts.** GET shows a button and only the POST opts out, because previews and scanners open links. One code per customer (`optout_codes`) keeps sends from writing a row per recipient.
- **No API lists Micropay's sender IDs,** so this system keeps its own list. A text name can't be approved through the API; its status comes from the first send.
- **A sent link's address lives on its group** (`link_groups`), not on each recipient's row, so changing where a send's links lead is one write, and the links tab reads groups instead of every recipient link. `links.url` keeps what was sent.
- **General links share the SMS link address** (the owner's choice) and are looked up after SMS codes. Their names are lowercase, so a random general code never matches a mixed-case SMS code by accident; a name is checked against both tables when it is created.
- **Tracked links are self-hosted** on a third Worker rather than a shortener service: each recipient needs a link of their own, and the services' free plans allow 5 to 25 links a month (Short.io about 1,000 in total). The links Worker is separate from ingest so public click traffic can never affect Micropay's route.
- **The short-link address is a D1 setting (`link_base`), not a Worker variable,** because both the dashboard (send button) and ingest (scheduled sends) create links. It also keeps the hostname out of the repo.
- **Clicks are written onto `messages`** (`clicks`, `auto_clicks`, `clicked_at`, plus `updated_at`), so the table and live polling read them without a join. The links table has no index besides its primary key; a per-send report (phase 2) will need one on `send_id`.
- **Automatic opens are counted apart from taps.** Previews and scanners open links without a person; see the README for the rules. They are a guess, which is why the table says "נפתח אוטומטית בלבד" rather than hiding them.
- **Tracked sends count as personalized** for batching, because each recipient's text differs. Without listjson that means one Micropay call per recipient, so `micropay_listjson` matters more once tracking is used.

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
npm run deploy:links
npx wrangler tail --config workers/ingest/wrangler.jsonc
npx wrangler d1 execute sms-dashboard --remote --config workers/ingest/wrangler.jsonc --command "SELECT ..."
```

## Micropay research (from the public docs)

- **One number can host several services, split by keyword** (the first word of the SMS, up to the first character that isn't a letter or digit). Each SMS goes to one service. Messages routed to data collection, SMS-to-email or auto-removal do **not** reach this system.
- **Data collection** stores replies inside Micropay (report or Excel export). Its docs describe no forwarding to a URL.
- **Automations** can be triggered by an incoming SMS to a number and can include an HTTP request step that calls an external URL. This is the way to combine Micropay logic with this dashboard. The step's payload format is not publicly documented. The Micropay route needs `origsms`, `phone`, `dest` and `msgid`; if the step has no unique message ID, the endpoint must be adapted. A generated ID would lose retry deduplication.

## Rollout of users, admin and sending

Order matters: the migration must exist before code that uses it, and the Access policy may only be opened after the user allowlist is live.

1. Done: applied `0002` (`npm run db:migrate`); existing assigned emails became regular users.
2. Done: made the owner an admin.
3. The owner creates a Micropay API token with SMS permissions and runs `npx wrangler secret put MICROPAY_TOKEN --config workers/dashboard/wrangler.jsonc`.
4. Done: deployed ingest (opt-out detection), then the dashboard.
5. In Zero Trust, change the dashboard Access policy to admit any email that completes One-time PIN, so users added on the admin page can sign in.
6. Send one test message to the owner's own phone and confirm the sender format Micropay accepts.

## Rollout of contacts, export and lists

1. Done: applied `0003` (adds tables and columns only).
2. Done: deployed the dashboard. Ingest is unchanged by this batch.
3. Owner: in the admin page, check the contact fields in Settings, then import contacts if wanted.

## Rollout of sign-out, hour filters and user contact editing

1. Done: applied `0004` (adds one column, default on) before deploying, because `loadUser` reads the new column.
2. Done: deployed the dashboard. Ingest is unchanged by this batch.
3. On the admin page, turn off "עריכת פרטי לקוחות" (edit contact details) for any user who shouldn't edit contacts.

## Rollout of the read-usage fix

1. Done: deployed the dashboard (works without the new indexes).
2. Done: applied `0005` (`idx_messages_time` for opening the table, `idx_messages_peer_time` for the conversation view).
3. Done: `wrangler d1 insights --time-period 3h` showed polls reading 9–27 rows. Note that `--time-period 1d` can return the previous day's stale aggregate.

## Rollout of message import

1. Done: applied `0005` and `0006` before deploying, because message queries now select `m.import_id`.
2. Done: deployed the dashboard. Ingest is unchanged.

## Rollout of number parsing and Access sync

1. The owner creates a Cloudflare API token with **Access: Apps and Policies - Edit** on this account and runs `npx wrangler secret put CF_API_TOKEN --config workers/dashboard/wrangler.jsonc`.
2. Done locally: `ACCESS_ACCOUNT_ID` and `ACCESS_POLICY_ID` are in the git-ignored `workers/dashboard/wrangler.jsonc`.
3. Done: deployed the dashboard (no migration). After the token is set, press "סנכרון עם Cloudflare" on the users tab and check the policy in Zero Trust.

## Rollout of webhook forwarding and the bot

1. Done: applied `0007` before deploying.
2. Done: deployed ingest (version `45db2a57`, cron `* * * * *`) (adds the bot replies and the every-minute cron trigger; the `triggers` entry is in the local `workers/ingest/wrangler.jsonc`), then the dashboard.
3. Build flows on the "בוט" tab (they start inactive) and forwarding rules on the "העברה ל-Webhook" tab. Send a test from a forwarding rule before relying on it.

## Rollout of bot replies through the API

Found on 2026-10-13: messages on the bot's number come from a Micropay automation, whose HTTP step discards the webhook's answer, so bot replies were logged but never sent. Micropay doesn't allow an automation and a Dynamic Text service on the same number.

1. Done: applied `0008` before deploying ingest.
2. Done: deployed ingest, then the dashboard.
3. The owner adds the Micropay API token to ingest: `npx wrangler secret put MICROPAY_TOKEN --config workers/ingest/wrangler.jsonc` (the same token the dashboard uses).
4. On the numbers tab, set the bot number's "תשובות הבוט נשלחות" to "דרך ממשק השליחה".

## Rollout of view restrictions

1. Done: applied `0009` before deploying.
2. Done: deployed the dashboard.

## Rollout of scheduled sends

1. Done: applied `0010`.
2. Done: deployed ingest, then the dashboard.
3. Optional: turn on "הודעות אישיות בקריאה אחת" in Settings after a personalized test send to the owner's phone works.

## Rollout of the links tab

1. Apply `0014` (`npm run db:migrate`) before deploying: sends write `link_groups` and `links.group_id`, and the links Worker reads them.
2. Deploy the links Worker, then ingest (scheduled sends), then the dashboard.
3. On the "קישורים" tab, create a test link and open it.

## Rollout of sender IDs

Steps 1 and 2 done on 2026-10-23.

1. Apply `0013` (`npm run db:migrate`) before deploying: sends write `sender_id` and `messages.sender`, and the migration rebuilds `opt_outs` (copying every row) to allow the source `link`.
2. Deploy the links Worker (opt-out page), then ingest (scheduled sends), then the dashboard.
3. In Settings, set "טקסט קישור הסרה" (for example `להסרה: {קישור}`).
4. Add your own number on the "זיהוי שולח" tab and verify it with the code. This also confirms the dashboard's Micropay token is allowed to use senderVerify.php.
5. Send a test with the sender ID to your phone, then a two-recipient test to check the opt-out link page.

## Rollout of bot chats

Done on 2026-10-23 except step 3.

1. Apply `0012` (`npm run db:migrate`) before deploying: ingest and the dashboard write `bot_threads` and `messages.bot`. The migration fills threads for existing bot conversations.
2. Deploy ingest, then the dashboard.
3. Open "שיחות בוט" and check that past bot conversations are listed.

## Rollout of tracked links

Done on 2026-10-22 except step 6.

1. Choose the short hostname. A subdomain of a domain already on this Cloudflare account is free (for example `l.` plus the domain); a new short domain costs about $10 a year. Every tracked link starts with it, and Hebrew SMS parts are 70 characters, so shorter is cheaper.
2. `cp workers/links/wrangler.jsonc.example workers/links/wrangler.jsonc` and fill in the database ID and the hostname. Never put an Access application on this hostname.
3. Apply `0011` (`npm run db:migrate`) before deploying anything, because sends now write the click columns.
4. Deploy the links Worker (`npm run deploy:links`), then ingest, then the dashboard. Open `https://<hostname>/robots.txt` and an unknown code to check it answers.
5. In Settings, set "כתובת הקישורים המקוצרים" to `https://<hostname>`.
6. Send a tracked test to your own phone, tap the link, and check the "לחיצות" column (add it from "עמודות").

## Micropay automation webhook

The existing route already works for an automation HTTP step: `POST /hooks/micropay/incoming` with `Content-Type: application/json`, `Authorization: Bearer <INCOMING_TOKEN>` and the body `{"origsms":"…","phone":"…","dest":"…","msgid":"…"}`, all as quoted strings. `dest` may be typed as fixed text. Caveats: `msgid` is required, and a message containing quotes or line breaks breaks the JSON if Micropay doesn't escape them (form-urlencoded is the fallback). If the same SMS also reaches Dynamic Text, it is stored once only when both send the same `msgid`. The owner will send a screenshot of the step's fields and variables; if there's no message-ID variable, add a header-only `/hooks/micropay/automation` route where `msgid` is optional.

## Open items

1. The owner is asking Micropay support two questions: can one incoming SMS trigger both an automation and a Dynamic Text service? And with keywords assigned, which service receives messages that match no keyword?
2. If an automation HTTP step is used, get a screenshot of its fields and map them to the Micropay route (or add a route for its format).
3. Messages sent from the dashboard are logged automatically. Any other sending system still needs to `POST /events/outgoing` with `OUTGOING_TOKEN` (format in the README).
4. Retention, backups and monitoring of ingestion failures are not configured (see the README).
5. An unused Access application from an earlier domain attempt remains in a different Cloudflare account. It's harmless and the owner can delete it.
