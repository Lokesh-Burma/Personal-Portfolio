export const catalog = {
  'Cache Aside': {
    sentence: 'Cache aside loads data into a cache on demand while the database remains the source of truth.',
    paragraph: 'The application checks the cache before reading the database. On a miss, it fetches the record and caches it with a TTL. Writes update the database and invalidate the cached entry. This improves read latency, but TTLs and invalidation races mean readers can temporarily see stale data.',
    concepts: [
      { title: 'Read through the cache', body: 'Look up the key first. A hit avoids a database round trip.' },
      { title: 'Fill on a miss', body: 'Read the database, then cache the result with a bounded TTL.' },
      { title: 'Invalidate on writes', body: 'Update the source of truth and remove its cached value. Consider races and stale reads.' }
    ],
    example: 'For a product catalogue, cache product:42 for 60 seconds. A price update writes to the database and deletes product:42. The next reader refills the cache.',
    tradeoff: 'Short TTLs improve freshness but increase database load. Hot-key misses may need request coalescing to avoid a cache stampede.'
  },
  'Idempotency': {
    sentence: 'Idempotency makes repeated requests have the same intended effect as one request.',
    paragraph: 'A client supplies a stable idempotency key for one logical operation. The server atomically claims the key and stores the result, returning that result for matching retries. It rejects reuse with different input. This prevents duplicate effects when clients retry after a timeout, but requires careful handling of concurrency, expiry, and external side effects.',
    concepts: [
      { title: 'Identify the operation', body: 'Use one client-generated key per logical operation and bind it to a request fingerprint.' },
      { title: 'Claim atomically', body: 'A unique constraint ensures concurrent retries cannot both perform the operation.' },
      { title: 'Replay the result', body: 'Save the outcome and return it for matching retries. Reject conflicting payloads.' }
    ],
    example: 'A checkout request uses key checkout-42. If the response is lost, retrying with that same key returns the saved order rather than creating a second order.',
    tradeoff: 'Database transactions cannot automatically make an external charge atomic. Coordinate external effects with provider idempotency or an outbox.'
  },
  'Message Queues': {
    sentence: 'Message queues decouple producers and consumers by buffering work for asynchronous processing.',
    paragraph: 'A producer publishes work and a consumer processes it independently. The consumer acknowledges successful work; failures may be retried or routed to a dead-letter queue. Many queues deliver at least once, so consumers must tolerate duplicates. Monitor queue depth and processing age to detect a growing backlog.',
    concepts: [
      { title: 'Publish work', body: 'A producer submits a message so work can continue asynchronously.' },
      { title: 'Process and acknowledge', body: 'Workers process messages and acknowledge success. Failed attempts may be redelivered.' },
      { title: 'Handle duplicates', body: 'Make consumers idempotent and isolate poison messages with bounded retries.' }
    ],
    example: 'After an order is saved, an outbox relays an email job. A worker sends the receipt and records the operation key so a redelivery does not send another receipt.',
    tradeoff: 'Asynchronous workflows introduce eventual consistency. Queue durability, ordering and acknowledgement semantics vary by product.'
  }
};

export function validateContent(c) {
  if (!c || !['sentence','paragraph','example','tradeoff'].every(k => typeof c[k] === 'string' && c[k].trim() && c[k].length <= 5000)
      || !Array.isArray(c.concepts) || c.concepts.length !== 3
      || !c.concepts.every(x => x && typeof x.title === 'string' && x.title.trim() && x.title.length <= 70 && typeof x.body === 'string' && x.body.trim() && x.body.length <= 300)) {
    throw new Error('The content provider returned an invalid result. Retry after checking the local model.');
  }
  return c;
}
const escapeXml = s => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function lines(text, width, max) {
  const words = text.split(/\s+/); const result = []; let line = '';
  for (const word of words) { if ((line+' '+word).trim().length > width && line) { result.push(line); line = word; } else line = (line+' '+word).trim(); }
  if (line) result.push(line);
  return result.slice(0,max).map((s,i) => i === max-1 && result.length > max ? s+'…' : s);
}
function textBlock(text, x, y, size, width, max, color='#f4f4ff') {
  return `<text fill="${color}" font-family="Arial,sans-serif" font-size="${size}" x="${x}" y="${y}">${lines(text,width,max).map((line,i)=>`<tspan x="${x}" dy="${i?size*1.4:0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}
export function renderSvg(topic, content, index = null, provider = 'demo') {
  const cards = index === null ? content.concepts : [content.concepts[index]];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#111429"/><circle cx="1030" cy="40" r="300" fill="#292451"/>${textBlock('TECHCANVAS / CONCEPT NOTES',70,85,22,70,1,'#b2a4ff')}${textBlock(topic,70,180,56,29,3)}${cards.map((c,i)=>{const y=365+i*175;return `<rect x="65" y="${y-42}" width="950" height="155" rx="20" fill="#20253e"/>${textBlock(String(index===null?i+1:index+1).padStart(2,'0'),90,y,25,4,1,'#ae9cff')}${textBlock(c.title,155,y,29,47,1)}${textBlock(c.body,155,y+42,23,62,2,'#cad0e5')}`;}).join('')}${index!==null ? textBlock(content.sentence,85,650,32,48,5,'#cad0e5') : ''}${textBlock(provider==='demo'?'Curated demo • Review before publishing':provider==='bedrock'?'Cloud AI draft • Review before publishing':'Local AI draft • Review before publishing',70,1020,20,80,1,'#9aa5c2')}</svg>`;
}
export function markdown(topic,c) {
  return `# ${topic}\n\n> Draft: review technical accuracy before publishing.\n\n${c.paragraph}\n\n## In one sentence\n\n${c.sentence}\n\n${c.concepts.map(x=>`## ${x.title}\n\n${x.body}`).join('\n\n')}\n\n## A practical example\n\n${c.example}\n\n## Tradeoffs\n\n${c.tradeoff}\n${c.sources?.length?'\n## Reference notes\n\n'+c.sources.map(source=>`- [${source.title}](${source.url})`).join('\n')+'\n':''}`;
}
export const assetNames = new Set(['blog.md','summary.svg','memory.svg','concept-1.svg','concept-2.svg','concept-3.svg','portfolio.json','caption.txt']);
