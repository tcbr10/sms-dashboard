import {HttpError, phone, text} from '../../../shared/validation';

function params(raw: string): Record<string, unknown> {
 if (new TextEncoder().encode(raw).length > 32768) throw new HttpError(413, 'Payload too large');
 try { for (const part of raw.split('&')) for (const value of part.split('=')) decodeURIComponent(value.replace(/\+/g, ' ')); } catch { throw new HttpError(400, 'Invalid URL encoding'); }
 const result: Record<string, unknown> = {};
 for (const [key, value] of new URLSearchParams(raw)) { if (Object.hasOwn(result, key)) throw new HttpError(400, 'Duplicate parameter'); Object.defineProperty(result, key, {value, enumerable:true}); }
 return result;
}
async function rawText(request: Request): Promise<string> {
 if (Number(request.headers.get('content-length')) > 32768) throw new HttpError(413, 'Payload too large');
 if (!request.body) throw new HttpError(400, 'Missing body');
 const reader=request.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
 for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new HttpError(413,'Payload too large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes);}catch{throw new HttpError(400,'Invalid UTF-8');}
}
async function form(request: Request): Promise<Record<string, unknown>> { return params(await rawText(request)); }
// Micropay automations build the JSON body from a template and paste the message in unescaped, so a message with line
// breaks (or quotes) arrives as invalid JSON. Line breaks and other control characters inside strings are escaped
// first; if quotes still break it, the known Micropay fields are read by name. Valid JSON is used as it is.
const FIELDS=['origsms','phone','dest','msgid','cid','code','sms','net'];
function escapeControls(raw:string):string{let out='',inString=false,escaped=false;
 for(const ch of raw){if(!inString){if(ch==='"')inString=true;out+=ch;continue;}
  if(escaped){escaped=false;out+=ch;continue;}if(ch==='\\'){escaped=true;out+=ch;continue;}if(ch==='"'){inString=false;out+=ch;continue;}
  const c=ch.charCodeAt(0);out+=c>=0x20?ch:c===10?'\\n':c===13?'\\r':c===9?'\\t':'\\u'+c.toString(16).padStart(4,'0');}
 return out;}
function object(raw:string):Record<string,unknown>|null{try{const v:unknown=JSON.parse(raw);return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;}catch{return null;}}
// Each known field's value runs to the last quote before the next known field (or the closing brace).
function byField(raw:string):Record<string,unknown>|null{
 const marks:{key:string;start:number;value:number}[]=[];
 for(const key of FIELDS){const re=new RegExp('"'+key+'"\\s*:\\s*"','g');let m:RegExpExecArray|null;while((m=re.exec(raw)))marks.push({key,start:m.index,value:m.index+m[0].length});}
 marks.sort((a,b)=>a.start-b.start);if(!marks.length||new Set(marks.map(m=>m.key)).size!==marks.length)return null;
 const out:Record<string,unknown>={};
 for(let i=0;i<marks.length;i++){const end=i+1<marks.length?marks[i+1].start:raw.lastIndexOf('}');if(end<marks[i].value)return null;const part=raw.slice(marks[i].value,end);const q=part.lastIndexOf('"');if(q<0)return null;
  const text=part.slice(0,q);const decoded=object('{"v":"'+escapeControls('"'+text.replace(/(?<!\\)"/g,'\\"')).slice(1)+'"}');out[marks[i].key]=decoded?decoded.v:text;}
 return out;}
async function lenientJson(request: Request): Promise<Record<string, unknown>> {
 const raw=await rawText(request);const parsed=object(raw)??object(escapeControls(raw))??byField(raw);
 if(!parsed)throw new HttpError(400,'Invalid JSON object');return parsed;
}
function vendorPhone(value: unknown): string {const raw=text(value,'Micropay phone',64).replace(/[\s().-]/g,'');return phone(/^[1-9]\d{7,14}$/.test(raw)?'+'+raw:raw);}
export async function readMicropay(request: Request): Promise<{event:Record<string,unknown>;json:boolean}> {
 const url=new URL(request.url);let payload:Record<string,unknown>;let isJson=false;
 if(request.method==='GET'){payload=params(url.search.slice(1));}
 else if(request.method==='POST'){
  const type=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(type==='application/json'){payload=await lenientJson(request);isJson=true;}
  else if(type==='application/x-www-form-urlencoded'){payload=await form(request);}
  else throw new HttpError(415,'Use JSON or form-urlencoded');
  for(const key of ['origsms','phone','dest','msgid']) if(url.searchParams.has(key)) throw new HttpError(400,'Callback fields must be in the POST body');
 }else throw new HttpError(405,'GET or POST required');
 for(const key of ['event_id','system_number','peer_number','body','occurred_at','type','submission_status']) if(Object.hasOwn(payload,key)) throw new HttpError(400,'Use the correct ingestion route');
 const event:Record<string,unknown>={event_id:text(payload.msgid,'msgid',256),system_number:vendorPhone(payload.dest),peer_number:vendorPhone(payload.phone),body:text(payload.origsms,'origsms',10000)};
 return {event,json:isJson};
}
// With no reply text, Micropay sends nothing. Reply text is sent to the customer as an SMS from the same number.
export function micropayAcknowledgement(isJson:boolean,reply:string|null=null):Response {
 return new Response(isJson?JSON.stringify({reply:reply??''}):reply??'OK',{status:200,headers:{'Content-Type':isJson?'application/json; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
