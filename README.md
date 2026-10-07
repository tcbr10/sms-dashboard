# Micropay SMS dashboard

Hebrew RTL dashboard of SMS traffic, with manual sending by users an admin has authorized. Two Cloudflare Workers share one D1 database. Nothing is sent automatically, and no delivery-report processing is included. Existing delivery-report integrations must remain unchanged.

## Documentation basis and status

Adapted against the supplied offline Micropay documentation: incoming-SMS webhook (updated June 10, 2026), API conventions, send-SMS API and automation-trigger API. Source references: [incoming SMS](https://site.micropay.co.il/api/webhook-incoming-sms.php), [conventions](https://site.micropay.co.il/api/conventions.php), [send SMS](https://site.micropay.co.il/api/send-sms.php), [automation trigger](https://site.micropay.co.il/api/auto-webhook.php).

The documented incoming callback belongs to a Dynamic Text SMS service. It is not proof of the payload or acknowledgement used by an automation's outgoing HTTP action. The automation-trigger endpoint autoWebhook.php is the opposite direction: external systems invoke Micropay workflows. Do not call it to retrieve incoming SMS. Keep the planned incoming-automation forwarding approach; use the new adapter only if its forwarded fields match the documented callback, otherwise map to the normalized contract. Do not replace existing Dynamic Text services without verifying coexistence.

Code is not deployed or live-tested. Tests are included but must be run before production. No real account credentials, database IDs, numbers, or assignments are committed. Verify a real request, retries, timeouts, escaping and coexistence before enabling forwarding. The supplied webhook docs describe non-200 errors and technical email alerts, but do not establish a retry guarantee.

## Setup

Use Node 22 or later.

```sh
npm install
npm run typecheck
npm test
npx wrangler login
npx wrangler d1 create sms-dashboard
cp workers/dashboard/wrangler.jsonc.example workers/dashboard/wrangler.jsonc
cp workers/ingest/wrangler.jsonc.example workers/ingest/wrangler.jsonc
```

The copied wrangler.jsonc files are git-ignored because they hold account-specific values; only the .example files are committed. Replace REPLACE_WITH_D1_DATABASE_ID in both with the same database ID, then run npm run db:migrate. The other REPLACE_WITH values (Access settings and custom-domain hostnames) are covered below. Create the first admin and the first system number through D1 SQL; everything after that is managed on the dashboard's admin page. Emails are lowercase and trimmed; numbers are international.

```sql
INSERT INTO users(email,name,role,created_at) VALUES ('owner@example.com','Owner','admin',0) ON CONFLICT(email) DO UPDATE SET role='admin',active=1;
INSERT INTO system_numbers(number,label) VALUES ('+972501234567','Office');
```

## Ingestion secrets

The ingestion Worker is public and Micropay does not sign its callbacks, so every request must carry one of two secrets. These are our own secrets, NOT the Micropay account token. Generate each with `openssl rand -hex 32` (at least 32 characters are required) and store them as Worker secrets:

```sh
npx wrangler secret put INCOMING_TOKEN --config workers/ingest/wrangler.jsonc
npx wrangler secret put OUTGOING_TOKEN --config workers/ingest/wrangler.jsonc
```

- INCOMING_TOKEN authorizes incoming messages. Micropay can only be configured with a URL, so set the service's callback address to `https://YOUR-INGEST-HOST/hooks/micropay/incoming?token=INCOMING_TOKEN`.
- OUTGOING_TOKEN authorizes outgoing logs from your sending workflow.
- The normalized routes accept only an `Authorization: Bearer TOKEN` header; only the Micropay route also accepts `?token=`.

Treat the Micropay callback URL as a secret, since anything that records full URLs records the token. To rotate INCOMING_TOKEN, update the secret and the Micropay URL together; callbacks arriving in between fail, and Micropay may send its configured error SMS for them.

## Documented incoming callback

Dedicated route: GET or POST /hooks/micropay/incoming. POST accepts application/json or application/x-www-form-urlencoded. GET and forms must URL-encode free text; JSON must not URL-encode it. Bodies and GET query data are limited to 32 KiB. Duplicate form/query parameters, invalid encoding and mixed normalized/provider fields are rejected.

Field mapping:

| Micropay | Stored meaning |
| --- | --- |
| origsms | Full message body, including its keyword |
| phone | Customer/peer number |
| dest | Receiving system number |
| msgid | Stable incoming event ID, preserving leading zeros |

The adapter requires nonempty origsms and msgid; it never reconstructs full text from sms or code. cid, code, sms and net are not persisted. Local Israeli and digits-only international phone formats normalize to +country-number. dest is required and must be an active registered system number. The documented callback has no timestamp, so occurrence time uses receipt time with time_source=receipt.

After successful persistence, GET/form callbacks return exactly HTTP 200 with OK. JSON callbacks return HTTP 200 with {"reply":""}. These responses request NO automatic reply SMS. Do not return the normalized ingestion response to a Dynamic Text service: arbitrary response text can become an SMS reply. Storage/authentication/validation errors return non-200 and never a false success; the documented Dynamic Text service may send its configured fixed error to the customer on non-200 responses.

Example:

```sh
curl -X POST "https://YOUR-INGEST-HOST/hooks/micropay/incoming?token=$INCOMING_TOKEN" \
 -H 'Content-Type: application/json' \
 --data '{"origsms":"שלום, אפשר פרטים?","phone":"0509876543","dest":"0501234567","msgid":"00705d38b642d5423","cid":"12762"}'
```

## Normalized events and outgoing logs

POST /hooks/incoming (INCOMING_TOKEN) and POST /events/outgoing (OUTGOING_TOKEN) accept normalized JSON with header authentication. system_number is required:

```json
{"event_id":"stable-workflow-id","system_number":"+972501234567","peer_number":"+972509876543","body":"שלום","occurred_at":"2026-10-06T09:40:00Z"}
```

Outgoing logs additionally require submission_status: pending, accepted, rejected, or unknown. Reuse the same event ID for updates. Final accepted/rejected states cannot regress. Retry logging failures WITHOUT resending SMS. Incoming normalized events without stable IDs remain separate; upstream retries can duplicate them. No raw payloads are stored and routine errors do not expose SMS bodies or tokens.

shared/micropay-submission.ts interprets an existing scheduleSms response without issuing any API call. It checks message=OK AND numeric status=1 for JSON, recognizes documented plain OK/validate variants, and treats ambiguous responses as unknown. ERROR denotes rejection. task_id is a campaign ID, NOT an individual message ID: retain it in the sending workflow's metadata, not provider_message_id. Status=1 alone is insufficient, and queue acceptance is not delivery. Log every concrete recipient/body separately for batches or listjson; a campaign acknowledgement does not enumerate recipients, pool membership, or personalized bodies.

When an incoming message is exactly one of the opt-out words in the settings (default הסר, הסרה, STOP, UNSUBSCRIBE; case, spaces and surrounding punctuation are ignored), the sender is added to the opt-out list. A failure of this step is logged and never fails the ingestion.

Deploy the configured ingestion Worker with npm run deploy:ingest. Do not change delivery-report URLs, add DLR ingestion, or automatically send SMS.

## Dashboard and operations

Set ACCESS_ISSUER to https://YOUR-TEAM.cloudflareaccess.com and ACCESS_AUD to your Access application's audience. Set the dashboard hostname in routes, protect it with an Access application and an explicit user policy, then deploy using npm run deploy:dashboard. Dashboard workers.dev and preview URLs stay disabled. Every request verifies the JWT issuer, audience, signature and expiry; email headers and query parameters are not identities. The verified email must then belong to an active row in users, otherwise the dashboard shows a no-access page. Because the users table is the allowlist, the Access policy may admit any email that completes its login (for example One-time PIN for everyone); adding or removing a user on the admin page then takes effect immediately. Every message query enforces D1 assignments; admins see every active number.

The UI is a table of messages, 100 per page with more loaded on scroll. Each user chooses the visible columns (time, direction, customer, each contact field, system number, message, status, sender, receive time); the choice is saved per user and is the default for exports. Clicking a column header opens a menu to sort by that column and filter it: a time range (last hour, last 24 hours, today, 7 or 30 days, or custom dates with optional hours and minutes), several values (direction, status, system number), or "contains" text (customer, message, sender, contact fields). Active filters appear as chips with a per-filter clear and a clear-all; on phones a Filter and sort dialog offers the same controls. Sorting and filtering are server-side with keyset cursors (base64url of UTF-8 JSON, so contact values in Hebrew page correctly), and the filter state is kept in the page URL. The search box also matches contact data. Summary counts come from /api/stats for the same filter. Visible tabs poll every 5 seconds by default, background tabs every 30 seconds, without overlapping requests; updated-time/ID cursors pick up new messages and status changes. Each open tab therefore makes about 12 small D1 queries a minute. textContent rendering, nonce CSP and no-store responses are retained. Display timezone and date-filter day and time boundaries are Asia/Jerusalem. In a custom range, a time without a date means today, the end time includes its whole minute, and an end date without a time includes the whole day.

Export (any user) writes every message matching the current filters and sort to Excel (.xlsx) or CSV, with the chosen columns. The browser fetches up to 50,000 rows in pages of 500 (export=1) and builds the file itself; the first page records an export entry with the filters and columns in audit_log. CSV is UTF-8 with a byte-order mark, and cells that look like formulas are prefixed with '.

## Users, roles and the admin page

Admins (role admin) open /admin to manage users, system numbers, contacts, the opt-out list, settings and the activity log. Each user has a name, an active flag, an optional test number and, per system number, view or view-and-send access. Two more permissions apply to non-admins: sending to more than one recipient or from a file (can_bulk_send), and a limit on recipients per rolling 24 hours (daily_limit, or the default from settings). Admins see and may send from every active number without a daily limit. The system refuses to delete or demote the last active admin, and admins cannot remove their own rights. The users table marks users seen in the last two minutes as connected. Disconnect sets sessions_revoked_at: Access logins issued (JWT iat) before that moment are refused with a page asking the user to sign in again, and the admin can also disable the user in the same step. Every user can also sign out from the profile menu (the initials button in the header): POST /api/me/logout records user.logout in audit_log, then the browser goes to /cdn-cgi/access/logout, which ends the Access session on that device only. Every change, send and export is written to audit_log.

Contacts hold data per customer number in admin-defined fields (settings contact_fields; Name and ID number by default). Admins add, edit, delete and import them from CSV or Excel; the import matches file columns to fields by header name, repairs lost leading zeros, and either merges the file's non-empty values into existing contacts or skips existing ones. Users see contact data on the messages they can already see. Users with the can_edit_contacts permission (on by default, set per user on the admin page) and admins can also edit a customer's fields from a message's details (POST /api/contacts/save). Users may only edit customers that appear in messages on their active assigned numbers. The browser sends only the fields that changed, which are merged into the shared contact, so two people editing different fields don't overwrite each other; an empty value removes the field, and a contact left with no fields is deleted. Contact data such as ID numbers is personal information; exports that include it are recorded.

Settings: organization name, contact fields, default row spacing, live refresh interval (3 to 60 seconds), maximum recipients per send (up to 5,000), default daily limit, opt-out words, opt-out text appended to sends with more than one recipient, and whether non-Israeli recipients are allowed (off by default).

Message import (admins, tab "ייבוא הודעות") adds message history from an Excel or CSV file, for example messages that never arrived through the webhook. The browser guesses the columns from Hebrew or English headers (customer phone and message text are required; system number, date, separate time, direction, submission status and Micropay msgid are optional with defaults), reads dates day-first in Israel time (Excel date cells included), and previews the rows with each invalid row's reason. It uploads up to 12,000 rows per file in batches of 500 to /api/admin/imports/rows, after /api/admin/imports/start creates the import record. The server validates every row again (active registered system number, phone numbers, text up to 10,000 characters) and skips duplicates: a row with a msgid gets the same event key as the live webhook, and a row without one is skipped when the same number, customer, direction and text exists within 10 minutes of its time; its content-based key also makes uploading the same file again add nothing. Imported incoming replies that are exactly an opt-out word are added to the opt-out list. Imported messages carry import_id and show an "imported" tag. Undo (/api/admin/imports/undo) deletes exactly the messages one import added and leaves opt-outs in place. Nothing is ever sent. Each stored message costs about 8 rows written (the row and its indexes); the free plan allows 100,000 a day.

## Sending messages

Set the Micropay API token (created under account and sub-admin management, API tokens, with SMS permissions) as a dashboard secret. Without it, sending answers 503.

```sh
npx wrangler secret put MICROPAY_TOKEN --config workers/dashboard/wrangler.jsonc
```

POST /api/send takes {id, system_number, recipients, body}. The client generates the UUID id when the compose panel opens; the server claims it in the sends table before calling Micropay, so a retried or repeated request returns the earlier result and never sends twice. The server re-checks everything: send access to the number, bulk permission, maximum recipients, the 24-hour limit, valid and (unless allowed) Israeli numbers, duplicates, and the opt-out list. It then calls scheduleSms.php once with the system number as sender and the recipients in local format, interprets the answer with shared/micropay-submission.ts, and writes one outgoing message per recipient with sent_by and send_id. A timeout or unclear answer is recorded as unknown and never retried automatically. Accepted means Micropay queued the campaign, not that it was delivered. Writes to the dashboard (POST) must come from its own origin with a JSON body.

The compose panel accepts numbers separated by commas or new lines, a CSV, TXT or Excel .xlsx file (first worksheet; the column with the most phone numbers is chosen and can be changed), and distribution lists. Numbers that lost their leading zero in Excel are repaired. It shows recipients, invalid entries, characters and billed SMS (70 Hebrew characters for one SMS, 67 per part after that), and asks for a second confirmation before sending. A test send (test: true) goes to exactly one number, usually the user's saved test number, with the opt-out text a multi-recipient send would carry (bulk_preview); it counts toward the daily limit and is marked as a test.

Distribution lists (/api/lists) belong to one user and are private, except lists an admin marks as shared, which every user can see and use but only admins can edit. A list holds up to 10,000 numbers; the compose panel expands selected lists into recipients, and the server validates every number as usual.

## Production checklist and backups

Before production, run CI, resolve dependencies and commit a package-lock.json, verify Access failures on every hostname, instrument all outgoing workflows, define retention, monitor ingestion failures and D1/Workers quotas, and schedule protected exports with restoration tests. Manual/uninstrumented outgoing messages and historical imports remain absent.

```sh
npx wrangler d1 export sms-dashboard --remote --output=backups/sms.sql --config workers/ingest/wrangler.jsonc
```

Create the backups directory first. Exports contain SMS content. Deleting retained messages also deletes deduplication keys, so late replays can reinsert expired messages. No scheduled retention or backup automation is configured by this repository.
