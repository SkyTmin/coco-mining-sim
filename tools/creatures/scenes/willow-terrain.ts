// Cross-section of the otter run. The animal and the painted clay share the same track.
const knots = [[0, 57], [12, 51], [26, 48], [36, 48], [44, 51], [51, 56],
  [61, 66], [73, 80], [85, 92], [92, 97], [100, 100]];
export function slideSurface(x: number) {
  for (let i = 1; i < knots.length; i++) {
    const [a, y] = knots[i - 1], [b, end] = knots[i];
    if (x <= b) return y + (end - y) * Math.max(0, (x - a) / (b - a));
  }
  return 100;
}
export const bank = (x: number) => 57 + 12 * Math.sin(x * 0.031 + 1.8) + 8 * Math.sin(x * 0.066 + 0.8);
export const shoal = (y: number) => 23 + (y - 58) * 0.82 + Math.sin(y * 0.084) * 12 + 19 * Math.exp(-((y - 99) ** 2) / 250);
export const cliffBase = (x: number) => slideSurface(x) + 4 + 39 * Math.max(0, 1 - x / 96) ** 0.72;
export function isRiver(x: number, y: number) {
  return x >= 0 && x < 160 && y >= 43 && y < 128 && !(y >= bank(x) && x < shoal(y)) &&
    !(x < 96 && y >= slideSurface(x) - 5 && y <= cliffBase(x));
}
export const riverRows = Array.from({ length: 128 }, (_, y) => {
  const ends: number[] = [];
  let wet = false;
  for (let x = 0; x <= 160; x++) {
    const next = isRiver(x, y);
    if (wet !== next) ends.push(x);
    wet = next;
  }
  return ends;
});
