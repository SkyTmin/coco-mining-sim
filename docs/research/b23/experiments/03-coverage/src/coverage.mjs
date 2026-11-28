// A research-only contract for snap --check. Keys represent paintings and clips, lengths represent render frames.
function pair(id,clip) {
  return JSON.stringify([id,clip]);
}

export function planCoverage(catalog, selectedIDs, requestedClips) {
  const issues=[];
  const rows=[];
  const ids=[...new Set(selectedIDs)];
  if (ids.length===0) issues.push({kind:'empty-painting-set'});
  for (const id of ids) {
    const entry=catalog.get(id);
    if (!entry) { issues.push({kind:'unknown-painting',id}); continue; }
    const {live,reference}=entry;
    const names=new Set(requestedClips.length ? requestedClips : [...Object.keys(live),...Object.keys(reference)]);
    if (names.size===0) {
      issues.push({kind:'empty-clip-set',id});
      continue;
    }
    for (const clip of names) {
      if (clip==='') { issues.push({kind:'empty-clip-name',id});continue; }
      const exists=Object.hasOwn(live,clip), expected=Object.hasOwn(reference,clip);
      if (!exists && !expected) {issues.push({kind:'unknown-clip',id,clip});continue;}
      if (!exists) {issues.push({kind:'removed-clip',id,clip});continue;}
      if (!expected) {issues.push({kind:'new-clip',id,clip});continue;}
      const count=live[clip];
      if (!Number.isSafeInteger(count) || count<1) {issues.push({kind:'invalid-frame-count',id,clip,count});continue;}
      if (count!==reference[clip]) {issues.push({kind:'length-changed',id,clip,want:reference[clip],count});continue;}
      rows.push({id,clip,count});
    }
  }
  return {rows,issues};
}

export function auditCoverage(expected,completed) {
  const wanted=new Map(expected.map(row=>[pair(row.id,row.clip),row]));
  const seen=new Set();
  const issues=[];
  for (const row of completed) {
    const key=pair(row.id,row.clip);
    if (seen.has(key)) issues.push({kind:'duplicate-result',...row});
    seen.add(key);
    if (!wanted.has(key)) issues.push({kind:'unexpected-result',...row});
    else if (row.count!==wanted.get(key).count) issues.push({kind:'incomplete-count',...row,want:wanted.get(key).count});
  }
  for (const [key,row] of wanted) if (!seen.has(key)) issues.push({kind:'missing-result',...row});
  return issues;
}

export async function runPlanned(plan,compute) {
  if (plan.issues.length) return {ok:false,issues:plan.issues,completed:[],calls:0};
  const grouped=new Map();
  for (const {id,clip} of plan.rows) {
    if (!grouped.has(id)) grouped.set(id,[]);
    grouped.get(id).push(clip);
  }
  const completed=[];
  const contentIssues=[];
  for (const [id,clips] of grouped) {
    const result=await compute(id,clips);
    completed.push(...result.rows);
    contentIssues.push(...result.issues);
  }
  const issues=[...auditCoverage(plan.rows,completed),...contentIssues];
  return {ok:issues.length===0,issues,completed,calls:grouped.size};
}
