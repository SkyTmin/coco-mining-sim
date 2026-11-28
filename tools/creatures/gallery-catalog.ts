// Build the gallery manifest from the shipped atlases and the original move titles.
// Usage: node --import tsx gallery-catalog.ts /path/to/externals.json
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPainting } from './render';
import { kingCatalogClips } from './viewer/king-painting.mjs';

const viewer = join(import.meta.dirname, 'viewer');
const works = [
  ['meadow_colossus', 'Луговой исполин', '#374638'],
  ['penguin_marshal', 'Пингвин-маршал', '#435565'],
  ['moon_warden', 'Лунный страж', '#434561'],
  ['root_stag', 'Корнерог', '#405c47'],
  ['frost_fox', 'Лис Иней', '#4e687e'],
  ['herald_griffin', 'Грифон-вестник', '#866c4f'],
  ['ink_admiral', 'Осьминог-адмирал Чернилус', '#354b66'],
  ['grove_lord', 'Владыка рощи', '#556341'],
  ['sand_scorpion', 'Скорпион Анкхар', '#987448'],
  ['sky_whale', 'Небесный кит Алтан', '#475c7d'],
  ['nebula_squid', 'Кальмар Туманность', '#64567f'],
  ['moon_magician', 'Мурлен, лунный фокусник', '#3b3560'],
  ['astral_seer', 'Астрал, звёздный провидец', '#2a3166'],
  ['threshold_keeper', 'Хранитель дверей', '#785f72'],
  ['kettle_crab', 'Краб-отшельник Котёл', '#7a4a2e'],
  ['ball_pangolin', 'Панголин Клубок', '#6a5a4c'],
  ['river_otter', 'Выдрёнок Плюх', '#567b74'],
  ['garden_chameleon', 'Хамелеон Прищур', '#54786a'],
  ['bell_magpie', 'Сорока Клёпа', '#597c7c'],
  ['zephyr_whorl', 'Вихрёнок Фью', '#53a998'],
  ['lunar_plush', 'Лунный Плюш', '#ba95ad'],
  ['opal_skater', 'Скользик', '#54899a'],
  ['apricot_bubbler', 'Бульк', '#bd7a79'],
  ['tuft_owlet', 'Совёнок Ушастик', '#5a4636'],
  ['ember_panda', 'Красная панда Огонёк', '#7a2a12'],
  ['puff_kit', 'Ветрёнок Пушинка', '#4e6a2c'],
  ['prism_serpent', 'Радужный змей Ирис', '#1f6a5a'],
  ['dream_sneak', 'Шмыг, сонный лазутчик', '#2c2660'],
  ['storm_lord', 'Раскат, повелитель грозы', '#1f2350'],
  ['eclipse_drake', 'Зенит, дракон затмения', '#82381a'],
  ['bun_panda', 'Пончик и Шустрик', '#2c2736'],
  ['bramble_warden', 'Ежевичный страж', '#56644b'],
  ['gem_beetle', 'Самоцветный жук', '#504b63'],
  ['storm_ram', 'Грозовой баран', '#485c68'],
  ['silk_dragon', 'Шёлковый дракон', '#866851'],
  ['frost_yeti', 'Йети Буран', '#526b73'],
  ['toad_shaman', 'Квакунья', '#4c614e'],
  ['crater_titan', 'Кратерный титан', '#68483c'],
  ['coin_dragon', 'Монетный дракон', '#675a43'],
];
const labels: Record<string, string> = {
  life: 'Жизнь',
  squirrel_peek: 'Белка выглядывает',
  squirrel_throw: 'Белка бросает орех',
  squirrel_cheer: 'Белка радуется',
  squirrel_sleep: 'Белка спит в дупле',
  showreel: 'Все анимации',
  idle: 'Покой',
  'idle-f2': 'Покой во второй фазе',
  walk: 'Ходьба',
  walk_n: 'Шаг на север',
  walk_ne: 'Шаг на северо-восток',
  walk_e: 'Шаг на восток',
  walk_se: 'Шаг на юго-восток',
  walk_s: 'Шаг на юг',
  walk_sw: 'Шаг на юго-запад',
  walk_w: 'Шаг на запад',
  walk_nw: 'Шаг на северо-запад',
  turn: 'Разворот',
  look: 'Взгляд',
  happy: 'Радость',
  'happy-f2': 'Радость во втором облике',
  trick: 'Трюк',
  trick_b: 'Второй трюк',
  trick_c: 'Третий трюк',
  trick_d: 'Четвёртый трюк',
  fidget_a: 'Первый жест',
  fidget_b: 'Второй жест',
  fidget_c: 'Третий жест',
  fidget_d: 'Четвёртый жест',
  tired: 'Усталость',
  sleep_in: 'Засыпание',
  sleep: 'Сон',
  sleep_out: 'Пробуждение',
  wake_startled: 'Испуг во сне',
  hatch: 'Вылупление',
  phase: 'Смена фазы',
  show: 'Представление',
  peek: 'Выглядывание',
  away: 'Уход',
  back: 'Возвращение',
};
const titles: Record<string, Record<string, string>> = {};
// These transitions play inside the walk in Life and in the showreel.
const sequenceOnly: Record<string, string[]> = { zephyr_whorl: ['prepare_walk'], lunar_plush: ['prepare_walk'], opal_skater: ['prepare_walk'], apricot_bubbler: ['prepare_walk'] };
type Clip = { id: string; name: string; frames?: number; sequenceOnly?: boolean };
type Entry = {
  id: string;
  name: string;
  section: string;
  rarity: string;
  clips: Clip[];
  color?: string;
  runtime?: string;
  variants?: { id: string; name: string; atlas: string; clips?: Clip[] }[];
};

