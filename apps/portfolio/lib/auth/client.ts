const unavailable = "The workspace is temporarily unavailable. Please retry.";

export async function readJSONResponse(response: Response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error(unavailable);
  let data;
  try { data = await response.json(); } catch { throw new Error(unavailable); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(unavailable);
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : unavailable);
  return data;
}

export async function readOwnerSession() {
  let response: Response;
  try { response = await fetch("/api/admin/session", {cache: "no-store", headers: {accept: "application/json"}, signal: AbortSignal.timeout(10000)}); } catch { throw new Error(unavailable); }
  const session = await readJSONResponse(response);
  if (typeof session.authenticated !== "boolean") throw new Error(unavailable);
  return session;
}

export async function signOutOwner() {
  const data = await readJSONResponse(await fetch("/api/admin/logout", {method: "POST"}));
  window.dispatchEvent(new Event("owner-session-changed"));
  window.location.assign(data.redirectUrl || "/");
}
