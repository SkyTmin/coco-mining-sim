// From SkyTmin/coco-instruments dungeon-floors/f13-art.ts, commit 523bae1 (MIT).
import { Px } from '../rig/px';
import { smooth as ease,type Ease } from './f11-mobkit';
type Limb = {sw:number;out:number;bend:number};
type Pose = object;
type MobFrame = { img: ReturnType<Px['canvas']>; ax:number; ay:number; eye:[number,number]|null; lit:ReturnType<Px['canvas']>|null; still:boolean };
type PoseRec = Record<string, number | Limb>;
const mixLimb = (a: Limb, b: Limb, k: number): Limb => ({
  sw: a.sw + (b.sw - a.sw) * k,
  out: a.out + (b.out - a.out) * k,
  bend: a.bend + (b.bend - a.bend) * k,
});
/** Конечность от базовой со сдвигом (для поз-добавок). */
/** Смесь поз: числа и конечности (k вне 0…1 — перелёт). */
export function mixP<T extends Pose>(a: T, b: T, k: number): T {
  if (k === 0) return a;
  if (k === 1) return b;
  const A = a as unknown as PoseRec;
  const B = b as unknown as PoseRec;
  const o: PoseRec = { ...A };
  for (const key in B) {
    const vb = B[key];
    const va = A[key] ?? vb;
    o[key] =
      typeof vb === 'number'
        ? (va as number) + (vb - (va as number)) * k
        : mixLimb(va as Limb, vb, k);
  }
  return o as unknown as T;
}

/** Добавка поверх живой позы: a + (b − ref)·k. */
export function addP<T extends Pose>(a: T, b: T, ref: T, k = 1): T {
  const A = a as unknown as PoseRec;
  const B = b as unknown as PoseRec;
  const R = ref as unknown as PoseRec;
  const o: PoseRec = { ...A };
  for (const key in B) {
    const vb = B[key];
    const vr = R[key] ?? vb;
    const va = A[key] ?? vr;
    if (typeof vb === 'number') o[key] = (va as number) + (vb - (vr as number)) * k;
    else {
      const l = va as Limb;
      const r = vr as Limb;
      o[key] = {
        sw: l.sw + (vb.sw - r.sw) * k,
        out: l.out + (vb.out - r.out) * k,
        bend: l.bend + (vb.bend - r.bend) * k,
      };
    }
  }
  return o as unknown as T;
}

type PKey<T> = readonly [number, T, Ease?];
/** Поза на треке в момент t; кривая — у ключа, к которому идём. */
export function track<T extends Pose>(t: number, keys: readonly PKey<T>[]): T {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t < k1[0]) {
      const k0 = keys[i - 1];
      return mixP(k0[1], k1[1], (k1[2] ?? ease)((t - k0[0]) / (k1[0] - k0[0])));
    }
  }
  return keys[keys.length - 1][1];
}
const trackEnd = <T>(keys: readonly PKey<T>[]) => keys[keys.length - 1][0];

/** Номер кадра техники: 24 к/с от времени режима, не дальше `end`. */
export const F24 = (t: number, end = 99) =>
  Math.max(0, Math.min(Math.floor(t * 24 + 1e-6), Math.ceil(end * 24)));
/** Пружина (полунеявный Эйлер, шаг ≤ 1/120 с). */
export function spring(
  x: number,
  v: number,
  to: number,
  w: number,
  z: number,
  dt: number,
): [number, number] {
  const n = Math.max(1, Math.ceil(dt * 120));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    v += (-w * w * (x - to) - 2 * z * w * v) * h;
    x += v * h;
  }
  return [x, v];
}
/** Вырезать прямоугольник из буфера пикселей. */
function cutPx(p: Px, x0: number, y0: number, w: number, h: number): Px {
  const o = new Px(w, h);
  for (let y = 0; y < h; y++) {
    const s = ((y0 + y) * p.w + x0) * 4;
    o.data.set(p.data.subarray(s, s + w * 4), y * w * 4);
  }
  return o;
}

/** Рамка рисунка по обоим слоям (кадр в кеше — без пустых полей). */
function cropBox(
  a: Px,
  b: Px | null,
  boxA?: [number, number, number, number],
): [number, number, number, number] {
  let x0 = a.w;
  let y0 = a.h;
  let x1 = -1;
  let y1 = -1;
  for (const p of b ? [a, b] : [a]) {
    const d = p.data;
    // У тела рамку уже знает `renderRig` — сканируем только её.
    const [X0, Y0, X1, Y1] = p === a && boxA ? boxA : [0, 0, p.w - 1, p.h - 1];
    for (let y = Y0; y <= Y1; y++)
      for (let x = X0; x <= X1; x++)
        if (d[(y * p.w + x) * 4 + 3] > 0) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
  }
  return x1 < 0 ? [0, 0, 1, 1] : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

/** Кадр из буферов с обрезкой: точка ног и метки сдвигаются вместе. */
export function cropFrame(
  px: Px,
  lit: Px | null,
  ax: number,
  ay: number,
  extra: Partial<MobFrame> = {},
  boxA?: [number, number, number, number],
): { fr: MobFrame; x0: number; y0: number } {
  const [x0, y0, w, h] = cropBox(px, lit, boxA);
  const img = cutPx(px, x0, y0, w, h);
  const lt = lit ? cutPx(lit, x0, y0, w, h) : null;
  return {
    fr: {
      img: img.canvas(),
      ax: ax - x0,
      ay: ay - y0,
      eye: null,
      lit: lt ? lt.canvas() : null,
      still: true,
      ...extra,
    },
    x0,
    y0,
  };
}
