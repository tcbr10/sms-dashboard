export interface Env { DB: D1Database; INCOMING_TOKEN?: string; OUTGOING_TOKEN?: string; ACCESS_ISSUER?: string; ACCESS_AUD?: string; MICROPAY_TOKEN?: string; CF_API_TOKEN?: string; ACCESS_ACCOUNT_ID?: string; ACCESS_POLICY_ID?: string }
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export function failure(error: unknown): Response { return error instanceof HttpError ? json({error: error.message}, error.status) : json({error: 'Temporary service failure'}, 503); }
export function text(value: unknown, name: string, max: number): string { if (typeof value !== 'string' || !value.length || value.length > max) throw new HttpError(400, 'Invalid ' + name); return value; }
export function phone(value: unknown): string { let n = text(value, 'phone number', 64).replace(/[\s().-]/g, ''); if (/^00/.test(n)) n = '+' + n.slice(2); if (/^0\d{8,9}$/.test(n)) n = '+972' + n.slice(1); if (!/^\+[1-9]\d{7,14}$/.test(n)) throw new HttpError(400, 'Use an international phone number or an Israeli local number'); return n; }
export async function readBody(request: Request, max = 32768): Promise<Record<string, unknown>> {
 if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON required; provider adapter is not configured');
 const length = Number(request.headers.get('content-length')); if (length > max) throw new HttpError(413, 'Body too large');
 if (!request.body) throw new HttpError(400, 'Missing body');
 const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
 for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new HttpError(413, 'Body too large'); } chunks.push(value); }
 const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 try { const body: unknown = JSON.parse(new TextDecoder('utf-8', {fatal:true,ignoreBOM:false}).decode(bytes)); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); return body as Record<string, unknown>; } catch { throw new HttpError(400, 'Invalid JSON object'); }
}
// Recipients typed by people or imported from spreadsheets. Mirrors parsePhone() in the browser (PHONE_JS in ui.ts):
// strips invisible direction marks and punctuation, finds the number inside surrounding text, and accepts 972… with or
// without a plus (also with the 0 kept after 972), 00 prefixes and Israeli numbers whose leading zero was lost. Israeli
// numbers must have the right length for their prefix: 05x/07x have 10 digits, landlines 9.
export type PhoneProblem = 'empty'|'scientific'|'no_number'|'several'|'too_short'|'too_long'|'bad_prefix'|'bad_length';
export function parseRecipient(value: string): {number:string}|{problem:PhoneProblem} {
 const s = value.replace(/[­​-‏‪-‮⁦-⁩﻿]/g, '').trim(); if (!s) return {problem:'empty'};
 if (/^[0-9]+(?:[.,][0-9]+)?e\+?[0-9]+$/i.test(s)) return {problem:'scientific'};
 const runs = (s.match(/\+?\(?[0-9][0-9\s().\-]*[0-9]/g) || []).filter(r => r.replace(/[^0-9]/g, '').length >= 7);
 if (!runs.length) return {problem:/[0-9]/.test(s) ? 'too_short' : 'no_number'}; if (runs.length > 1) return {problem:'several'};
 let n = runs[0].replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, ''); if (n.startsWith('00')) n = '+' + n.slice(2);
 if (/^\+?9720/.test(n)) n = '+972' + n.replace(/^\+?9720/, ''); else if (/^972[0-9]/.test(n)) n = '+' + n;
 let national: string;
 if (n.startsWith('+972')) national = n.slice(4); else if (/^0[0-9]/.test(n)) national = n.slice(1); else if (/^[2-9][0-9]{7,8}$/.test(n)) national = n;
 else if (/^\+[1-9][0-9]{7,14}$/.test(n)) return {number:n};
 else { const d = n.replace('+', '').length; return {problem:d < 8 ? 'too_short' : d > 15 ? 'too_long' : 'bad_prefix'}; }
 const want = /^[57]/.test(national) ? 9 : /^[23489]/.test(national) ? 8 : 0; if (!want) return {problem:'bad_prefix'};
 if (national.length !== want) return {problem:national.length < want ? 'too_short' : 'bad_length'};
 return {number:'+972' + national};
}
export function recipient(value: unknown): string { const r = parseRecipient(text(value, 'recipient', 100)); if ('problem' in r) throw new HttpError(400, 'Invalid phone number ('+r.problem+')'); return r.number; }
export function timestamp(value: unknown, fallback: number): number { if (value === undefined) return fallback; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new HttpError(400, 'occurred_at must be an ISO timestamp with timezone'); const n = Date.parse(value); if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Invalid occurred_at'); return n; }
export type Cursor = {t: number | string; id: number};
// Cursors are base64url of UTF-8 JSON: text sort keys can be contact values in Hebrew, which btoa alone rejects.
export function encodeCursor(c: Cursor): string { let bin = ''; for (const b of new TextEncoder().encode(JSON.stringify(c))) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
// Text cursors carry a sort value of up to 200 characters; time and update cursors stay numeric.
export function decodeCursor(value: string | null, text = false): Cursor | undefined { if (!value) return undefined; if (value.length > 1200) throw new HttpError(400, 'Invalid cursor'); try { const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/')); const c = JSON.parse(new TextDecoder('utf-8', {fatal:true,ignoreBOM:false}).decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)))); if (!(text ? typeof c.t === 'string' && c.t.length <= 200 : Number.isSafeInteger(c.t) && c.t >= 0) || !Number.isSafeInteger(c.id) || c.id < 0) throw new Error(); return {t:c.t,id:c.id}; } catch { throw new HttpError(400, 'Invalid cursor'); } }
