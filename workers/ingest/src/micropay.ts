import {HttpError, phone, readBody, text} from '../../../shared/validation';

function params(raw: string): Record<string, unknown> {
 if (new TextEncoder().encode(raw).length > 32768) throw new HttpError(413, 'Payload too large');
 try { for (const part of raw.split('&')) for (const value of part.split('=')) decodeURIComponent(value.replace(/\+/g, ' ')); } catch { throw new HttpError(400, 'Invalid URL encoding'); }
 const result: Record<string, unknown> = {};
 for (const [key, value] of new URLSearchParams(raw)) { if (Object.hasOwn(result, key)) throw new HttpError(400, 'Duplicate parameter'); Object.defineProperty(result, key, {value, enumerable:true}); }
 return result;
}
async function form(request: Request): Promise<Record<string, unknown>> {
 if (Number(request.headers.get('content-length')) > 32768) throw new HttpError(413, 'Payload too large');
 if (!request.body) throw new HttpError(400, 'Missing body');
 const reader=request.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
 for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new HttpError(413,'Payload too large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new HttpError(400,'Invalid UTF-8');}
 return params(raw);
}
function vendorPhone(value: unknown): string {const raw=text(value,'Micropay phone',64).replace(/[\s().-]/g,'');return phone(/^[1-9]\d{7,14}$/.test(raw)?'+'+raw:raw);}
export async function readMicropay(request: Request): Promise<{event:Record<string,unknown>;json:boolean}> {
 const url=new URL(request.url);let payload:Record<string,unknown>;let isJson=false;
 if(request.method==='GET'){payload=params(url.search.slice(1));}
 else if(request.method==='POST'){
  const type=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(type==='application/json'){payload=await readBody(request);isJson=true;}
  else if(type==='application/x-www-form-urlencoded'){payload=await form(request);}
  else throw new HttpError(415,'Use JSON or form-urlencoded');
  for(const key of ['origsms','phone','dest','msgid']) if(url.searchParams.has(key)) throw new HttpError(400,'Callback fields must be in the POST body');
 }else throw new HttpError(405,'GET or POST required');
 for(const key of ['event_id','system_number','peer_number','body','occurred_at','type','submission_status']) if(Object.hasOwn(payload,key)) throw new HttpError(400,'Use the correct ingestion route');
 const event:Record<string,unknown>={event_id:text(payload.msgid,'msgid',256),system_number:vendorPhone(payload.dest),peer_number:vendorPhone(payload.phone),body:text(payload.origsms,'origsms',10000)};
 return {event,json:isJson};
}
export function micropayAcknowledgement(isJson:boolean):Response {
 return new Response(isJson?JSON.stringify({reply:''}):'OK',{status:200,headers:{'Content-Type':isJson?'application/json; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
