# Micropay SMS dashboard

Read-only Hebrew RTL dashboard. Two Cloudflare Workers share one D1 database. No SMS sending or delivery-report processing is included. Existing delivery-report integrations must remain unchanged.

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
```

Replace REPLACE_WITH_D1_DATABASE_ID in both Worker configurations with the same database ID, then run npm run db:migrate. Register normalized international system numbers and lowercase, trimmed user emails through D1 SQL. Multiple numbers per user and explicitly shared numbers are supported.

```sql
INSERT INTO system_numbers(number,label) VALUES ('+972501234567','Office');
INSERT INTO user_numbers(email,system_number) VALUES ('alice@example.com','+972501234567');
```

## Ingestion credentials

Create separate random tokens of at least 32 characters for incoming and outgoing producers. These are our ingestion secrets, NOT Micropay API account tokens. Set INGEST_CREDENTIALS_JSON as a Worker secret:

```sh
npx wrangler secret put INGEST_CREDENTIALS_JSON --config workers/ingest/wrangler.jsonc
```

```json
[
 {"token":"REPLACE_WITH_RANDOM_INCOMING_TOKEN","source":"micropay-office","direction":"in","numbers":["+972501234567"]},
 {"token":"REPLACE_WITH_RANDOM_OUTGOING_TOKEN","source":"workflow-office","direction":"out","numbers":["+972501234567"]}
]
```

Tokens are unique and explicitly scoped; no wildcard exists. Rotate tokens while retaining the source namespace for the same producer. Prefer Authorization: Bearer TOKEN. The vendor route optionally accepts a query parameter named hook_token ONLY when MICROPAY_ALLOW_URL_TOKEN is exactly true in the ingestion Worker's configuration. This is an application compatibility option, not a documented Micropay signature. Verify that the configured service or automation preserves the query parameter. Never reuse the Micropay account token. Redact query credentials from Cloudflare logs, analytics, traces and support captures before enabling this option; this repository does not configure platform log redaction. Outgoing and normalized routes remain header-only.

## Documented incoming callback

Dedicated route: GET or POST /hooks/micropay/incoming. POST accepts application/json or application/x-www-form-urlencoded. GET and forms must URL-encode free text; JSON must not URL-encode it. Bodies and GET query data are limited to 32 KiB. Duplicate form/query parameters, invalid encoding and mixed normalized/provider fields are rejected.

Field mapping:

| Micropay | Stored meaning |
| --- | --- |
| origsms | Full message body, including its keyword |
| phone | Customer/peer number |
| dest | Receiving system number |
| msgid | Stable incoming event ID, preserving leading zeros |

The adapter requires nonempty origsms and msgid; it never reconstructs full text from sms or code. cid, code, sms and net are not persisted. Local Israeli and digits-only international phone formats normalize to +country-number. If dest is absent, only a validated single-number credential may supply it. A supplied dest must pass credential scope and active-number checks. The documented callback has no timestamp, so occurrence time uses receipt time with time_source=receipt.

After successful persistence, GET/form callbacks return exactly HTTP 200 with OK. JSON callbacks return HTTP 200 with {"reply":""}. These responses request NO automatic reply SMS. Do not return the normalized ingestion response to a Dynamic Text service: arbitrary response text can become an SMS reply. Storage/authentication/validation errors return non-200 and never a false success; the documented Dynamic Text service may send its configured fixed error to the customer on non-200 responses.

Example, with a separately configured ingestion secret:

```sh
curl -X POST https://YOUR-INGEST-HOST/hooks/micropay/incoming \
 -H "Authorization: Bearer $INCOMING_TOKEN" \
 -H 'Content-Type: application/json' \
 --data '{"origsms":"שלום, אפשר פרטים?","phone":"0509876543","dest":"0501234567","msgid":"00705d38b642d5423","cid":"12762"}'
```

## Normalized events and outgoing logs

Existing POST /hooks/incoming and POST /events/outgoing still accept normalized JSON with header authentication:

```json
{"event_id":"stable-workflow-id","system_number":"+972501234567","peer_number":"+972509876543","body":"שלום","occurred_at":"2026-10-06T09:40:00Z"}
```

Outgoing logs additionally require submission_status: pending, accepted, rejected, or unknown. Reuse the same event ID for updates. Final accepted/rejected states cannot regress. Retry logging failures WITHOUT resending SMS. Incoming normalized events without stable IDs remain separate; upstream retries can duplicate them. No raw payloads are stored and routine errors do not expose SMS bodies or tokens.

shared/micropay-submission.ts interprets an existing scheduleSms response without issuing any API call. It checks message=OK AND numeric status=1 for JSON, recognizes documented plain OK/validate variants, and treats ambiguous responses as unknown. ERROR denotes rejection. task_id is a campaign ID, NOT an individual message ID: retain it in the sending workflow's metadata, not provider_message_id. Status=1 alone is insufficient, and queue acceptance is not delivery. Log every concrete recipient/body separately for batches or listjson; a campaign acknowledgement does not enumerate recipients, pool membership, or personalized bodies.

Deploy the configured ingestion Worker with npm run deploy:ingest. Do not change delivery-report URLs, add DLR ingestion, or automatically send SMS.

## Dashboard and operations

Set ACCESS_ISSUER to https://YOUR-TEAM.cloudflareaccess.com and ACCESS_AUD to your Access application's audience. Configure a custom hostname route protected by Access and an explicit user policy, then deploy using npm run deploy:dashboard. Dashboard workers.dev and preview URLs stay disabled. Every request verifies the JWT issuer, audience, signature and expiry; email headers and query parameters are not identities. Every message query enforces D1 assignments.

The UI groups loaded messages by system number and peer, supports server-side search/date filters and older-page cursors, and polls visible tabs every 45 seconds without overlapping requests. Updated-time/ID cursors capture changes to older outbound records. textContent rendering, nonce CSP and no-store responses are retained. Display timezone is Asia/Jerusalem; date filters currently use UTC calendar-day boundaries. Conversations reflect loaded pages, not an exhaustive conversation index.

Before production, run CI, resolve dependencies and commit a package-lock.json, verify Access failures on every hostname, instrument all outgoing workflows, define retention, monitor ingestion failures and D1/Workers quotas, and schedule protected exports with restoration tests. Manual/uninstrumented outgoing messages and historical imports remain absent.

```sh
npx wrangler d1 export sms-dashboard --remote --output=backups/sms.sql --config workers/ingest/wrangler.jsonc
```

Create the backups directory first. Exports contain SMS content. Deleting retained messages also deletes deduplication keys, so late replays can reinsert expired messages. No scheduled retention or backup automation is configured by this repository.
