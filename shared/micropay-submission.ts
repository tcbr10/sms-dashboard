export type SubmissionResult = {submission_status:'accepted'|'rejected'|'unknown';task_id?:string};
// Interpret an existing scheduleSms response only. This helper never sends SMS.
export function micropaySubmission(response:unknown):SubmissionResult {
 if(typeof response==='string'){const raw=response.trim();if(raw.startsWith('{')){try{return micropaySubmission(JSON.parse(raw));}catch{return {submission_status:'unknown'};}}
  const ok=/^OK(?:\s+(?:(?:\d+|VALID)\s+)?(\d+))?$/.exec(raw);if(ok)return {submission_status:'accepted',...(ok[1]?{task_id:ok[1]}:{})};
  if(/^ERROR(?:\s|$)/.test(raw))return {submission_status:'rejected'};return {submission_status:'unknown'};
 }
 if(!response||typeof response!=='object'||Array.isArray(response))return {submission_status:'unknown'};
 const r=response as {status?:unknown;message?:unknown;data?:{taskId?:unknown}};
 if(r.status===0&&r.message==='ERROR')return {submission_status:'rejected'};
 if(r.status!==1||r.message!=='OK')return {submission_status:'unknown'};
 const id=r.data?.taskId;return {submission_status:'accepted',...(typeof id==='string'&&id.length>0&&id.length<=256?{task_id:id}:{})};
}
