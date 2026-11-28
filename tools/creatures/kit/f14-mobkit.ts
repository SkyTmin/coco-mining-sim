// From SkyTmin/coco-instruments dungeon-floors/f14-mobkit.ts, commit 523bae1 (MIT).
import { clamp01,hx,lerp,smooth,spark2,TAU,type Ease } from './f11-mobkit';
import type { RigOut,Tones } from '../rig/f15-rig';
import type { Px } from '../rig/px';
/** Пружинный выход за цель и назад (механизм — с отскоком). */
export const easeBack = (k: number) => {
  const x = clamp01(k);
  const s = 1.9;
  return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
};

const STAR_A = hx('#fff27a');
const STAR_B = hx('#ffffff');

/** Звёздочки по кругу над головой (`ph` 0…1 — фаза кружения). */
export function stars(o: RigOut, cx: number, cy: number, rx: number, ph: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const a = ph * TAU + (i / n) * TAU;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * rx * 0.35);
    const front = Math.sin(a) > -0.2;
    spark2(o, x, y, STAR_B, front ? 0.9 : 0.4);
    if (front) {
      spark2(o, x - 1, y, STAR_A, 0.5);
      spark2(o, x + 1, y, STAR_A, 0.5);
    }
  }
}

/** Свет экрана для 2D-фаски (сверху-слева). */
const LX = -0.45;
const LY = -0.72;

/**
 * Плоская шестерёнка в 2D (разлёт деталей, пружины): диск с зубьями,
 * ступица; `rot` — поворот; фаска светлая сверху-слева.
 */
export function cog2(
  p: Px,
  cx: number,
  cy: number,
  r: number,
  teeth: number,
  rot: number,
  t: Tones,
): void {
  const tooth = Math.max(1, r * 0.28);
  const body = r - tooth;
  const hole = Math.max(0.6, r * 0.22);
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dd = Math.hypot(dx, dy);
      if (dd > r || dd < hole) continue;
      const a = Math.atan2(dy, dx) - rot;
      const fr = ((((a / TAU) * teeth) % 1) + 1) % 1;
      if (dd > body && (fr < 0.25 || fr > 0.75)) continue;
      const lit = -((dx / (dd || 1)) * LX + (dy / (dd || 1)) * LY);
      const l = dd > body - 0.8 ? 0.5 - lit * 0.8 : 0.55;
      p.set(x, y, l > 0.78 ? t[3] : l > 0.42 ? t[2] : l > 0.1 ? t[1] : t[0]);
    }
}

// ---------------------------------------------------------------------------
// Позы ключами: смешение полей (числа и векторы) и дорожка ключевых поз.
// ---------------------------------------------------------------------------

/** Смесь двух поз: числа и векторы — линейно. */
export function mixPose<T extends object>(a: T, b: T, k: number): T {
  const A = a as Record<string, unknown>;
  const Bv = b as Record<string, unknown>;
  const o: Record<string, unknown> = { ...A };
  for (const key of Object.keys(A)) {
    const x = A[key];
    const y = Bv[key];
    if (typeof x === 'number') o[key] = lerp(x, y as number, k);
    else if (Array.isArray(x))
      o[key] = x.map((v: number, i: number) => lerp(v, (y as number[])[i], k));
  }
  return o as T;
}

export type KeyPose<T> = [number, Partial<T>, Ease?];

/** Ключевые позы по времени поверх `base` (кривая — у ключа, к которому идём). */
export function keyPose<T extends object>(T: number, keys: KeyPose<T>[], base: T): T {
  const full = (p: Partial<T>): T => ({ ...base, ...p });
  if (T <= keys[0][0]) return full(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1, e] = keys[i];
    if (T <= t1) {
      const [t0, p0] = keys[i - 1];
      const x = (T - t0) / (t1 - t0 || 1);
      return mixPose(full(p0), full(p1), (e ?? smooth)(clamp01(x)));
    }
  }
  return full(keys[keys.length - 1][1]);
}
