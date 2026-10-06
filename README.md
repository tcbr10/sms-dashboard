# Micropay SMS dashboard

Read-only Hebrew RTL dashboard, implemented from the supplied implementation plan. Two Cloudflare Workers share one D1 database. No SMS sending, delivery-report processing, administration UI, historical import, or vendor API calls are included. The existing delivery-report integration must remain unchanged.

## Deployment status

Source implementation, not a deployed or verified Micropay integration. Real provider request fields, escaping, authentication options, acknowledgements and retry behavior remain an integration gate. The incoming endpoint currently accepts our normalized JSON contract only; do not point Micropay at it until its automation has been verified and an adapter configured where necessary. No real credentials, users, numbers, or Cloudflare resource IDs are included. Tests must be run before production.

## Setup

Use Node 22 or later.

```sh
npm install
npm run typecheck
npm test
npx wrangler login
npx wrangler d1 create sms-dashboard
```

Replace `REPLACE_WITH_D1_DATABASE_ID` in both Worker configurations with the same returned ID.

```sh
npm run db:migrate
```

Add actual system numbers and assignments using D1 SQL. Always use normalized international numbers and lowercase, trimmed emails. Shared numbers are allowed. No example users are seeded automatically.

```sql
INSERT INTO system_numbers(number,label) VALUES ('+972501234567','Office');
INSERT INTO user_numbers(email,system_number) VALUES ('alice@example.com','+972501234567');
```

## Ingestion credentials

Generate distinct random tokens of at least 32 characters for incoming automation and outgoing workflows. Set the following JSON as the `INGEST_CREDENTIALS_JSON` Worker secret, not as a committed variable:

```sh
npx wrangler secret put INGEST_CREDENTIALS_JSON --config workers/ingest/wrangler.jsonc
```

```json
[
  {"token":"REPLACE_WITH_RANDOM_INCOMING_TOKEN","source":"micropay-office","direction":"in","numbers":["+972501234567"]},
  {"token":"REPLACE_WITH_RANDOM_OUTGOING_TOKEN","source":"workflow-office","direction":"out","numbers":["+972501234567"]}
]
```

Tokens must be unique. A source identifies a stable event namespace: during rotation keep the same source for the same producer and temporarily allow both tokens. Credentials must have explicit number scopes; there is no all-numbers wildcard. A single-number credential can supply the system number when the payload omits it.

POST JSON to `/hooks/incoming` or `/events/outgoing` with `Authorization: Bearer TOKEN`.

```json
{"event_id":"stable-id","system_number":"+972501234567","peer_number":"+972509876543","body":"שלום","occurred_at":"2026-10-06T09:40:00Z"}
```

Outgoing events additionally require `submission_status`: pending, accepted, rejected, or unknown. `provider_message_id` is optional. Reuse the same event ID for updates and retry failed logging without resending the SMS. Final accepted/rejected states cannot regress; unknown can resolve to a final state. Original content and occurrence time are preserved on updates. Event IDs are scoped by source and direction. Incoming events without stable IDs are retained separately, so upstream retries can produce duplicates. Success is returned only after persistence. Body size is limited to 32 KiB and message text to 10,000 JavaScript string units. Israeli local numbers normalize to +972; other countries require international format.

Deploy with `npm run deploy:ingest`. Configure and validate the actual incoming automation independently of the delivery-report integration. Verify Hebrew, newlines, punctuation, timeout, retries, acknowledgement and receiving-number attribution against a real request. If the provider requires form encoding, GET, URL tokens, or a different acknowledgement, implement and test that adapter first. Never log unredacted payloads or tokens.

## Dashboard authentication

Set `ACCESS_ISSUER` to `https://YOUR-TEAM.cloudflareaccess.com` and `ACCESS_AUD` to the Access application's audience. Configure a custom hostname route for this Worker in Cloudflare, then protect that entire hostname with an Access application and explicit user policy. Dashboard workers.dev and preview URLs are disabled. The Worker also verifies every Access JWT cryptographically against the issuer's JWKS, audience, expiration and required identity claims. It never trusts an email header or URL parameter.

Deploy with `npm run deploy:dashboard` after configuring the route, database and Access values. Test every reachable hostname, including API paths, with no JWT, a wrong application JWT, an expired JWT, and users with different assignments. Do not weaken authentication for local development; test data access through the automated suite or a properly protected development deployment.

## Dashboard behavior

The UI groups loaded messages by system number plus peer number. Search, system-number and date filters apply on the server. Older pages use occurrence-time/ID cursors; updates use updated-time/ID cursors, including changes to old outbound messages. Polling runs every 45 seconds in visible tabs and never overlaps requests. Bodies use textContent, with a nonce-based CSP and no external frontend assets. Responses are private and uncached. Conversations are derived from loaded pages, not an exhaustive conversation index. Date filters currently use inclusive/exclusive UTC calendar-day boundaries; displayed timestamps use Asia/Jerusalem.

## Operations and release checklist

- Run CI and commit a generated package-lock.json after dependency resolution; this initial repository has no lockfile and uses npm install.
- Verify Access JWT validation against the deployed Cloudflare application, including invalid signatures and wrong issuer/audience.
- Capture a real Micropay request and finalize the adapter before enabling forwarding.
- Confirm forwarding coexists with existing incoming processing; do not alter delivery reports.
- Instrument every relevant outbound workflow; manual/uninstrumented messages are absent.
- Define message and backup retention, authorized operators and monitoring before production.
- Monitor ingestion 4xx/5xx responses and Cloudflare/D1 usage. If upstream forwarding cannot retry, document the loss window and choose a recoverable source.
- Export D1 backups to protected storage and test restoration to a separate database before adopting a schedule. Backups contain SMS content.

Example export (create the local backups directory first):

```sh
npx wrangler d1 export sms-dashboard --remote --output=backups/sms.sql --config workers/ingest/wrangler.jsonc
```

Retention requires an explicit policy: deleting message rows also removes their deduplication keys, so late replays can reinsert old messages. Do not enable automated deletion without accounting for the upstream replay window. There is no scheduled retention or backup automation in this initial implementation.
