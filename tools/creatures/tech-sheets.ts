// Owner-facing pose boards. Positions are cropped in world coordinates and enlarged only at the last step.
import {
  createCanvas,
  loadImage,
  type Canvas,
  type Image,
  type SKRSContext2D,
} from '@napi-rs/canvas';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blit, compose, frameCount } from './engine';
import { loadPainting } from './render';
import { Px } from './rig/px';
import { sizes, type Creature, type XY } from './types';
import { techniqueContacts, type Technique } from './technique';

const tools = dirname(fileURLToPath(import.meta.url));
const output = join(tools, '../../docs/reports/creatures/pilot-3');
const refs = join(tools, 'test/fixtures/tech-references');
const zoom = 3;
const names: Record<string, string> = {
  bramble_warden: 'Ежевичный страж',
  gem_beetle: 'Жук-таран Самоцвет',
  silk_dragon: 'Шёлковый дракон',
  frost_yeti: 'Йети Буран',
  toad_shaman: 'Квакунья',
  crater_titan: 'Титан Жерло',
  coin_dragon: 'Монетный дракон',
};
const roleNames = {
  rest: 'Покой',
  prep: 'Подготовка',
  strike: 'Начало удара',
  hit: 'Контакт',
  follow: 'Проводка',
  return: 'Возврат',
};
type Role = keyof typeof roleNames;
interface Key {
  role: Role;
  frame: number;
}
interface RefInfo {
  label: string;
  width: number;
  height: number;
  columns: number;
  frames: number;
  anchor?: XY;
  windup: number;
  contact: number;
  recovery: number;
  follow: number;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Panel {
  frame: number;
  role: Role;
  px: Px;
  anchor: XY;
  socket?: XY;
  label?: string;
}
type Painting = Awaited<ReturnType<typeof loadPainting>>;

const style = {
  bg: '#1c2026',
  panel: '#292e35',
  line: '#454a50',
  ground: '#616267',
  text: '#f2eee0',
  soft: '#c0c5c4',
  amber: '#f6bd72',
  mint: '#90dfcf',
  slate: '#93a4b8',
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const slug = (s: string) => typeof s === 'string' && /^[a-z][a-z0-9_-]*$/.test(s);

function readBook(c: Creature, animation?: string): [string, Technique][] {
  const book = c.techniques;
  if (!book) throw Error('Нет принятых ключевых поз для ' + c.id);
  const required = Object.keys(c.animations).filter(
    (a) => a.startsWith('tech_') || a === 'phase' || a === 'show',
  );
  if (animation && !required.includes(animation))
    throw Error('Неизвестный приём ' + c.id + '/' + animation);
  const selected = animation ? [animation] : required;
  return selected.map((a) => {
    const v = book[a],
      where = c.id + '/' + a;
    if (!v || !v.title || !v.weapon || !slug(v.reference) || !Array.isArray(v.keys))
      throw Error('Неполная карточка ' + where);
    if (v.keys.length < 4 || v.keys.length > 6) throw Error('Требуется от 4 до 6 ключей ' + where);
    const count = frameCount(c.animations[a].seconds);
    const roles = new Set<Role>();
    for (let i = 0; i < v.keys.length; i++) {
      const k = v.keys[i];
      if (
        !(k.role in roleNames) ||
        roles.has(k.role) ||
        !Number.isInteger(k.frame) ||
        k.frame < 0 ||
        k.frame >= count ||
        (i > 0 && k.frame <= v.keys[i - 1].frame)
      )
        throw Error('Некорректная последовательность ' + where + ' у кадра ' + k.frame);
      roles.add(k.role);
    }
    if (!roles.has('prep') || !roles.has('hit'))
      throw Error('Не указаны подготовка и контакт ' + where);
    return [a, v];
  });
}

function posePanel(
  painting: Painting,
  name: string,
  tech: Technique,
  k: Key,
  keysOnly: boolean,
): Panel {
  const { c, s, b } = painting,
    t = k.frame / 24,
    border = sizes[c.rarity][3];
  let actor = c;
  if (keysOnly) {
    // Freeze the exact authored key. The normal compositor still performs the same squash,
    // rotation and translation about the feet; no neighbouring interpolated pose is sampled.
    const exact = { ...c.frame(name, t, 0, 'normal'), ghost: undefined, flash: 0 };
    actor = {
      ...c,
      effects: undefined,
      motion: undefined,
      frame: (anim, when, side, variant, motion) =>
        anim === name && Math.abs(when - t) < 1e-8
          ? exact
          : c.frame(anim, when, side, variant, motion),
      animations: { ...c.animations, [name]: { seconds: c.animations[name].seconds, loop: true } },
    };
  }
  const r = compose(actor, s, b, name, t),
    px = new Px(r.picture.w, r.picture.h);
  if (keysOnly && tech.floorSocket && k.role === 'hit') {
    const floor = r.points[tech.floorSocket];
    if (floor) {
      const x = Math.round(floor[0] + border + r.camera[0]),
        y = Math.round(floor[1] + border + r.camera[1]);
      for (let j = y - 3; j <= y + 4; j++)
        for (let i = x - 15; i <= x + 15; i++) px.set(i, j, r.layers.bg.get(i, j));
    }
  }
  if (!keysOnly || c.props) blit(px, r.layers.fxu);
  blit(px, r.layers.body);
  blit(px, r.layers.lit);
  if (!keysOnly || c.props) blit(px, r.layers.fxo);
  blit(px, r.layers.over);
  const socket = r.points[tech.weapon];
  if (!socket)
    throw Error(c.id + '/' + name + ' не проецирует сокет ' + tech.weapon + ' на кадре ' + k.frame);
  return {
    px,
    frame: k.frame,
    role: k.role,
    anchor: [r.worldFeet[0] + border, r.worldFeet[1] + border],
    socket: [socket[0] + border + r.camera[0], socket[1] + border + r.camera[1]],
  };
}

function contentBox(panels: Panel[], markers: boolean): Box {
  let x0 = 0,
    y0 = 0,
    x1 = 0,
    y1 = 0;
  for (const p of panels) {
    const [ox, oy] = p.anchor;
    for (let y = 0; y < p.px.h; y++)
      for (let x = 0; x < p.px.w; x++) {
        if (!p.px.data[(y * p.px.w + x) * 4 + 3]) continue;
        x0 = Math.min(x0, x - ox);
        x1 = Math.max(x1, x - ox);
        y0 = Math.min(y0, y - oy);
        y1 = Math.max(y1, y - oy);
      }
    if (markers && p.socket) {
      const [x, y] = p.socket;
      x0 = Math.min(x0, x - ox - 17);
      x1 = Math.max(x1, x - ox + 17);
      y0 = Math.min(y0, y - oy - 17);
      y1 = Math.max(y1, y - oy + 17);
    }
  }
  const x = Math.floor(x0) - 5,
    y = Math.floor(y0) - 5;
  return { x, y, w: Math.ceil(x1) - x + 6, h: Math.ceil(y1) - y + 6 };
}

const refCache = new Map<string, Promise<{ info: RefInfo; image: Image }>>();
function reference(slug: string) {
  let cached = refCache.get(slug);
  if (!cached) {
    cached = (async () => {
      const info = JSON.parse(readFileSync(join(refs, slug + '.json'), 'utf8')) as RefInfo;
      const { width: w, height: h, frames, columns, windup, contact, follow, recovery } = info;
      if (
        ![w, h, frames, columns].every((v) => Number.isInteger(v) && v > 0) ||
        !info.label ||
        ![windup, contact, follow, recovery].every(
          (v) => Number.isInteger(v) && v >= 0 && v < frames,
        ) ||
        windup > contact ||
        contact > follow ||
        follow > recovery
      )
        throw Error('Некорректные размеры или фазы эталона ' + slug);
      const image = await loadImage(join(refs, slug + '-fx.png'));
      if (image.width !== w * columns || image.height !== h * Math.ceil(frames / columns))
        throw Error('Размер эталона расходится с описанием ' + slug);
      return { info, image };
    })();
    refCache.set(slug, cached);
  }
  return cached;
}
async function refPanels(tech: Technique) {
  const { info, image } = await reference(tech.reference);
  const contact = info.contact;
  const stages: Record<Role, number> = {
    rest: 0,
    prep: info.windup,
    strike: clamp(contact - 2, info.windup, contact),
    hit: contact,
    follow: info.follow,
    return: info.frames - 1,
  };
  return tech.keys.map((k) => {
    const frame = stages[k.role],
      w = info.width,
      h = info.height;
    const scratch = createCanvas(w, h),
      g = scratch.getContext('2d');
    g.drawImage(
      image,
      (frame % info.columns) * w,
      Math.floor(frame / info.columns) * h,
      w,
      h,
      0,
      0,
      w,
      h,
    );
    const px = new Px(w, h);
    px.data.set(g.getImageData(0, 0, w, h).data);
    return {
      role: k.role,
      frame,
      px,
      anchor: info.anchor ?? [Math.floor(w / 2), Math.floor(h * 0.79)],
    } as Panel;
  });
}

function text(
  g: SKRSContext2D,
  label: string,
  x: number,
  y: number,
  size: number,
  color = style.text,
  bold = false,
) {
  g.fillStyle = color;
  g.font = (bold ? 'bold ' : '') + size + 'px DejaVu Sans';
  g.fillText(label, x, y);
}
function save(canvas: Canvas, path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + '.' + process.pid + '.tmp';
  writeFileSync(temp, canvas.toBuffer('image/png'));
  renameSync(temp, path);
}
function line(g: SKRSContext2D, x: number, y: number, w: number, color: string) {
  g.fillStyle = color;
  g.fillRect(x, y, w, 1);
}
function marker(g: SKRSContext2D, x: number, y: number, vector: XY | undefined, contact: boolean) {
  g.save();
  g.lineWidth = 2.4;
  g.strokeStyle = '#191b20';
  g.beginPath();
  g.arc(x, y, 8, 0, 2 * Math.PI);
  g.stroke();
  g.strokeStyle = contact ? style.amber : style.mint;
  g.lineWidth = 1.7;
  g.beginPath();
  g.arc(x, y, 6.2, 0, 2 * Math.PI);
  g.stroke();
  if (vector) {
    const length = Math.hypot(...vector);
    if (length > 0.1) {
      const [u, v] = [vector[0] / length, vector[1] / length];
      const tx = x + u * 32,
        ty = y + v * 32;
      for (const [width, color] of [
        [4.2, '#24242a'],
        [2.2, style.amber],
      ] as const) {
        g.strokeStyle = color;
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(x + u * 10, y + v * 10);
        g.lineTo(tx, ty);
        g.moveTo(tx - u * 7 - v * 4, ty - v * 7 + u * 4);
        g.lineTo(tx, ty);
        g.lineTo(tx - u * 7 + v * 4, ty - v * 7 - u * 4);
        g.stroke();
      }
    }
  }
  g.restore();
}
function approach(panels: Panel[]): XY | undefined {
  const hit = panels.findIndex((p) => p.role === 'hit');
  const end = panels[hit]?.socket;
  if (!end) return;
  for (let j = hit - 1; j >= 0; j--) {
    const earlier = panels[j].socket;
    if (earlier && Math.hypot(end[0] - earlier[0], end[1] - earlier[1]) >= 0.3)
      return [end[0] - earlier[0], end[1] - earlier[1]];
  }
}
interface Row {
  panels: Panel[];
  box: Box;
  label: string;
  markers: boolean;
}
const margin = 24,
  gap = 6,
  caption = 32,
  rowTitle = 34;
function rowHeight(row: Row) {
  return rowTitle + row.box.h * zoom + caption + 12;
}
function drawRow(g: SKRSContext2D, row: Row, y: number, width: number) {
  const { box, panels } = row,
    col = Math.floor((width - gap * (panels.length - 1)) / panels.length);
  const v = row.markers ? approach(panels) : undefined;
  text(g, row.label, margin, y + 23, 18, style.soft, true);
  y += rowTitle;
  panels.forEach((p, i) => {
    const x = margin + (col + gap) * i,
      h = box.h * zoom;
    g.fillStyle = style.panel;
    g.fillRect(x, y, col, h);
    g.save();
    g.beginPath();
    g.rect(x, y, col, h);
    g.clip();
    const ox = x + Math.floor((col - box.w * zoom) / 2) - box.x * zoom,
      oy = y - box.y * zoom;
    line(g, x + 5, Math.round(oy + 0.5), col - 10, style.ground);
    g.imageSmoothingEnabled = false;
    g.drawImage(
      p.px.canvas(),
      Math.round(ox - p.anchor[0] * zoom),
      Math.round(oy - p.anchor[1] * zoom),
      p.px.w * zoom,
      p.px.h * zoom,
    );
    if (row.markers && p.socket) {
      const pointX = ox + (p.socket[0] - p.anchor[0] + 0.5) * zoom,
        pointY = oy + (p.socket[1] - p.anchor[1] + 0.5) * zoom;
      marker(
        g,
        pointX,
        pointY,
        p.role === 'hit' || p.role === 'strike' ? v : undefined,
        p.role === 'hit',
      );
    }
    g.restore();
    if (p.role === 'hit' && !row.markers) {
      g.strokeStyle = '#e35254';
      g.lineWidth = 4;
      g.strokeRect(x + 2, y + 2, col - 4, h - 4);
    }
    text(
      g,
      String(p.frame).padStart(2, '0'),
      x + 6,
      y + h + 21,
      16,
      p.role === 'hit' ? style.amber : style.slate,
      true,
    );
    text(g, p.label ?? roleNames[p.role], x + 44, y + h + 21, 16, style.text);
  });
}
function rowWidth(row: Row) {
  return Math.max(190, row.box.w * zoom) * row.panels.length + gap * (row.panels.length - 1);
}
function background(g: SKRSContext2D, w: number, h: number) {
  g.fillStyle = style.bg;
  g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;
}
async function keySheets(painting: Painting, book: [string, Technique][]) {
  const id = painting.c.id;
  for (const [name, v] of book) {
    const panels = v.keys.map((k) => posePanel(painting, name, v, k, true)),
      row = {
        panels,
        box: contentBox(panels, true),
        label: 'Положение сокета ' + v.weapon + ' и направление усилия к контакту',
        markers: true,
      };
    const w = Math.max(850, rowWidth(row)) + 2 * margin,
      h = 89 + rowHeight(row) + margin;
    const canvas = createCanvas(w, h),
      g = canvas.getContext('2d');
    background(g, w, h);
    text(g, names[id] + '  /  ' + v.title, margin, 40, 29, style.text, true);
    text(
      g,
      id + '  /  ' + name + '     ·     ключевые позы ×3     ·     24 кадра/с',
      margin,
      69,
      17,
      style.slate,
    );
    line(g, margin, 86, w - 2 * margin, style.line);
    drawRow(g, row, 93, w - 2 * margin);
    save(canvas, join(output, 'tech-keys', id, name + '.png'));
  }
}
async function finalSheet(painting: Painting, book: [string, Technique][]) {
  const id = painting.c.id;
  const sections = await Promise.all(
    book.map(async ([name, v]) => {
      const panels = v.keys.map((k) => posePanel(painting, name, v, k, false)),
        sample = await refPanels(v);
      const { info } = await reference(v.reference);
      const rows: Row[] = [
        { panels, box: contentBox(panels, false), markers: false, label: names[id] + ' · ' + name },
        {
          panels: sample,
          box: contentBox(sample, false),
          markers: false,
          label: '«Каторга» · ' + info.label,
        },
      ];
      const hits = techniqueContacts(v).filter(
        (c) => c.frame !== v.keys.find((k) => k.role === 'hit')?.frame,
      );
      const frames = [...new Set(hits.map((c) => c.frame))];
      if (frames.length) {
        const contacts = frames.map((frame) => {
          const panel = posePanel(painting, name, v, { role: 'hit', frame }, false);
          panel.label = hits
            .filter((c) => c.frame === frame)
            .map((c) => c.projectile ?? c.socket)
            .join(' / ');
          return panel;
        });
        rows.push({
          panels: contacts,
          box: contentBox(contacts, false),
          markers: false,
          label: 'Последующие попадания · кадры картины',
        });
      }
      return { name, v, rows, h: 61 + rows.reduce((n, r) => n + rowHeight(r), 0) + 12 };
    }),
  );
  const width = Math.max(900, ...sections.flatMap((s) => s.rows.map(rowWidth)));
  const w = width + 2 * margin,
    h = 100 + sections.reduce((n, s) => n + s.h, 0) + margin;
  const canvas = createCanvas(w, h),
    g = canvas.getContext('2d');
  background(g, w, h);
  text(g, names[id] + ' · приёмы', margin, 43, 31, style.text, true);
  text(
    g,
    'Сопоставление фаз при одинаковом масштабе ×3. Красная рамка отмечает контакт. Под позой указан номер исходного кадра.',
    margin,
    76,
    18,
    style.soft,
  );
  let y = 97;
  for (const section of sections) {
    line(g, margin, y, width, style.line);
    text(g, section.v.title, margin, y + 40, 25, style.amber, true);
    y += 61;
    for (const row of section.rows) {
      drawRow(g, row, y, width);
      y += rowHeight(row);
    }
    y += 12;
  }
  save(canvas, join(output, 'techniques-' + id + '.png'));
}
async function main() {
  const [mode, id, animation, ...extra] = process.argv.slice(2);
  if (
    (mode !== '--keys' && mode !== '--final') ||
    !Object.hasOwn(names, id) ||
    extra.length ||
    (animation && (mode !== '--keys' || !slug(animation)))
  )
    throw Error('node --import tsx tech-sheets.ts --keys <id> [tech] | --final <id>');
  const painting = await loadPainting(id),
    book = readBook(painting.c, animation);
  if (mode === '--keys') await keySheets(painting, book);
  else await finalSheet(painting, book);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
