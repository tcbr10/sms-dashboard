export interface Env { DB: D1Database; INCOMING_TOKEN?: string; OUTGOING_TOKEN?: string; ACCESS_ISSUER?: string; ACCESS_AUD?: string }
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export function failure(error: unknown): Response { return error instanceof HttpError ? json({error: error.message}, error.status) : json({error: 'Temporary service failure'}, 503); }
export function text(value: unknown, name: string, max: number): string { if (typeof value !== 'string' || !value.length || value.length > max) throw new HttpError(400, 'Invalid ' + name); return value; }
export function phone(value: unknown): string { let n = text(value, 'phone number', 64).replace(/[\s().-]/g, ''); if (/^00/.test(n)) n = '+' + n.slice(2); if (/^0\d{8,9}$/.test(n)) n = '+972' + n.slice(1); if (!/^\+[1-9]\d{7,14}$/.test(n)) throw new HttpError(400, 'Use an international phone number or an Israeli local number'); return n; }
export async function readBody(request: Request): Promise<Record<string, unknown>> {
 if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON required; provider adapter is not configured');
 const max = 32768; const length = Number(request.headers.get('content-length')); if (length > max) throw new HttpError(413, 'Body too large');
 if (!request.body) throw new HttpError(400, 'Missing body');
 const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
 for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new HttpError(413, 'Body too large'); } chunks.push(value); }
 const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 try { const body: unknown = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); return body as Record<string, unknown>; } catch { throw new HttpError(400, 'Invalid JSON object'); }
}
export function timestamp(value: unknown, fallback: number): number { if (value === undefined) return fallback; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new HttpError(400, 'occurred_at must be an ISO timestamp with timezone'); const n = Date.parse(value); if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Invalid occurred_at'); return n; }
export type Cursor = {t: number; id: number};
export function encodeCursor(c: Cursor): string { return btoa(JSON.stringify(c)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function decodeCursor(value: string | null): Cursor | undefined { if (!value) return undefined; if (value.length > 128) throw new HttpError(400, 'Invalid cursor'); try { const c = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/'))); if (!Number.isSafeInteger(c.t) || c.t < 0 || !Number.isSafeInteger(c.id) || c.id < 0) throw new Error(); return {t:c.t,id:c.id}; } catch { throw new HttpError(400, 'Invalid cursor'); } }
