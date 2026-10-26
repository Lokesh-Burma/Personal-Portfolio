import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CognitoJwtVerifier } from "aws-jwt-verify";
export const OWNER_COOKIE = "__Host-platform_owner";
export const FLOW_COOKIE = "__Host-platform_login";
export const OWNER_SESSION_SECONDS = 900;
export type AuthConfig = { pool: string; client: string; domain: string; origin: string; owner: string; email: string; secret: string };
export function authConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const pool=env.COGNITO_USER_POOL_ID || "",client=env.COGNITO_CLIENT_ID || "",owner=env.TECHCANVAS_OWNER_SUBJECT || "",email=env.ADMIN_EMAIL || "",secret=env.ADMIN_SESSION_SECRET || env.SESSION_SECRET || "";
  const domain=new URL(env.COGNITO_LOGIN_DOMAIN || "https://invalid.example"),origin=new URL(env.SITE_ORIGIN || "https://invalid.example");
  if (!/^ap-southeast-2_[a-zA-Z0-9]+$/.test(pool) || !/^[a-z0-9]{1,128}$/.test(client) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner) || !email || secret.length<32) throw new Error("Owner authentication is not configured.");
  if(domain.protocol!=="https:" || !/^[a-z0-9-]+\.auth\.ap-southeast-2\.amazoncognito\.com$/.test(domain.hostname) || domain.port || domain.username || domain.password || domain.pathname!=="/" || domain.search || domain.hash)throw new Error("Invalid Cognito domain.");
  if(origin.protocol!=="https:" || origin.hostname==="invalid.example" || origin.port || origin.username || origin.password || origin.pathname!=="/" || origin.search || origin.hash)throw new Error("An HTTPS site origin is required.");
  return {pool,client,domain:domain.origin,origin:origin.origin,owner,email,secret};
}
export function safeReturnTo(value: string | null | undefined) { return ["/","/admin","/techcanvas/studio"].includes(value || "") ? value! : "/admin"; }
const sign=(s:string,c:AuthConfig)=>createHmac("sha256",c.secret).update(s).digest("base64url");
type Flow={state:string;nonce:string;verifier:string;created:number;returnTo:string};
export function beginLogin(c:AuthConfig,returnTo?:string|null,now=Date.now()) {
  const random=()=>randomBytes(32).toString("base64url");
  const flow:Flow={state:random(),nonce:random(),verifier:random(),created:now,returnTo:safeReturnTo(returnTo)};
  const encoded=Buffer.from(JSON.stringify(flow)).toString("base64url");
  const url=new URL("/oauth2/authorize",c.domain);
  url.search=new URLSearchParams({response_type:"code",client_id:c.client,redirect_uri:c.origin+"/api/auth/callback",scope:"openid email techcanvas/access",state:flow.state,nonce:flow.nonce,code_challenge_method:"S256",code_challenge:createHash("sha256").update(flow.verifier).digest("base64url")}).toString();
  return {url:url.href,cookie:encoded+"."+sign(encoded,c)};
}
export function consumeFlow(cookie:string|undefined,state:string|null,c:AuthConfig,now=Date.now()):Flow {
  if(!cookie || cookie.length>2048 || !state)throw new Error("Invalid sign-in flow.");
  const parts=cookie.split(".");if(parts.length!==2)throw new Error("Invalid sign-in flow.");
  const expected=Buffer.from(sign(parts[0],c)),actual=Buffer.from(parts[1]);
  if(expected.length!==actual.length || !timingSafeEqual(expected,actual))throw new Error("Invalid sign-in flow.");
  const f=JSON.parse(Buffer.from(parts[0],"base64url").toString());
  if(typeof f.state!=="string" || typeof f.nonce!=="string" || typeof f.verifier!=="string" || !/^[\w-]{43}$/.test(f.state) || !/^[\w-]{43}$/.test(f.nonce) || !/^[\w-]{43}$/.test(f.verifier) || f.state!==state || !Number.isSafeInteger(f.created) || f.created>now || now-f.created>600000 || f.returnTo!==safeReturnTo(f.returnTo))throw new Error("Invalid sign-in flow.");
  return f;
}
export function createOwnerVerifiers(c:AuthConfig) {
  return {access:CognitoJwtVerifier.create({userPoolId:c.pool,clientId:c.client,tokenUse:"access",scope:"techcanvas/access"}),id:CognitoJwtVerifier.create({userPoolId:c.pool,clientId:c.client,tokenUse:"id"})};
}
let cached: {config:string;verifiers:ReturnType<typeof createOwnerVerifiers>}|undefined;
function verifiers(c:AuthConfig) { const key=c.pool+":"+c.client;if(cached?.config!==key)cached={config:key,verifiers:createOwnerVerifiers(c)};return cached!.verifiers; }
export async function verifyOwnerAccess(token:string,c:AuthConfig,v=verifiers(c),now=Math.floor(Date.now()/1000)) {
  if(typeof token!=="string" || token.length>3800)throw new Error("Invalid owner session.");
  const claims=await v.access.verify(token);
  if(claims.sub!==c.owner || !Number.isSafeInteger(claims.iat) || claims.iat>now || claims.iat+OWNER_SESSION_SECONDS<=now)throw new Error("Invalid owner session.");
  return {email:c.email,sub:claims.sub,exp:Math.min(claims.exp,claims.iat+OWNER_SESSION_SECONDS),authMethod:"cognito" as const};
}
export async function exchangeCode(code:string,flow:Flow,c:AuthConfig,options:{fetcher?:typeof fetch;verifiers?:ReturnType<typeof createOwnerVerifiers>}={}) {
  if(!code || code.length>4096)throw new Error("Invalid authorization response.");
  const response=await (options.fetcher || fetch)(new URL("/oauth2/token",c.domain),{method:"POST",redirect:"error",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:c.client,redirect_uri:c.origin+"/api/auth/callback",code,code_verifier:flow.verifier}),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error("Sign-in exchange failed.");
  const reader=response.body?.getReader();if(!reader)throw new Error("Missing authorization response.");const chunks=[];let bytes=0;
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>24000){await reader.cancel();throw new Error("Oversized authorization response.");}chunks.push(value);}
  const tokens=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if(tokens.token_type?.toLowerCase()!=="bearer" || typeof tokens.access_token!=="string" || typeof tokens.id_token!=="string" || tokens.id_token.length>12000)throw new Error("Invalid authorization response.");
  const v=options.verifiers || verifiers(c),id=await v.id.verify(tokens.id_token);
  if(id.sub!==c.owner || id.nonce!==flow.nonce || id.email!==c.email || id.email_verified!==true)throw new Error("This is not the configured owner.");
  const session=await verifyOwnerAccess(tokens.access_token,c,v);
  return {token:tokens.access_token,session,returnTo:flow.returnTo};
}
export function logoutUrl(c:AuthConfig) { const url=new URL("/logout",c.domain);url.search=new URLSearchParams({client_id:c.client,logout_uri:c.origin+"/"}).toString();return url.href; }
