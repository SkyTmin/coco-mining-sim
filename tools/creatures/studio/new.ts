// Generate the five files in a fixed order. Publish the entry point last, and never replace user work.
import { closeSync, existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { bodySources } from '../bodies/sources';
import { defaultMoveParameters, moveTemplates, weaponFor } from '../moves/templates';
import { sizes, type MotionPlan, type Rarity } from '../types';
import {
  bodyIds,
  effectIds,
  techniqueCounts,
  templateIds,
  type BodyType,
  type CreatureCard,
  type EffectId,
  type TemplateId,
} from './card';

const tools = join(import.meta.dirname, '..');
const families: Record<
  BodyType,
  { parts: string[]; moves: TemplateId[]; effects: EffectId; tones: string[] }
> = {
  'sky-swimmer': {
    parts: ['body', 'head', 'finL', 'finR', 'tail', 'flukes', 'island', 'lamp'],
    moves: ['pillars', 'ram', 'sweep', 'overhead', 'volley', 'summon'],
    effects: 'silk-wind',
    tones: ['#26384e', '#3a5572', '#527b91', '#8bb0b0', '#dacb9a'],
  },
  arachnid: {
    parts: ['thorax', 'abdomen', 'clawL', 'clawR', 'tail', 'sting', ...['L', 'R'].flatMap(side =>
      Array.from({length: 4}, (_, i) => 'foot' + side + i))],
    moves: ['summon', 'overhead', 'sweep', 'volley', 'pillars'],
    effects: 'crystal',
    tones: ['#4c3941', '#795441', '#a97844', '#cba15c', '#f2d48e'],
  },
  cephalopod: {
    parts: ['mantle', 'head', ...Array.from({ length: 8 }, (_, i) => 'arm' + i)],
    moves: ['sweep', 'overhead', 'roar', 'summon'],
    effects: 'silk-wind',
    tones: ['#46314b', '#744257', '#ad5f61', '#dc8b73', '#f3bb8d'],
  },
  'light-quadruped': {
    parts: ['torso', 'neck', 'head', 'foreL', 'foreR', 'hindL', 'hindR', 'tail'],
    moves: ['ram', 'leap', 'volley'],
    effects: 'thorns',
    tones: ['#473948', '#775149', '#a77357', '#cba182', '#efcfac'],
  },
  'heavy-quadruped': {
    parts: ['torso', 'head', 'foreL', 'foreR', 'hindL', 'hindR', 'horns'],
    moves: ['ram', 'volley'],
    effects: 'thorns',
    tones: ['#302b29', '#54402d', '#83613b', '#a67f4f', '#d6bc80'],
  },
  hexapod: {
    parts: ['thorax', 'head', 'abdomen', 'horn', 'elytra', 'legs'],
    moves: ['ram', 'volley'],
    effects: 'crystal',
    tones: ['#21293c', '#344358', '#486780', '#6c9ca5', '#bfdbd0'],
  },
  'long-flier': {
    parts: ['head', 'neck', 'body', 'tail', 'fins'],
    moves: ['sweep', 'volley', 'summon'],
    effects: 'silk-wind',
    tones: ['#382c45', '#634257', '#976073', '#cb9786', '#ecd6ae'],
  },
  'armed-biped': {
    parts: ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'club'],
    moves: ['overhead', 'volley', 'sweep', 'roar'],
    effects: 'ice',
    tones: ['#28364e', '#415677', '#728ea8', '#9fbec7', '#e7f2ec'],
  },
  'squat-mage': {
    parts: ['body', 'head', 'cloak', 'armL', 'armR', 'staff', 'legL', 'legR'],
    moves: ['overhead', 'breath', 'leap', 'summon', 'roar'],
    effects: 'spores',
    tones: ['#28443e', '#405d4a', '#667b4a', '#91a465', '#d2cd83'],
  },
  giant: {
    parts: ['chest', 'head', 'hips', 'armL', 'armR', 'legL', 'legR'],
    moves: ['overhead', 'pillars', 'sweep', 'breath', 'volley', 'leap'],
    effects: 'lava',
    tones: ['#332c36', '#56444a', '#846058', '#b56e45', '#f8bd71'],
  },
  'winged-bird': {
    parts: ['body', 'neck', 'head', 'wingL', 'wingR', 'tail', 'footL', 'footR'],
    moves: ['dive', 'sweep', 'volley', 'breath', 'ram', 'leap'],
    effects: 'crystal',
    tones: ['#122334', '#255052', '#469885', '#82b8be', '#d8e5de'],
  },
  'winged-dragon': {
    parts: ['body', 'neck', 'head', 'wingL', 'wingR', 'tail', 'claws'],
    moves: ['sweep', 'breath', 'volley', 'summon', 'dive', 'ram'],
    effects: 'coins',
    tones: ['#403637', '#674e3a', '#997947', '#c79d50', '#f0d88e'],
  },
};
const titles: Record<TemplateId, string> = {
  overhead: 'Удар сверху',
  ram: 'Таран',
  sweep: 'Размашистый удар',
  slide: 'Скольжение',
  volley: 'Залп',
  breath: 'Дыхание',
  leap: 'Прыжок с ударом',
  pillars: 'Столбы из земли',
  roar: 'Рёв',
  summon: 'Призыв предмета',
  dive: 'Нырок',
};

