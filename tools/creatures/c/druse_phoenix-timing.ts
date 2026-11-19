export const frames = {
  notes: [27, 52, 77],
  crownRelease: 21,
  crownSeat: 82,
  ringIgnite: 25,
  ringClosed: 54,
  ringCrystal: 66,
  ringRoll: 71,
  ringJump: 97,
  rebirthSplit: 65,
  showSplit: 64,
  feather: 42,
} as const;

export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => v * v * (3 - 2 * v);
export const progress = (n: number, start: number, end: number) => clamp((n - start) / (end - start));
export const ramp = (n: number, start: number, end: number) => ease(progress(n, start, end));
