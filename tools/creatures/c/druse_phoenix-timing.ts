export const frames = {
  notes: [40, 60, 82],
  crownRelease: 34,
  crownSeat: 77,
  ringIgnite: 34,
  ringClosed: 59,
  ringCrystal: 67,
  ringRoll: 74,
  ringJump: 98,
  rebirthSplit: 70,
  showSplit: 64,
  feather: 42,
} as const;

export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => v * v * (3 - 2 * v);
export const progress = (n: number, start: number, end: number) => clamp((n - start) / (end - start));
export const ramp = (n: number, start: number, end: number) => ease(progress(n, start, end));