function listed<T extends string>(
  value: string | undefined,
  values: readonly T[],
  option: string,
): T {
  if (!values.includes(value as T)) throw Error(option + ' — ' + values.join(', '));
  return value as T;
}
export function defaultLife(source: MotionPlan, moves: CreatureCard['moves']): MotionPlan {
  const mapping = new Map<string, string>();
  for (const beat of source.beats) {
    if (beat.anim.startsWith('tech_') && !mapping.has(beat.anim))
      mapping.set(beat.anim, moves[mapping.size % moves.length].id);
  }
  return {
    ...source,
    beats: source.beats.map((beat) => ({
      ...beat,
      at: [...beat.at],
      anim: mapping.get(beat.anim) ?? beat.anim,
    })),
  };
}

export function writeCreatureDraft(card: CreatureCard, dir = join(tools, 'c')) {
  if (!/^[a-z][a-z0-9_]*$/.test(card.id)) throw Error('Некорректный id существа');
  const id = card.id;
  const data = `import { readCreatureCard } from '../bodies/card-data';\n`;
  const files = new Map([
    [id + '.card.json', JSON.stringify(card, null, 2) + '\n'],
    [id + '.studio.json', '{ "minPrimitives": 250 }\n'],
    [id + '-life.ts', data + `\nexport default readCreatureCard('${id}').life;\n`],
    [
      id + '-keys.ts',
      data +
        `import { buildMoveBook } from '../moves';\n\nconst card = readCreatureCard('${id}');\nexport default buildMoveBook(card.moves, card.body);\n`,
    ],
    [
      id + '.ts',
      data +
        `import { makeBodyCreature } from '../bodies';\nimport book from './${id}-keys';\nimport route from './${id}-life';\n\nexport default makeBodyCreature(readCreatureCard('${id}'), book, route);\n`,
    ],
  ]);
  mkdirSync(dir, { recursive: true });
  const conflict = [...files.keys()].find((name) => existsSync(join(dir, name)));
  if (conflict) throw Error('Файл уже существует: ' + conflict);
  const created: string[] = [];
  try {
    for (const [name, body] of files) {
      const path = join(dir, name);
      const fd = openSync(path, 'wx');
      created.push(path);
      try {
        writeFileSync(fd, body);
      } finally {
        closeSync(fd);
      }
    }
  } catch (error) {
    for (const path of created.reverse()) unlinkSync(path);
    throw error;
  }
  return [...files.keys()];
}

export async function newCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      body: { type: 'string' },
      theme: { type: 'string' },
      rarity: { type: 'string' },
      moves: { type: 'string' },
      effects: { type: 'string' },
      name: { type: 'string' },
    },
  });
  const [id] = positionals;
  if (positionals.length !== 1 || !/^[a-z][a-z0-9_]*$/.test(id))
    throw Error('ws new <id> --body <тип> --theme <тема> --rarity <редкость>');
  const body = listed(values.body, bodyIds, '--body'),
    rarity = listed(values.rarity, Object.keys(sizes) as Rarity[], '--rarity');
  const theme = values.theme;
  if (
    !theme ||
    !/^[a-z][a-z0-9_]*$/.test(theme) ||
    !existsSync(join(tools, 'scenes', theme + '.ts'))
  )
    throw Error('Укажи существующую сцену через --theme');
  const family = families[body],
    effects = listed(values.effects ?? family.effects, effectIds, '--effects');
  const ids = values.moves
    ? values.moves.split(',').map((v) => listed(v, templateIds, '--moves'))
    : [...new Set([...family.moves, ...templateIds])].slice(0, techniqueCounts[rarity]);
  const minimum = rarity === 'secret' || rarity === 'mythic' ? 5 : techniqueCounts[rarity];
  if (
    new Set(ids).size !== ids.length ||
    ids.length < minimum ||
    ids.length > techniqueCounts[rarity]
  )
    throw Error('Проверь число и уникальность шаблонов для ' + rarity);
  const moves = ids.map((template) => ({
    id: 'tech_' + template,
    title: titles[template],
    template,
    weapon: weaponFor(body, template),
    reference: moveTemplates[template].reference,
    parameters: { ...defaultMoveParameters },
    logic: ['', '', '', '', ''],
  }));
  const original: MotionPlan = (await import('../c/' + bodySources[body] + '-life.ts')).default;
  // The blank model inherits the locomotion of its family. Its artist will
  // supply a second form and a reveal before those beats can enter the route.
  const life = defaultLife(original, moves);
  if (body === 'winged-bird') {
    const [home, left, right] = life.beats;
    life.beats = [
      { ...home, seconds: 2 },
      { ...home, seconds: 2, anim: 'walk' },
      { ...left, seconds: 1, anim: 'turn' },
      { ...left, seconds: 1.5, anim: moves[0].id },
      { ...left, seconds: 3, anim: 'walk' },
      { ...right, seconds: 1.5, anim: moves[1].id },
      { ...right, seconds: 2.5, anim: 'walk' },
    ];
  }
  for (const beat of life.beats) {
    if (['phase', 'idle-f2', 'show'].includes(beat.anim)) beat.anim = 'idle';
  }
  const card: CreatureCard = {
    id,
    name: values.name ?? id,
    body,
    theme,
    rarity,
    proportions: { length: 1, width: 1, height: 1 },
    parts: family.parts,
    materials: [
      { name: 'Основной материал', tones: family.tones, texture: 'Фактура исходного типа тела' },
    ],
    details: [],
    effects,
    moves,
    life,
  };
  const files = writeCreatureDraft(card);
  console.log(files.map((f) => 'c/' + f).join('\n'));
  console.log(
    'Заготовка готова. Заполни перечень видимых подробностей и пять ответов о каждом приёме перед gate.',
  );
}
