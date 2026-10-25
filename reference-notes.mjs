// Short, manually reviewed grounding notes. These are inputs to local generation,
// not canned output. No web request happens when generating a pack.
const notes={
  'database indexing':{
    title:'PostgreSQL: Introduction to indexes',url:'https://www.postgresql.org/docs/current/indexes-intro.html',
    notes:'An index is an auxiliary lookup structure used to find matching rows without always scanning a table. A query planner can prefer a sequential scan, so faster queries are not guaranteed. The database updates indexes as data changes, adding write and storage costs. Example: CREATE INDEX employees_department_idx ON employees(department) can help SELECT * FROM employees WHERE department = \'Engineering\'. A composite index covers multiple columns but is not automatically unique. Do not claim an index on id speeds filtering on department.'
  },
  'circuit breakers':{
    title:'Microsoft Azure Architecture: Circuit Breaker pattern',url:'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker',
    notes:'This is the SOFTWARE resilience pattern for calls to a remote service, not an electrical device. Closed allows requests and tracks failures. Open rejects calls quickly after a configured failure threshold. After a cooldown, Half-open allows limited probe requests; success closes it and failures reopen it. It protects resources while a dependency recovers but does not repair that dependency or guarantee success. Example: stop calling a failing payments API temporarily. Retries and timeouts are separate policies. Never discuss fuses or backup power as the mechanism.'
  },
  'consistent hashing':{
    title:'Dynamo paper: Partitioning algorithm, sections 4.2–4.3',url:'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
    notes:'Hash keys and node tokens onto a ring; assign a key to its first clockwise node token. Adding/removing nodes remaps only affected ranges instead of all keys. Multiple virtual nodes per physical machine improve balance and can reflect capacity; they do not guarantee exactly equal key counts or load. Example ring positions A=20, B=60, C=90: key hash 50 belongs to B; adding D=55 moves that key to D, while key 70 stays at C. Main costs: metadata, uneven load/hot keys and data movement. Replication is separate; consistent hashing alone does not guarantee availability. There is no virtual root.'
  }
};
export function referenceFor(topic){
  const name=String(topic).trim().toLowerCase().replace(/[.!?]+$/,'');
  return Object.hasOwn(notes,name)?notes[name]:(name==='circuit breaker'?notes['circuit breakers']:null);
}
