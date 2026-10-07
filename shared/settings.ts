import {HttpError} from './validation';
export type ContactField = {id:string;label:string};
export type Settings = {contact_fields:ContactField[];org_name:string;default_density:'wide'|'narrow'|'dense';refresh_seconds:number;max_recipients:number;default_daily_limit:number;optout_keywords:string[];optout_text:string;allow_international:boolean};
export const DEFAULT_SETTINGS: Settings = {contact_fields:[{id:'name',label:'שם'},{id:'id_number',label:'תעודת זהות'}],org_name:'',default_density:'narrow',refresh_seconds:5,max_recipients:500,default_daily_limit:1000,optout_keywords:['הסר','הסרה','STOP','UNSUBSCRIBE'],optout_text:'',allow_international:false};
export async function loadSettings(db: D1Database): Promise<Settings> {
 const rows = await db.prepare('SELECT key,value FROM settings').all<{key:string;value:string}>(); const stored: Record<string,unknown> = {};
 for (const r of rows.results) try { stored[r.key] = JSON.parse(r.value); } catch { /* ignore a corrupt value and keep the default */ }
 try { return validateSettings({...DEFAULT_SETTINGS, ...stored}); } catch { return {...DEFAULT_SETTINGS}; }
}
function int(value: unknown, name: string, min: number, max: number): number { if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new HttpError(400, name+' must be a whole number from '+min+' to '+max); return value as number; }
function str(value: unknown, name: string, max: number): string { if (typeof value !== 'string' || value.trim().length > max) throw new HttpError(400, name+' must be text of at most '+max+' characters'); return value.trim(); }
// Field IDs go into JSON paths and column IDs, so they are restricted to lowercase letters, digits and underscores.
function contactFields(value: unknown): ContactField[] {
 if (!Array.isArray(value) || value.length > 10) throw new HttpError(400,'contact_fields must be a list of up to 10 fields');
 const ids = new Set<string>();
 return value.map(f => { const v = f as Record<string,unknown>; if (!v || typeof v.id !== 'string' || !/^[a-z][a-z0-9_]{0,19}$/.test(v.id) || ids.has(v.id)) throw new HttpError(400,'Invalid contact field id'); ids.add(v.id); const label = str(v.label,'Contact field name',30); if (!label) throw new HttpError(400,'Contact field name is required'); return {id:v.id,label}; });
}
export function validateSettings(input: Record<string,unknown>): Settings {
 const keywords = input.optout_keywords; if (!Array.isArray(keywords) || keywords.length > 20) throw new HttpError(400,'optout_keywords must be a list of up to 20 words');
 const words = [...new Set(keywords.map(k => str(k,'Opt-out word',20)).filter(Boolean))];
 const density = input.default_density; if (density !== 'wide' && density !== 'narrow' && density !== 'dense') throw new HttpError(400,'Invalid default_density');
 if (typeof input.allow_international !== 'boolean') throw new HttpError(400,'allow_international must be true or false');
 return {contact_fields:contactFields(input.contact_fields),org_name:str(input.org_name,'org_name',60),default_density:density,refresh_seconds:int(input.refresh_seconds,'refresh_seconds',3,60),max_recipients:int(input.max_recipients,'max_recipients',1,5000),default_daily_limit:int(input.default_daily_limit,'default_daily_limit',0,100000),optout_keywords:words,optout_text:str(input.optout_text,'optout_text',120),allow_international:input.allow_international};
}
// A message opts out when, ignoring case, spaces and surrounding punctuation, it is exactly one of the keywords.
export function isOptOut(body: string, keywords: string[]): boolean { const t = body.trim().replace(/^[\s.,!?"'״׳-]+|[\s.,!?"'״׳-]+$/g,'').toLowerCase(); return t.length > 0 && keywords.some(k => k.toLowerCase() === t); }
