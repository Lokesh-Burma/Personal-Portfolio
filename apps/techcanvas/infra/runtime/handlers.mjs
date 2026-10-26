import { HttpError, jobIdValid, publicJob, LIMITS } from './service.mjs';
const response = (statusCode,body) => ({ statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
export function ownerFrom(event, owner) {
  const c = event.requestContext?.authorizer?.jwt?.claims;
  if (!c || c.token_use !== 'access' || typeof c.sub !== 'string' || !String(c.scope || '').split(' ').includes('techcanvas/access')) throw new HttpError(401,'Sign in to continue.');
  if (!owner || owner === 'UNCONFIGURED' || c.sub !== owner) throw new HttpError(403,'This account is not the configured owner.');
  return c.sub;
}
export function apiHandler({ service, assets, owner, backendReady = false, inferenceEnabled = false }) {
  return async event => {
    try {
      const sub = ownerFrom(event,owner);
      if (!backendReady) throw new HttpError(503,'foundation_not_ready');
      const route = event.routeKey;
      if (route === 'GET /api/config') return response(200,{ cloud: true, provider: 'bedrock', topics: service.catalogTopics, s3Enabled: false, ready: inferenceEnabled, limits: await service.quota() });
      if (route === 'GET /api/jobs') return response(200,await service.list(sub,event.queryStringParameters?.cursor));
      const id = event.pathParameters?.id;
      if (id && !jobIdValid(id)) throw new HttpError(404,'Job not found.');
      if (route === 'GET /api/jobs/{id}' || route === 'GET /api/jobs/{id}/assets/{name}') {
        const j = await service.get(sub,id);
        if (!j) throw new HttpError(404,'Job not found.');
        const urls = await assets.urls(sub,j);
        if (route.includes('/assets/')) {
          const name = event.pathParameters.name;
          if (!Object.hasOwn(urls,name)) throw new HttpError(404,'Asset not found.');
          return response(200,{ url: urls[name], expiresIn: 300 });
        }
        return response(200,{ ...publicJob(j), assets: urls, assetUrlsExpireIn: 300 });
      }
      if (route === 'POST /api/jobs' || route === 'POST /api/jobs/{id}/retry') {
        if (!inferenceEnabled) throw new HttpError(503,'Cloud AI is awaiting activation. No paid call was made.');
        const encoded = event.body || '{}';
        if (Buffer.byteLength(encoded) > 4096) throw new HttpError(413,'Request body is too large.');
        let body;
        try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(encoded,'base64').toString('utf8') : encoded); } catch { throw new HttpError(400,'Invalid JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400,'Expected a JSON object.');
        const retry = route.includes('/retry');
        if (Object.keys(body).some(k => k !== 'topic' || retry)) throw new HttpError(400,'Unexpected request field.');
        const key = event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'];
        return response(202,publicJob(await service.create(sub,body.topic,key,retry ? id : undefined)));
      }
      throw new HttpError(404,'Route not found.');
    } catch(e) {
      return response(e instanceof HttpError ? e.status : 503,{ error: e instanceof HttpError ? e.message : 'Storage is temporarily unavailable. Retry using the same request key.' });
    }
  };
}
export function workerHandler({ service, owner, enabled = false }) {
  return async event => {
    if (!enabled || !owner || owner === 'UNCONFIGURED') throw new Error('Cloud worker disabled.');
    const failures = [];
    for (const r of event.Records || []) {
      try {
        const m = JSON.parse(r.body);
        if (m.owner !== owner || r.attributes?.MessageGroupId !== 'owner') throw new Error('Invalid message owner or FIFO group.');
        await service.work(m);
      } catch { failures.push({ itemIdentifier: r.messageId }); }
    }
    return { batchItemFailures: failures };
  };
}
export function dispatcherHandler({ service, owner, enabled = false, decode }) {
  return async event => {
    if (!enabled || !owner || owner === 'UNCONFIGURED') throw new Error('Cloud dispatcher disabled.');
    const failures = [];
    for (const r of event.Records || []) {
      try {
        if (r.eventName !== 'INSERT' || !r.dynamodb?.NewImage) continue;
        const item = decode(r.dynamodb.NewImage);
        if (item.kind !== 'outbox') continue;
        if (item.owner !== owner) throw new Error('Invalid outbox owner.');
        await service.dispatch(item);
      } catch { failures.push({ itemIdentifier: r.dynamodb?.SequenceNumber }); }
    }
    return { batchItemFailures: failures };
  };
}
