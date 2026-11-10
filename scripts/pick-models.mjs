// Convert all seventeen owner sprites to one-pixel-thick, greedily merged voxel grids.
// Usage: node scripts/pick-models.mjs (requires FFmpeg, as does build-sounds.mjs).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const size = 24;
const source = new URL("../assets/ui/picks/", import.meta.url);
const target = new URL("../src/shared/Models/", import.meta.url);

function readGrid(id) {
  const file = fileURLToPath(new URL("icon-" + id + "-l.webp", source));
  const filter = "format=rgba,scale=24:24:force_original_aspect_ratio=decrease:flags=area," +
    "pad=24:24:(ow-iw)/2:(oh-ih)/2:color=black@0";
  const bytes = execFileSync("ffmpeg", [
    "-v", "error", "-i", file, "-vf", filter, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1",
  ]);
  if (bytes.length !== size * size * 4) throw new Error("Invalid sprite grid " + id);
  return Array.from({ length: size * size }, (_, i) => {
    const at = i * 4;
    if (bytes[at + 3] < 128) return null;
    const rgb = [bytes[at], bytes[at + 1], bytes[at + 2]];
    return { rgb, band: rgb.map(channel => Math.round(channel / 22)).join(",") };
  });
}

function model(id) {
  const grid = readGrid(id);
  const gripY = Math.floor(size * 0.77);
  const handle = Array.from({ length: size }, (_, x) => x + 0.5)
    .filter(x => grid[gripY * size + Math.floor(x)]);
  if (!handle.length) throw new Error("Missing grip on sprite " + id);
  const grip = [handle.reduce((a, b) => a + b, 0) / handle.length, gripY + 0.5];
  const rects = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pixel = grid[y * size + x];
      if (!pixel) continue;
      const matches = (column, row) => grid[row * size + column]?.band === pixel.band;
      let w = 1;
      while (x + w < size && matches(x + w, y)) w++;
      let h = 1;
      while (y + h < size) {
        if (!Array.from({ length: w }, (_, i) => matches(x + i, y + h)).every(Boolean)) break;
        h++;
      }
      const sum = [0, 0, 0];
      for (let row = y; row < y + h; row++) {
        for (let col = x; col < x + w; col++) {
          const i = row * size + col;
          grid[i].rgb.forEach((value, channel) => { sum[channel] += value; });
          grid[i] = null;
        }
      }
      const color = sum.reduce((packed, value) => packed * 256 + Math.round(value / (w * h)), 0);
      rects.push([x, y, w, h, color]);
    }
  }
  return { grip, rects };
}

const grids = Array.from({ length: 17 }, (_, id) => model(id));
mkdirSync(target, { recursive: true });
writeFileSync(new URL("picks.json", target), "[\n" + grids.map(grid => JSON.stringify(grid)).join(",\n") + "\n]\n");
console.log("17 voxel pickaxes: " + grids.map(grid => grid.rects.length).join(", ") + " rectangles");