// Owner 19.11: «Всего боссов 15, каждый на свой этаж». Adds, heads and echoes are parts of their floor's boss:
// one card per boss, each part a variant with its own clips.
const BOSS_PARTS: Record<string, string[]> = {
  king: ['kinglet'],
  f2_armor: ['f2_mite'],
  f4_idol: ['f4_statue'],
  f9boss: ['f9_head', 'f9_crown'],
  f13boss: ['f13_giant'],
  f15boss: ['f15b_echo_king', 'f15b_echo_mino', 'f15b_echo_serpent', 'f15b_echo_hydra', 'f15b_echo_head', 'f15b_echo_demon'],
};
function groupBossParts(list: Entry[]) {
  const byId = new Map(list.map((e) => [e.id, e]));
  const parts = new Set(Object.values(BOSS_PARTS).flat());
  for (const [boss, ids] of Object.entries(BOSS_PARTS)) {
    const main = byId.get(boss);
    const found = ids.map((id) => byId.get(id)).filter((e): e is Entry => !!e);
    if (!main || found.length !== ids.length) throw Error('Boss parts missing for ' + boss);
    main.variants = [main, ...found].map((e) => ({ id: e.id, name: e.name, atlas: e.id, clips: e.clips }));
  }
  return list.filter((e) => !parts.has(e.id));
}
function readJson(path: string) {
  return readFile(path, 'utf8').then(JSON.parse);
}
function atlas(id: string) {
  return readJson(join(viewer, 'atlases', id, 'atlas.json'));
}

async function nativeEntry(id: string, name: string, color: string, section: string): Promise<Entry> {
  const [{ c }, packed, meta] = await Promise.all([
    loadPainting(id),
    atlas(id),
    readJson(join(import.meta.dirname, '../../assets/creatures', id, 'meta.json')),
  ]);
  const order = ['life', ...Object.keys(meta.animations).filter((clip) => clip !== 'life')];
  const clips = order.map((key) => ({
    id: key,
    name:
      key === 'showreel' && !c.behavior
        ? 'Все приёмы'
        : c.titles?.[key] ?? titles[id]?.[key] ?? c.techniques?.[key]?.title ?? labels[key],
    frames: meta.animations[key].frames,
    ...(sequenceOnly[id]?.includes(key) ? { sequenceOnly: true } : {}),
  }));
  return { id, name, section, rarity: packed.rarity, color, clips };
}
// With no import, preserve the shipped external cards, including their grouped variants.
const externalEntries: Entry[] = process.argv[2]
  ? groupBossParts(await readJson(process.argv[2]))
  : (await readJson(join(viewer, 'catalog.json'))).filter((entry: Entry) => ['archive', 'pets'].includes(entry.section));
const entries: Entry[] = [];
for (const [id, name, color] of works) entries.push(await nativeEntry(id, name, color, 'ours'));
entries.push({
  id: 'rat_king', name: 'Крысиный король', section: 'bosses', rarity: 'secret', color: '#57463f',
  runtime: 'f1', clips: kingCatalogClips(),
});
for (const entry of externalEntries) {
  if (entry.section === 'bosses') entry.section = 'archive';
  entries.push(entry);
}
const seen = new Set<string>();
for (const entry of entries) {
  if (
    seen.has(entry.id) ||
    !entry.name ||
    !entry.clips.length ||
    !['ours', 'bosses', 'pets', 'archive'].includes(entry.section)
  )
    throw Error('Invalid catalog entry: ' + entry.id);
  seen.add(entry.id);
  if (entry.runtime === 'f1') {
    const ids = new Set(entry.clips.map((clip) => clip.id));
    if (ids.size !== 29 || entry.clips.length !== ids.size || !ids.has('life'))
      throw Error('Expected the battle, all 16 game clips and 12 new poses');
    for (const clip of entry.clips) {
      if (!clip.name || !/[А-Яа-яЁё]/.test(clip.name) || (clip.id !== 'life' && !clip.frames))
        throw Error('Invalid native battle clip: ' + clip.id);
    }
    continue;
  }
  for (const { atlas: id, clips } of entry.variants ?? [{ atlas: entry.id, clips: entry.clips }]) {
    const packed = await atlas(id);
    const own = clips ?? entry.clips;
    if (packed.rarity !== entry.rarity || Object.keys(packed.clips).length !== own.length)
      throw Error(id + ' atlas and catalog differ');
    for (const clip of own) {
      if (
        !clip.name ||
        !/[А-Яа-яЁё]/.test(clip.name) ||
        !clip.frames ||
        packed.clips[clip.id]?.length !== clip.frames
      )
        throw Error(id + '/' + clip.id + ' is missing its frames or Russian label');
    }
  }
}
await writeFile(join(viewer, 'catalog.json'), JSON.stringify(entries, null, 2) + '\n');
const clipCount = (e: Entry) =>
  e.variants?.some((v) => v.clips) ? e.variants.reduce((n, v) => n + (v.clips ?? e.clips).length, 0) : e.clips.length;
console.log(entries.length + ' paintings, ' + entries.reduce((n, e) => n + clipCount(e), 0) + ' clips');
