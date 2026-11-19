import { MOB_PAINTERS, ZONE_PAINTERS, IMPACT_PAINTERS, setPaintSim } from './source/dungeon-paint';
import { PoseClock, tintOf } from './source/dungeon-render';
import { petFrame } from './source/dungeon-floors/f1-art';
import './source/dungeon-floors/f1-boss-fx';
import { burrowFront, burrowSide } from './source/dungeon-art';
import { F1 } from './source/dungeon-floors/f1';
import { specs } from '../bosses/specs.mjs';
import { petFrames } from './poses';
import { sampleClip } from './preview';
export { createBattle } from './battle.mjs';

// Contact effects have their own lifetime after the brain leaves the attack mode.
const windows = {
  dying: 1.5,
  cleaveAim: 2.45,
  whipAim: 2.0,
  sweepAim: 2.81,
  leap: 3.3,
  summon: 2.6,
};
export const F1_CLIPS = Object.fromEntries(
  specs
    .find((s) => s.kind === 'king')
    .rows.map((row) => [row.id, { label: row.label, duration: windows[row.id] ?? row.dur }]),
);
const labels = {
  fidget_a: 'Осматривает крышку',
  fidget_b: 'Принюхивается',
  look: 'Осматривается',
  happy: 'Радость',
  trick: 'Трюк',
  sleep_in: 'Засыпает',
  sleep: 'Сон',
  sleep_out: 'Пробуждение',
  wake_startled: 'Резкое пробуждение',
  hatch: 'Появление',
  turn: 'Поворот',
  tired: 'Усталость',
};
export const F1_POSES = Object.fromEntries(
  Object.entries(petFrames).map(([id, n]) => [id, { label: labels[id], duration: n / 24 }]),
);
const clock = new PoseClock();
const defs = new Map(F1.mobs.map((m) => [m.id, m]));
const buffers = new WeakMap();
const trails = new WeakMap();

function place(g, img, frame, x, y, alpha) {
  g.save();
  g.globalAlpha = Math.min(1, Math.max(0, alpha));
  g.translate(x, y);
  g.rotate(frame.rot ?? 0);
  g.scale(frame.sx ?? 1, frame.sy ?? 1);
  g.drawImage(img, -frame.ax, -frame.ay);
  g.restore();
}
function paintActor(g, m, sim, ghosts, fx) {
  const painter = MOB_PAINTERS.get(defs.get(m.kind)?.art.id);
  if (!painter || (m.mode === 'emerge' && m.t <= 0)) return;
  const x = Math.round(m.x * 16),
    y = Math.round(m.y * 16);
  clock.time = m.poseTime ?? sim.time;
  const pose = clock.mobPose(m);
  let f;
  if (m.data.petMode) f = petFrame(m, { ...pose, mode: m.data.petMode }, m.data.petProgress);
  f ??= painter(m, pose);
  if (!f) return;
  const alpha = (f.alpha ?? 1) * (m.mode === 'emerge' ? Math.min(1, m.t / 0.25) : 1);
  const rx = f.shadow ?? 0.36 * f.img.width * 0.7;
  if (rx > 0) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(x, y, Math.max(2, rx), Math.max(1.5, rx * 0.28), 0, 0, 2 * Math.PI);
    g.fill();
  }
  const px = x + (f.dx ?? 0),
    py = y + (f.dy ?? 0);
  place(g, f.img, f, px, py, alpha);
  if (f.lit) place(g, f.lit, f, px, py, alpha);
  if (f.eye) {
    g.fillStyle = '#ff3a28';
    g.fillRect(Math.round(px - f.ax + f.eye[0]), Math.round(py - f.ay + f.eye[1]), 1, 1);
  }
  if (fx && f.ghost && m.mode !== 'dying' && sim.time >= (ghosts.next.get(m.id) ?? -1)) {
    ghosts.next.set(m.id, sim.time + f.ghost.every);
    ghosts.items.push({
      frame: f,
      img: tintOf(f.img, f.ghost.tint),
      x: px,
      y: py,
      at: sim.time,
      life: f.ghost.life,
      alpha: (f.ghost.alpha ?? 0.38) * alpha,
    });
  }
}

