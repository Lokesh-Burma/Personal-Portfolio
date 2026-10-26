const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function validateCloudConfig(c, origin) {
  const api = new URL(c.apiUrl), login = new URL(c.loginDomain);
  if (api.port || api.protocol !== 'https:' || !/^[a-z0-9]+\.execute-api\.ap-southeast-2\.amazonaws\.com$/.test(api.hostname) || api.pathname !== '/' || api.search || api.hash || api.username || api.password) throw new Error('Invalid cloud API configuration.');
  if (login.port || login.protocol !== 'https:' || !/^[a-z0-9-]+\.auth\.ap-southeast-2\.amazoncognito\.com$/.test(login.hostname) || login.pathname !== '/' || login.search || login.hash || login.username || login.password) throw new Error('Invalid cloud login configuration.');
  if (c.frontendUrl !== origin || !/^[a-z0-9]{1,128}$/.test(c.clientId)) throw new Error('Cloud callback or client configuration does not match this site.');
  return c;
}
export async function createCloudSession(c, { location = window.location, history = window.history, storage = window.sessionStorage, fetcher = fetch, cryptoApi = crypto, now = Date.now } = {}) {
  validateCloudConfig(c,location.origin);
  let accessToken = null, refreshToken = null, expires = 0;
  const random = () => base64url(cryptoApi.getRandomValues(new Uint8Array(32)));
  const recordKey = 'techcanvas.pkce';
  const clear = () => { accessToken = refreshToken = null; expires = 0; storage.removeItem(recordKey); };
  const login = async () => {
    const verifier = random(), state = random();
    storage.setItem(recordKey,JSON.stringify({ verifier, state, created: now() }));
    const digest = await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    const url = new URL('/oauth2/authorize',c.loginDomain);
    url.search = new URLSearchParams({ response_type: 'code', client_id: c.clientId, redirect_uri: c.frontendUrl, scope: 'openid techcanvas/access', state, code_challenge_method: 'S256', code_challenge: base64url(new Uint8Array(digest)) });
    location.assign(url.href);
  };
  const params = new URLSearchParams(location.search);
  if (params.has('code') || params.has('error')) {
    const raw = storage.getItem(recordKey);storage.removeItem(recordKey);
    history.replaceState(null,'',location.pathname);
    let saved;try { saved=JSON.parse(raw); } catch { /* Rejected below. */ }
    if (!saved || saved.state !== params.get('state') || typeof saved.verifier !== 'string' || now()-saved.created > 600000 || now()<saved.created || !Number.isFinite(saved.created)) throw new Error('Sign-in expired or could not be verified. Please sign in again.');
    if (params.has('error')) throw new Error('Sign-in was cancelled or denied.');
    const response = await fetcher(new URL('/oauth2/token',c.loginDomain), { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: c.clientId, code: params.get('code'), code_verifier: saved.verifier, redirect_uri: c.frontendUrl }) });
    if (!response.ok) throw new Error('Could not complete sign-in. Please try again.');
    const token = await response.json();
    if (typeof token.access_token !== 'string' || token.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error('Invalid sign-in response.');
    accessToken = token.access_token;refreshToken = token.refresh_token;expires = now()+token.expires_in*1000;
  }
  return {
    get signedIn() { return Boolean(accessToken && now()<expires-30000); }, login,
    async fetch(path,options = {}) {
      if (!accessToken || now()>=expires-30000) { clear();throw new Error('Your session expired. Sign in again.'); }
      if (!path.startsWith('/api/')) throw new Error('Invalid API path.');
      const url = new URL(path,c.apiUrl);
      if (url.origin !== new URL(c.apiUrl).origin || !url.pathname.startsWith('/api/')) throw new Error('Invalid API path.');
      const headers = new Headers(options.headers);headers.set('Authorization','Bearer '+accessToken);
      const result = await fetcher(url,{ ...options, headers, redirect: 'error' });
      if (result.status === 401) clear();
      return result;
    },
    async logout() {
      const token = refreshToken;clear();
      try { if (token) await fetcher(new URL('/oauth2/revoke',c.loginDomain),{ method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({ client_id:c.clientId,token }),signal:AbortSignal.timeout(5000) }); }
      finally { const url=new URL('/logout',c.loginDomain);url.search=new URLSearchParams({ client_id:c.clientId,logout_uri:c.frontendUrl });location.assign(url.href); }
    }
  };
}
