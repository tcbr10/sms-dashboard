import {micropaySubmission,SubmissionResult} from './micropay-submission';
// One call to Micropay's scheduleSms API, shared by dashboard sends and bot replies sent through the API.
// The result is never "accepted" unless Micropay said so; a timeout is "unknown" because the SMS may still have gone out.
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export const MICROPAY_SEND = 'https://www.micropay.co.il/extApi/scheduleSms.php';
// Micropay's examples use local Israeli numbers; other countries go as digits with the country code.
export const micropayNumber = (n: string) => n.startsWith('+972') ? '0' + n.slice(4) : n.slice(1);
export async function sendMicropay(fetcher: Fetch, token: string, m: {from:string;to:string[];body:string;desc:string}): Promise<SubmissionResult & {error:string|null}> {
 let result: SubmissionResult = {submission_status:'unknown'}; let error: string|null = null;
 try {
  const response = await fetcher(MICROPAY_SEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,from:micropayNumber(m.from),msg:m.body.replace(/\r?\n/g,'\r\n'),list:m.to.map(micropayNumber).join(','),desc:m.desc}),signal:AbortSignal.timeout(25000)});
  const raw = (await response.text()).slice(0,2000); if (response.ok) result = micropaySubmission(raw); if (result.submission_status !== 'accepted') error = ('HTTP '+response.status+' '+raw).slice(0,300);
 } catch { error = 'Micropay did not answer in time; the message may or may not have been sent'; }
 return {...result,error};
}
