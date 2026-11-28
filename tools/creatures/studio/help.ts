// ws help [topic] [--all] — the studio manual by section [research 23.11, C03]: the answer is the one part asked for,
// not the whole studio/README.md. No topic: the sections with their sizes and the command list. A command name (review,
// gate, render…) gives its row of the command table; any other word gives the section whose heading has it, otherwise
// the lines that mention it with their section. Long answers are cut at 3 KB with the way to get all of it (--all);
// a cut never hides that something was cut. The source of truth stays README.md: this only selects from it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readme = join(import.meta.dirname, 'README.md');
const LIMIT = 3000;

interface Section {
  title: string;
  level: number;
  body: string[];
}

function sections(text: string): Section[] {
  const out: Section[] = [{ title: '(intro)', level: 1, body: [] }];
  for (const line of text.split('\n')) {
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) out.push({ title: h[2].trim(), level: h[1].length, body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out;
}

const commandOf = (row: string) => /^\|\s*`npm run ws -- ([a-z-]+)/.exec(row)?.[1];
const cell = (row: string) =>
  row
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

function print(text: string, all: boolean, topic: string) {
  if (all || text.length <= LIMIT) console.log(text);
  else console.log(text.slice(0, LIMIT) + `\n… ${text.length - LIMIT} more characters: npm run ws -- help ${topic} --all`);
}

export function helpCommand(args: string[]) {
  const all = args.includes('--all');
  const topic = args.filter((a) => !a.startsWith('--')).join(' ').toLowerCase();
  const text = readFileSync(readme, 'utf8');
  const list = sections(text);
  const rows = text.split('\n').filter((l) => commandOf(l));
  if (!topic) {
    console.log('sections (characters):');
    for (const s of list) if (s.body.join('\n').trim()) console.log(`  ${'  '.repeat(Math.max(0, s.level - 2))}${s.title} (${s.body.join('\n').length})`);
    console.log('commands: ' + [...new Set(rows.map(commandOf))].join(', '));
    console.log('npm run ws -- help <command | word> [--all]');
    return;
  }
  const own = rows.filter((r) => commandOf(r) === topic);
  if (own.length) {
    for (const r of own) {
      const [cmd, what, time] = cell(r);
      print(`${cmd}\n  ${what}${time ? `\n  time: ${time}` : ''}`, all, topic);
    }
    return;
  }
  const hit = list.find((s) => s.title.toLowerCase().includes(topic));
  if (hit) {
    print(`## ${hit.title}\n${hit.body.join('\n').trim()}`, all, topic);
    return;
  }
  const found: string[] = [];
  for (const s of list)
    for (const l of s.body) if (l.toLowerCase().includes(topic)) found.push(`[${s.title}] ${l.trim().slice(0, 240)}`);
  if (!found.length) {
    console.log(`nothing about «${topic}» in studio/README.md; npm run ws -- help lists the sections`);
    process.exitCode = 1;
    return;
  }
  print(found.slice(0, all ? found.length : 15).join('\n') + (found.length > 15 && !all ? `\n… ${found.length - 15} more lines: --all` : ''), all, topic);
}
