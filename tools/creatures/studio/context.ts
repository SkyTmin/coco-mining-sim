// ws context <id> <anim> — the context pack of one clip [research 23.11, C02, VIII.5.7]: what an author needs before a
// change of this clip, in a few kilobytes instead of whole source files. The clip itself (length, loop, contacts, title),
// its named events (beats) and technique keys and contacts, where the clip lives in the source (file:line, not the text),
// the art acceptance and its remarks, the clip's check exceptions with their reasons, the last review (fresh or stale
// against the current inputs) and the materials to look at. Everything else stays reachable by the paths given.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadPainting } from '../render';
import { frameCount, hitFrame } from '../engine';
import { playbackKeys, techniqueContacts } from '../technique';
import { exceptionRules, readAcceptance } from './baseline';

const tools = join(import.meta.dirname, '..');
const repo = join(tools, '../..');

export async function contextCommand(args: string[]) {
  const [id, anim] = args.filter((a) => !a.startsWith('--'));
  if (!id || !anim) {
    console.log('usage: npm run ws -- context <id> <anim>');
    process.exitCode = 1;
    return;
  }
  const { c } = await loadPainting(id);
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${id} has no animation ${anim}; it has ${Object.keys(c.animations).join(', ')}`);
  const out: string[] = [];
  const count = frameCount(spec.seconds);
  const title = (c as unknown as { titles?: Record<string, string> }).titles?.[anim];
  out.push(`${id} ${anim}${title ? ` «${title}»` : ''}: ${spec.seconds} s, ${count} frames${spec.loop ? ', loop' : ', one-shot'}` +
    (spec.hits?.length ? `, contacts at ${spec.hits.map(hitFrame).join(', ')}` : '') +
    (spec.interrupt ? `, interrupt ${JSON.stringify(spec.interrupt)}` : ''));

  // named events: the poses module's beats for this clip
  const poses = join(tools, 'c', `${id}-poses.ts`);
  if (existsSync(poses)) {
    const mod = (await import(poses)) as { beats?: Record<string, Record<string, unknown>> };
    const beats = mod.beats?.[anim];
    if (beats) out.push('beats: ' + Object.entries(beats).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' '));
  }
  const technique = c.techniques?.[anim];
  if (technique) {
    out.push('technique keys: ' + playbackKeys(technique).map((k) => `${k.frame}${k.role ? ':' + k.role : ''}`).join(' '));
    out.push('technique contacts: ' + techniqueContacts(technique).map((k) => JSON.stringify(k)).join(' '));
  }

  // where the clip lives: file:line of every mention in the creature's own sources (navigation, not content)
  const mentions: string[] = [];
  const plain = /^[a-z_][a-z0-9_]*$/i.test(anim);
  const pattern = new RegExp(
    `(['"\`])${anim.replace(/[-]/g, '\\-')}\\1|\\b(beats|lanes|P|clips)\\.${anim.replace(/-/g, '_')}\\b|\\[(['"])${anim}\\3\\]` +
      (plain ? `|(^|[\\s{,])${anim}\\s*:` : ''),
  );
  for (const f of readdirSync(join(tools, 'c')).filter((f) => f.startsWith(id) && f.endsWith('.ts')).sort()) {
    const lines = readFileSync(join(tools, 'c', f), 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (pattern.test(l)) mentions.push(`c/${f}:${i + 1}`);
    });
  }
  if (mentions.length) out.push(`source (${mentions.length}): ` + mentions.slice(0, 30).join(' ') + (mentions.length > 30 ? ` … +${mentions.length - 30}` : ''));

  // acceptance and exceptions
  const acc = readAcceptance()[id];
  if (acc) {
    out.push(`acceptance: ${acc.owner}${acc.date ? ' ' + acc.date : ''} — ${acc.basis}`);
    for (const r of acc.remarks) out.push(`  remark: ${r}`);
  }
  const reasons = acc?.exceptions ?? {};
  for (const r of exceptionRules(id).filter((r) => r === 'clipAllow' || r.includes(` ${anim}:`) || r.split(' ').pop()!.split(',').includes(anim)))
    out.push(`exception ${r}: ${reasons[r] ?? 'основание не записано'}`);

  // the last review and the materials
  const state = join(tools, '.studio', 'review', `${id}-${anim}.json`);
  if (existsSync(state)) {
    const r = JSON.parse(readFileSync(state, 'utf8'));
    out.push(`last review: ${r.goal} ${r.at} ${r.ok ? 'passed' : 'FAILED'} (inputs may have changed since — ws review answers from it only for the same key)`);
    for (const i of r.issues.slice(0, 8)) out.push(`  ${i.level === 'error' ? '!' : '·'} ${i.kind} ${i.note}`);
    if (r.issues.length > 8) out.push(`  … ${r.issues.length - 8} more in ${relative(process.cwd(), state)}`);
  } else out.push('last review: none (npm run ws -- review ' + id + ' ' + anim + ')');
  const materials = [
    ...readdirSync(join(tools, '.studio')).filter((f) => f.startsWith(`${id}-${anim}`) && f.endsWith('.png')).map((f) => join(tools, '.studio', f)),
    join(repo, 'assets/creatures', id, 'gif', `painting-${anim}.gif`),
  ].filter(existsSync);
  if (materials.length) out.push('materials: ' + materials.map((m) => relative(process.cwd(), m)).join(' '));
  const tz = readdirSync(join(repo, 'docs/tz')).filter((f) => f.endsWith('.md') && readFileSync(join(repo, 'docs/tz', f), 'utf8').includes('`' + id + '`'));
  if (tz.length) out.push('ТЗ: ' + tz.map((f) => 'docs/tz/' + f).join(' '));
  console.log(out.join('\n'));
}
