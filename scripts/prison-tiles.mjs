// Build the 14 world 1–3 tiles and the shared opening mask. Requires FFmpeg.
// The three substrate images are from SkyTmin/coco-prison-roblox, stage-1.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const blocks = new URL("../assets/textures/blocks/", import.meta.url);
const tileSize = 16;
const atlasSize = 1024;
const maskY = 256;

const rock = {
  dirt: ["593721", "69442c", "795233", "895d3b", "986b44", "a77750"],
  terracotta: ["60382c", "734234", "89503a", "9b5a3f", "ad684b", "bc795a"],
  stone: ["787d84", "898e96", "9a9da4", "a9acb2", "b8b9c0", "c7c8cb"],
};

const tiles = [
  ["meadow_stone", "dirt", ["575963", "6e7379", "8b9092", "a4a5a1"]],
  ["meadow_coal", "dirt", ["242028", "35323a", "4b4953", "65636b"]],
  ["meadow_copper", "dirt", ["733c29", "ad5630", "cc7741", "f1a366"]],
  ["meadow_firefly_amber", "dirt", ["7c471e", "b47b2a", "e6ab42", "ffe798"], true],
  ["copper_caves_red_stone", "terracotta"],
  ["copper_caves_copper", "terracotta", ["713a29", "ae552c", "d6844b", "f9b171"]],
  ["copper_caves_tin", "terracotta", ["5b585d", "798084", "a0a9ac", "d0d6d1"]],
  ["copper_caves_malachite", "terracotta", ["295042", "387858", "51a36b", "89c880"]],
  ["copper_caves_turquoise", "terracotta", ["225a60", "318587", "4bb1ac", "b5fff1"], true],
  ["quartz_veins_white_stone", "stone"],
  ["quartz_veins_quartz", "stone", ["6f7586", "babac6", "dfdce1", "fff8ed"]],
  ["quartz_veins_iron", "stone", ["4f525c", "676b74", "8a8790", "b6a7a1"]],
  ["quartz_veins_rose_quartz", "stone", ["874f64", "af687d", "d58e9e", "f4bdc7"]],
  ["quartz_veins_amethyst", "stone", ["4b3865", "795297", "a372c4", "e9c2ff"], true],
];

const patterns = [
  ["  x ", " xxx", " xox", " xx "],
  [" xx", "xox", "xxx", " x "],
  [" xx ", "xxxx", "xox ", " xx "],
  ["  x ", " xxx", "xoxx", "xxx "],
];
const centres = [[2, 2], [10, 3], [3, 10], [10, 11]];

function rgba(hex) {
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(255);
}

function readSubstrate(name) {
  const path = fileURLToPath(new URL("reference/" + name + ".png", blocks));
  const raw = execFileSync("ffmpeg", [
    "-v", "error", "-i", path, "-vf", "scale=16:16:flags=area,format=rgb24",
    "-frames:v", "1", "-f", "rawvideo", "pipe:1",
  ]);
  const light = Array.from({ length: 256 }, (_, i) => {
    const j = i * 3;
    return raw[j] * 0.213 + raw[j + 1] * 0.715 + raw[j + 2] * 0.072;
  });
  const sorted = [...light].sort((a, b) => a - b);
  const cuts = [0.12, 0.28, 0.48, 0.72, 0.9].map(q => sorted[Math.floor(q * 255)]);
  return light.map(v => rock[name][cuts.filter(cut => v > cut).length]);
}

function grid(id, substrate, ore, treasure, index) {
  const pixels = [...substrate];
  // Wrap boundary texels and keep the inlays within the shared edges.
  for (let i = 0; i < tileSize; i++) {
    pixels[i * tileSize + 15] = pixels[i * tileSize];
    pixels[15 * tileSize + i] = pixels[i];
  }
  pixels[255] = pixels[0];
  if (ore) {
    for (let i = 0; i < centres.length; i++) {
      const [x0, y0] = centres[(i + index) % centres.length];
      const x = x0 + ((index + i) % 3 === 0 ? 1 : 0);
      const y = y0 + ((index + 2 * i) % 4 === 0 ? -1 : 0);
      const shape = patterns[(i + index * 3) % patterns.length];
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          const mark = shape[row][col];
          if (mark === " ") continue;
          const shade = mark === "o" ? (treasure && i !== 2 ? 3 : 2) :
            (row + col + index) % 4 === 0 ? 0 : 1;
          pixels[(y + row) * tileSize + x + col] = ore[shade];
        }
      }
    }
  }
  if (new Set(pixels).size > 12) throw new Error(id + " palette exceeds 12 colors");
  for (let i = 0; i < 16; i++) {
    if (pixels[i * 16] !== pixels[i * 16 + 15] || pixels[i] !== pixels[240 + i]) {
      throw new Error(id + " does not wrap");
    }
  }
  return pixels.map(rgba);
}

function writePng(url, size, bytes) {
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "rawvideo", "-pixel_format", "rgba",
    "-video_size", size + "x" + size, "-i", "pipe:0", "-frames:v", "1", "-update", "1", fileURLToPath(url),
  ], { input: bytes });
}

const directory = new URL("prison/", blocks);
mkdirSync(directory, { recursive: true });
const bases = Object.fromEntries(Object.keys(rock).map(name => [name, readSubstrate(name)]));
const atlas = Buffer.alloc(atlasSize * atlasSize * 4);
const write = (x, y, color) => atlas.set(color, 4 * (y * atlasSize + x));
for (let i = 0; i < tiles.length; i++) {
  const [id, ground, ore, treasure] = tiles[i];
  const cells = grid(id, bases[ground], ore, treasure, i);
  writePng(new URL(id + ".png", directory), tileSize, Buffer.from(cells.flat()));
  const left = (i % 4) * 64;
  const top = Math.floor(i / 4) * 64;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) write(left + x, top + y, cells[(y >> 2) * 16 + (x >> 2)]);
  }
}

// Seven two-pixel columns per row. The player receives the real geometry ahead of this silhouette.
for (let mask = 0; mask < 128; mask++) {
  for (let column = 0; column < 7; column++) {
    if ((mask & (1 << column)) === 0) continue;
    const x = (mask % 16) * 16 + 2 * column;
    const y = maskY + Math.floor(mask / 16) * 4;
    for (let row = 0; row < 2; row++) {
      write(x, y + row, [25, 19, 25, 255]);
      write(x + 1, y + row, [19, 16, 23, 255]);
    }
  }
}
writePng(new URL("../prison-1024.png", blocks), atlasSize, atlas);
console.log(tiles.length + " wrapping 16x16 tiles in a 1024x1024 atlas");