function paintScene(g, sim, fx, historyKey) {
  let ghosts = trails.get(historyKey);
  if (!ghosts || sim.time < ghosts.time) {
    ghosts = { items: [], next: new Map(), time: sim.time };
    trails.set(historyKey, ghosts);
  }
  ghosts.time = sim.time;
  const layer = (above) => {
    if (!fx) return;
    for (const z of [...sim.zones, ...sim.strikes]) {
      if (!!z.above !== above) continue;
      const paint = ZONE_PAINTERS.get(z.art);
      if (paint) {
        g.save();
        paint(g, z, z.x * 16, z.y * 16, 16, sim.time);
        g.restore();
      }
    }
    for (const rec of sim.impacts ?? []) {
      const def = IMPACT_PAINTERS.get(rec.art);
      if (!def || !!def.above !== above) continue;
      const age = rec.age ?? rec.t ?? 0;
      if (age < def.life) {
        g.save();
        def.paint(g, rec, rec.x * 16, rec.y * 16, 16, age, sim.time);
        g.restore();
      }
    }
  };
  setPaintSim(sim);
  try {
    if (sim.paintBurrows)
      for (const { obj } of sim.burrows) {
        const [ox, oy] = obj.out;
        if (obj.face === 'front' || Math.abs(ox - obj.x) < 0.25) {
          g.drawImage(burrowFront(), Math.round(obj.x * 16), Math.round(obj.y * 16));
        } else {
          g.drawImage(burrowSide(ox < obj.x), Math.round(ox * 16), Math.round(oy * 16));
        }
      }
    layer(false);
    ghosts.items = ghosts.items.filter((gh) => sim.time - gh.at < gh.life);
    if (fx)
      for (const gh of ghosts.items)
        place(g, gh.img, gh.frame, gh.x, gh.y, gh.alpha * (1 - (sim.time - gh.at) / gh.life));
    for (const m of [...sim.mobs].sort((a, b) => a.y - b.y)) paintActor(g, m, sim, ghosts, fx);
    layer(true);
    if (fx && sim.paintBurrows && sim.flashTime > 0) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = sim.flashColor ?? '#fff0e6';
      g.globalAlpha = Math.min(0.35, sim.flashTime * 2);
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      g.restore();
    }
  } finally {
    setPaintSim(null);
  }
}

function render(g, sim, { scale = 2, originX = 0, originY = 0, fx = true }, key) {
  // All alpha blending, rotations and pixel strokes run on the game's 1× lattice.
  let surface = buffers.get(g);
  if (!surface) {
    surface = document.createElement('canvas');
    buffers.set(g, surface);
  }
  const w = Math.ceil(g.canvas.width / scale),
    h = Math.ceil(g.canvas.height / scale);
  if (surface.width !== w) surface.width = w;
  if (surface.height !== h) surface.height = h;
  const p = surface.getContext('2d');
  p.clearRect(0, 0, w, h);
  p.save();
  p.imageSmoothingEnabled = false;
  p.translate(Math.round(originX / scale), Math.round(originY / scale));
  try {
    paintScene(p, sim, fx, key);
  } finally {
    p.restore();
  }
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(surface, 0, 0, w * scale, h * scale);
  g.restore();
}
export function drawBattle(ctx, sim, opts = {}) {
  render(ctx, { ...sim, paintBurrows: true }, opts, sim);
}

function sample(
  {
    kind = 'king',
    clip = 'idle',
    direction = 0,
    progress = 0,
    phase = 1,
    x,
    y,
    scale = 2,
    id = 7,
    fx = true,
    variant = 0,
    travel = false,
  },
  holeOffset?,
) {
  const duration = F1_CLIPS[clip]?.duration ?? F1_POSES[clip]?.duration ?? 1;
  const t = Math.min(1, Math.max(0, progress)) * duration;
  const { sim, m, key } = sampleClip(kind, clip, direction, phase, id, variant, t, holeOffset);
  const camera = {
    scale,
    fx,
    originX: travel ? x : x - m.x * 16 * scale,
    originY: travel ? y : y - m.y * 16 * scale,
  };
  return { sim, key, camera };
}

export function drawActor(ctx, options) {
  const { sim, key, camera } = sample(options);
  render(ctx, sim, camera, key);
}

// Both timelines share one floor pass, one depth sort and one airborne FX pass.
export function drawPreview(ctx, options, ensemble, battleCamera = {}) {
  const unit = 16 * (options.scale ?? 2);
  const holes = [
    ((battleCamera.originX ?? 0) - options.x) / unit,
    ((battleCamera.originY ?? 0) - options.y) / unit,
  ];
  const { sim, key, camera } = sample(options, holes);
  if (!ensemble) return render(ctx, { ...sim, paintBurrows: true }, camera, key);
  const companions = ensemble.mobs.filter((m) => m.kind !== 'king');
  const ids = new Set(companions.map((m) => m.id));
  const dx = ((battleCamera.originX ?? 0) - camera.originX) / (camera.scale * 16);
  const dy = ((battleCamera.originY ?? 0) - camera.originY) / (camera.scale * 16);
  const shifted = (p) => ({ ...p, x: p.x + dx, y: p.y + dy });
  const moveMob = (m) => ({
    ...shifted(m),
    poseTime: ensemble.time,
    tele: m.tele?.x !== undefined ? shifted(m.tele) : m.tele,
  });
  const owned = (records) =>
    records.filter((z) => ids.has(z.ownerId ?? z.from) && !/^f1_kingtele/.test(z.art)).map(shifted);
  render(
    ctx,
    {
      ...sim,
      mobs: [...sim.mobs, ...companions.map(moveMob)],
      paintBurrows: true,
      burrows: ensemble.burrows.map(({ obj }) => ({
        obj: { ...shifted(obj), out: [obj.out[0] + dx, obj.out[1] + dy] },
      })),
      zones: [...sim.zones, ...owned(ensemble.zones)],
      strikes: [...sim.strikes, ...owned(ensemble.strikes)],
      impacts: [...sim.impacts, ...owned(ensemble.impacts ?? [])],
    },
    camera,
    key,
  );
}
