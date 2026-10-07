import {createRemoteJWKSet, jwtVerify} from 'jose';
import {Env, HttpError} from '../../../shared/validation';
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export type Identity = {email:string;iat:number};
// iat (seconds) lets an admin end sessions: logins issued before a user's sessions_revoked_at are refused.
export async function identity(request: Request, env: Env): Promise<Identity> {
 const issuer = env.ACCESS_ISSUER; const audience = env.ACCESS_AUD;
 if (!issuer || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || issuer.includes('REPLACE') || !audience || audience.includes('REPLACE')) throw new HttpError(503, 'Access is not configured');
 const token = request.headers.get('Cf-Access-Jwt-Assertion'); if (!token || token.length > 16384) throw new HttpError(401, 'Cloudflare Access authentication required');
 try { let jwks = keys.get(issuer); if (!jwks) { jwks = createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')); keys.set(issuer,jwks); }
 const {payload} = await jwtVerify(token,jwks,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
 if (typeof payload.email !== 'string' || !payload.email.includes('@') || payload.email.length > 254 || typeof payload.iat !== 'number') throw new Error(); return {email:payload.email.trim().toLowerCase(),iat:payload.iat};
 } catch { throw new HttpError(401, 'Invalid Access identity'); }
}
