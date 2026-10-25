// Code-rendered memory aids: no external image API or additional inference call.
const xml = value => String(value).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function words(value, width, limit) {
  const result=[]; let line='';
  for(const word of String(value).split(/\s+/)) {
    // Break long unspaced model output as well as ordinary prose.
    for(let i=0;i<word.length;i+=width){const part=word.slice(i,i+width);if((line+' '+part).trim().length>width){result.push(line);line=part;}else line=(line+' '+part).trim();}
  }
  if(line)result.push(line);
  return result.slice(0,limit).map((s,i)=>i===limit-1&&result.length>limit?s.slice(0,-1)+'…':s);
}
function text(value,x,y,size=24,width=40,limit=2,color='#edf0ff',anchor='start') {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="${anchor}">${words(value,width,limit).map((line,i)=>`<tspan x="${x}" dy="${i?size*1.35:0}">${xml(line)}</tspan>`).join('')}</text>`;
}
const iconPaths={
  app:'<rect x="3" y="4" width="34" height="27" rx="4"/><path d="M3 12h34M14 37h12M20 31v6"/>',
  cache:'<path d="M23 2 8 23h11l-2 15 15-23H21z"/>',
  database:'<ellipse cx="20" cy="8" rx="16" ry="6"/><path d="M4 8v23c0 8 32 8 32 0V8M4 19c0 8 32 8 32 0"/>',
  key:'<circle cx="12" cy="13" r="9"/><path d="m19 20 16 16m-6-6 5-5m-11 5 5-5"/>',
  lock:'<rect x="7" y="17" width="26" height="21" rx="4"/><path d="M12 17V10a8 8 0 0 1 16 0v7M20 25v6"/>',
  check:'<circle cx="20" cy="20" r="17"/><path d="m10 20 7 7 13-15"/>',
  queue:'<rect x="2" y="8" width="9" height="24" rx="2"/><rect x="15" y="8" width="9" height="24" rx="2"/><rect x="28" y="8" width="9" height="24" rx="2"/>',
  worker:'<circle cx="20" cy="12" r="9"/><path d="M4 37v-4c0-14 32-14 32 0v4M15 12l4 4 7-8"/>',
  note:'<path d="M8 3h18l7 7v27H8zM25 3v9h8M14 20h13M14 27h13"/>',
};
function icon(kind,x,y,color='#b9a5ff',scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconPaths[kind]||iconPaths.note}</g>`;}
function node(label,kind,x,y,color='#b9a5ff',sub='') {
  return `<rect x="${x}" y="${y}" width="230" height="180" rx="24" fill="#1d2540" stroke="${color}" stroke-opacity=".6"/>${icon(kind,x+91,y+25,color,1.2)}${text(label,x+115,y+112,26,16,1,'#edf0ff','middle')}${text(sub,x+115,y+149,18,22,1,'#aebbd8','middle')}`;
}
const arrow=(d,color='#a997ff',dashed=false)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="4" ${dashed?'stroke-dasharray="10 8"':''} marker-end="url(#arrow)"/>`;
function cacheDiagram(){return {
  cue:'CHECK → FILL → FORGET', subtitle:'Fast reads. One source of truth.',
  body:node('Application','app',65,325)+node('Cache','cache',425,325,'#74dfc4','temporary copy')+node('Database','database',785,325,'#ffcf8a','source of truth')+
    arrow('M295 370 H410')+text('1 · CHECK',355,345,18,15,1,'#b9a5ff','middle')+
    arrow('M425 450 H310','#74dfc4')+text('HIT: return',355,484,17,18,1,'#74dfc4','middle')+
    arrow('M655 370 H770','#ffcf8a')+text('2 · MISS: READ',715,345,17,18,1,'#ffcf8a','middle')+
    arrow('M785 450 H670','#ffcf8a')+text('FILL + TTL',715,484,17,18,1,'#ffcf8a','middle')+
    arrow('M180 515 V600 H900 V520','#ffcf8a')+text('3 · WRITE DATABASE',350,583,22,30,1,'#ffcf8a','middle')+
    arrow('M900 515 V695 H540 V520','#74dfc4',true)+text('THEN INVALIDATE CACHE',680,675,21,32,1,'#74dfc4','middle'),
  detail:'Remember: check the shortcut, fill on a miss, forget it after a write.',
  caution:'TTL limits staleness; invalidation races can still happen.'
};}
function idempotencyDiagram(){return {
  cue:'SAME KEY → SAME EFFECT',subtitle:'A retry is not a new operation.',
  body:node('Client','app',65,355,'#b9a5ff','retry same key')+node('Atomic claim','lock',425,355,'#74dfc4','key + fingerprint')+node('Saved result','check',785,355,'#ffcf8a','one logical effect')+
    arrow('M295 400 H410')+arrow('M295 445 H410')+arrow('M295 490 H410')+
    text('RETRIES',355,332,18,12,1,'#b9a5ff','middle')+icon('key',332,550)+
    arrow('M655 445 H770','#74dfc4')+text('FIRST',715,418,19,12,1,'#74dfc4','middle')+
    arrow('M900 550 V650 H180 V550','#ffcf8a',true)+text('MATCHING RETRY: REPLAY SAVED RESULT',540,690,23,45,1,'#ffcf8a','middle'),
  detail:'Remember: one ticket, one operation. Keep the ticket for every retry.',
  caution:'Reject changed input. Coordinate external side effects separately.'
};}
function queueDiagram(){return {
  cue:'SEND → BUFFER → WORK',subtitle:'Let work wait without making the producer wait.',
  body:node('Producer','app',65,350,'#b9a5ff','publish work')+node('Queue','queue',425,350,'#74dfc4','buffer messages')+node('Worker','worker',785,350,'#ffcf8a','process + ACK')+
    arrow('M295 430 H410')+text('PUBLISH',355,401,18,15,1,'#b9a5ff','middle')+
    arrow('M655 430 H770','#74dfc4')+text('DELIVER',715,401,18,15,1,'#74dfc4','middle')+
    arrow('M900 545 V610 H540 V545','#ffcf8a',true)+text('FAILURE: RETRY',720,645,21,25,1,'#ffcf8a','middle')+
    `<rect x="65" y="650" width="335" height="65" rx="16" fill="#35293b"/>`+text('Poison message → dead letter',232,691,19,31,1,'#f6b8ca','middle')+
    arrow('M425 500 H370 V635','#f6b8ca',true),
  detail:'Remember a to-do tray: drop a task, pick it up, finish and acknowledge.',
  caution:'At-least-once delivery can repeat work. Make consumers idempotent.'
};}
function conceptMap(topic,c){
  const positions=[[65,400],[425,540],[785,400]];
  return {cue:'THREE IDEAS. ONE MENTAL MAP.',subtitle:'Use each icon as a cue to recall the explanation.',
    body:`<circle cx="540" cy="345" r="72" fill="#342b58"/>${icon('note',516,320,'#c7b5ff',1.2)}`+
      `<path d="M475 345 H180 V390 M540 417 V530 M605 345 H900 V390" fill="none" stroke="#a997ff" stroke-width="4"/>`+
      c.concepts.map((item,i)=>{const [x,y]=positions[i];return `<rect x="${x}" y="${y}" width="230" height="180" rx="24" fill="#1d2540"/>${icon('note',x+22,y+20)}${text(String(i+1).padStart(2,'0'),x+175,y+48,25,3,1,'#b9a5ff')}${text(item.title,x+20,y+96,23,14,3)}`;}).join(''),
    detail:c.sentence,caution:'Connected ideas, not necessarily a sequence. Review the full notes.'};
}
export function renderMemorySvg(topic,content,provider='demo') {
  // Curated teaching diagrams apply only to curated content. AI output gets a
  // concept map of its own titles, avoiding a diagram that contradicts its text.
  const diagram=provider==='demo'&&topic==='Cache Aside'?cacheDiagram():provider==='demo'&&topic==='Idempotency'?idempotencyDiagram():provider==='demo'&&topic==='Message Queues'?queueDiagram():conceptMap(topic,content);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-labelledby="memory-title memory-description"><title id="memory-title">${xml(topic)} — visual memory aid</title><desc id="memory-description">${xml(diagram.cue+'. '+diagram.detail+' '+diagram.caution)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="context-stroke"/></marker></defs><rect width="1080" height="1080" fill="#101629"/><circle cx="1040" cy="0" r="360" fill="#252044"/>${text('TECHCANVAS / VISUAL MEMORY',65,65,20,60,1,'#b9a5ff')}${text(topic,65,130,44,34,2)}${text(diagram.subtitle,65,255,24,66,1,'#b7c3df')}${diagram.body}<rect x="65" y="765" width="950" height="175" rx="24" fill="#262446"/>${text(diagram.cue,95,810,29,45,1,'#d2c3ff')}${text(diagram.detail,95,855,23,65,2,'#d5daed')}${text(diagram.caution,65,980,19,87,1,'#f0cf9d')}${text(provider==='demo'?'Curated diagram • Review before sharing':'Local AI concept map • Review before sharing',65,1033,18,85,1,'#8f9ebd')}</svg>`;
}
