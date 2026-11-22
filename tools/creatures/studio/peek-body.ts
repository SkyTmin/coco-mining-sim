// Quick look at a creature's body sprites without the painting: frames of one or more clips side by side on a grey
// card, the floor point marked, at ×k. For anatomy work before any effect or scene exists.
//   npx tsx studio/peek-body.ts <id> <anim>:<frame>[,<frame>…][@side] … [--scale k] [--out file.png]
import { loadPainting } from '../render';
import { savePNG } from '../render-io';
import { Px } from '../rig/px';

const args = process.argv.slice(2);
const id = args[0];
const k = Number(args[args.indexOf('--scale') + 1] ?? 2) || 2;
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : `/tmp/${id}-body.png`;
const specs = args.slice(1).filter((a, i, all) => !a.startsWith('--') && !['--scale', '--out'].includes(all[i]) && a.includes(':'));
const { c } = await loadPainting(id);
const cells: { px: Px; anchor: [number, number]; label: string }[] = [];
for (const spec of specs) {
  // a custom pose: pose:{"rear":1,"wingOpen":1}[@side] renders that pose on the idle clock
  if (spec.startsWith('pose:')) {
    const [json, sideS] = spec.slice(5).split('@');
    const fr = c.frame('idle', 0, Number(sideS ?? 0), 'normal', { headSide: Number(sideS ?? 0), gaitPhase: 0, techniquePose: JSON.parse(json) });
    cells.push({ px: fr.over ? merge(fr.px, fr.over) : fr.px, anchor: fr.anchor as [number, number], label: json });
    continue;
  }
  const [clip, rest] = spec.split(':');
  const [list, sideS] = rest.split('@');
  const side = Number(sideS ?? 0);
  for (const f of list.split(',').map(Number)) {
    const fr = c.frame(clip, f / 24, side, 'normal');
    cells.push({ px: fr.over ? merge(fr.px, fr.over) : fr.px, anchor: fr.anchor as [number, number], label: clip + ' ' + f });
  }
}
function merge(a: Px, b: Px) {
  const m = new Px(a.w, a.h);
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * 4;
      const src = b.data[i + 3] ? b.data : a.data;
      for (let q = 0; q < 4; q++) m.data[i + q] = src[i + q];
    }
  return m;
}
// crop every cell to the union of solid pixels round its anchor
let left = 0,
  right = 0,
  up = 0,
  down = 0;
for (const { px, anchor } of cells)
  for (let y = 0; y < px.h; y++)
    for (let x = 0; x < px.w; x++)
      if (px.data[(y * px.w + x) * 4 + 3]) {
        left = Math.max(left, anchor[0] - x);
        right = Math.max(right, x - anchor[0]);
        up = Math.max(up, anchor[1] - y);
        down = Math.max(down, y - anchor[1]);
      }
const cw = left + right + 9,
  ch = up + down + 9;
const sheet = new Px(cw * cells.length * k, ch * k);
cells.forEach(({ px, anchor }, n) => {
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const sx = anchor[0] - left - 4 + x,
        sy = anchor[1] - up - 4 + y;
      let col: [number, number, number, number] = (x + y) % 16 < 8 ? [74, 78, 92, 255] : [80, 84, 98, 255];
      if (sy === anchor[1]) col = [120, 110, 90, 255];
      if (sx >= 0 && sy >= 0 && sx < px.w && sy < px.h) {
        const i = (sy * px.w + sx) * 4;
        if (px.data[i + 3]) col = [px.data[i], px.data[i + 1], px.data[i + 2], 255];
      }
      for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) sheet.set((n * cw + x) * k + xx, y * k + yy, col);
    }
});
savePNG(out, sheet);
console.log(out, sheet.w + '×' + sheet.h, cells.map((c) => c.label).join(' | '));
