const SESSION_COOKIE = "portfolio_admin_session";
const MAX_BODY = 256_000;
type Options = { baseUrl?: string; fetcher?: typeof fetch; siteOrigin?: string };
export function portfolioApiBase(value = process.env.PORTFOLIO_API_URL): URL | null {
  if (!value) return null;
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback && (process.env.NODE_ENV !== "production" || process.env.PORTFOLIO_ALLOW_LOCAL_API === "true")))) throw new Error("PORTFOLIO_API_URL must be an HTTPS origin, or local HTTP in development.");
  return url;
}
export function apiConfigured() { return Boolean(process.env.PORTFOLIO_API_URL); }
function destination(base: URL, path: string) {
  if (!/^\/(?:auth\/(?:login|logout|session)|(?:admin\/)?blogs(?:\/[^/?#]+)?)$/.test(path)) throw new Error("Unsupported API route.");
  const url = new URL(path, base);
  if (url.origin !== base.origin || url.pathname !== path) throw new Error("Invalid API route.");
  return url;
}
const json = (status: number, data: unknown) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function boundedBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) throw new Error("body_limit");
  const reader = request.body?.getReader();if (!reader) return undefined;
  const chunks: Uint8Array[] = [];let length=0;
  for (;;) { const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BODY){await reader.cancel();throw new Error("body_limit");}chunks.push(value); }
  const bytes=new Uint8Array(length);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.length;}
  return new TextDecoder().decode(bytes);
}
export async function forwardPortfolioApi(request: Request, path: string, options: Options = {}): Promise<Response | null> {
  let base: URL | null;
  try { base=portfolioApiBase(options.baseUrl); } catch { return json(503,{error:"Content API configuration is unavailable."}); }
  if(!base)return null;
  const mutation=!["GET","HEAD"].includes(request.method);
  const origin=request.headers.get("origin"),expected=options.siteOrigin || process.env.SITE_ORIGIN || new URL(request.url).origin;
  if(mutation && ((origin && origin!==expected) || request.headers.get("sec-fetch-site")==="cross-site")) return json(403,{error:"Cross-site requests are not allowed."});
  try {
    const headers=new Headers({accept:"application/json"});
    const cookie=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(SESSION_COOKIE+"="));
    if(cookie && cookie.length<8192)headers.set("cookie",cookie);
    if(origin)headers.set("origin",origin);
    const body=mutation?await boundedBody(request):undefined;
    if(body!==undefined)headers.set("content-type","application/json");
    const upstream=await (options.fetcher || fetch)(destination(base,path),{method:request.method,headers,body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(path==="/auth/session" && upstream.status===401)return json(200,{authenticated:false,email:null});
    if(upstream.status>=500)return json(503,{error:"Content API is temporarily unavailable."});
    const resultHeaders=new Headers({"content-type":"application/json","cache-control":"no-store"});
    for(const value of upstream.headers.getSetCookie()) {
      if(!value.startsWith(SESSION_COOKIE+"="))continue;
      const parts=value.split(";").map(s=>s.trim()).filter(s=>! /^(domain|path|samesite|httponly|secure)(=|$)/i.test(s));
      parts.push("Path=/","HttpOnly","SameSite=Lax");
      if(process.env.NODE_ENV==="production" || new URL(request.url).protocol==="https:")parts.push("Secure");
      resultHeaders.append("set-cookie",parts.join("; "));
    }
    return new Response(upstream.body,{status:upstream.status,headers:resultHeaders});
  }catch(error){return json(error instanceof Error && error.message==="body_limit"?413:503,{error:error instanceof Error && error.message==="body_limit"?"Request body is too large.":"Content API is temporarily unavailable."});}
}
export async function readPublicPortfolioApi<T>(path: string): Promise<T | undefined> {
  const base=portfolioApiBase();if(!base)return undefined;
  if(!path.startsWith("/blogs"))throw new Error("Public API path required.");
  const response=await fetch(destination(base,path),{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
  if(response.status===404)return {post:null} as T;
  if(!response.ok)throw new Error("Content API unavailable");
  return response.json() as Promise<T>;
}
