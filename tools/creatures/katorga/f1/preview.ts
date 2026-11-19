// The clip picker runs the same brain and SimApi as the painting. On reaching the
// next attack decision it keeps the subject still while contacts and allies finish.
import { createArena } from './battle.mjs';
import { petFrames } from './poses';
import behavior from './behavior.json';

const step = 1 / 60;
const sessions = new Map();
const still = new Set(['idle', 'dying', 'emerge', 'windup', 'bite', 'guard']);
const active = new Set([
  'roar',
  'chase',
  'rollAim',
  'roll',
  'whipAim',
  'cleaveAim',
  'summon',
  'swap',
  'sweepAim',
  'leapAim',
  'leap',
  'dizzy',
  'stun',
  'recover',
]);
function begin(kind, clip, direction, phase, id, variant, holeOffset) {
  const [dx, dy] = holeOffset;
  const previewHoles = behavior.burrows.map(([x, y, ox, oy]) => [x + dx, y + dy, ox + dx, oy + dy]);
  const angle = (direction * Math.PI) / 4,
    cs = Math.cos(angle),
    sn = Math.sin(angle);
  const targetRange = clip === 'roll' || clip === 'rollAim' ? 12 : 3.2;
  const arena = createArena({
    ...behavior,
    throne: [0, 0],
    walkLimits: [-4.1, -4.1, 4.1, 4.1],
    targetRoute: [[cs * targetRange, sn * targetRange]],
    burrows: previewHoles,
  });
  const { sim, lead, api } = arena;
  const m = kind === 'king' ? lead : api.spawnMob(sim, kind === 'guard' ? 'f1_guard' : kind, 0, 0);
  sim.mobs = [m];
  m.id = id;
  sim.nextId = Math.max(1000, id + 1);
  m.face = m.dir = angle;
  m.summonCd = 99;
  sim.hero.inv = 999;
  sim.boss.phase = phase - 1;
  api.setMode(m, clip);
  Object.assign(m.data, {
    f1split: Number(phase >= 3),
    f1blade: Number(phase === 4 || ['swap', 'leapAim', 'leap', 'sweepAim'].includes(clip)),
    combo: 3,
    petVariant: variant,
  });
  const zone = (art, x, y, life, extra = {}) =>
    api.zone(sim, { art, x, y, life, r: 0.5, ...extra });
  if (clip === 'swap') {
    zone('f1_cleaver', -0.9, 0.4, 90);
    for (const above of [false, true])
      zone('f1_cleaverdrop_hit' + (above ? 'L' : ''), -0.9, 0.4, 1.3, { above });
  }
  if (clip === 'summon')
    for (const h of sim.burrows) {
      const [ox, oy] = h.obj.out;
      zone('f1_bulge', ox + 0.5, oy + 0.5, 1.9);
    }
  if (clip === 'leap') {
    Object.assign(m.data, { lx: cs * 2, ly: sn * 2, sx: 0, sy: 0 });
    zone('f1_takeoff', 0, 0, 1, { vAng: angle });
  }
  if (clip === 'leapAim') Object.assign(m.data, { lx: sim.hero.x, ly: sim.hero.y });
  return { arena, sim, m, clip, cs, sn, ticks: 0, key: {} };
}
function tick(s) {
  s.ticks++;
  const { arena, sim, m, clip, cs, sn } = s;
  if (clip === 'chase') {
    // Maintain the selected heading while allowing the source stride to advance.
    m.t = Math.min(m.t, 0.65);
    sim.hero.x = m.x + cs * 3.2;
    sim.hero.y = m.y + sn * 3.2;
  }
  const settled = clip !== 'chase' && m.mode === 'chase';
  if (settled) {
    // Keep the actor registered for FX and collision while skipping its next decision.
    m.mode = 'dying';
    m.vx = m.vy = 0;
    m.t = 0;
  }
  arena.tick(step);
  if (settled) m.mode = 'chase';
}
export function sampleClip(
  kind,
  clip,
  direction,
  phase,
  id,
  variant,
  time,
  holeOffset = [-4, -3.25],
) {
  if (!(clip in petFrames) && !active.has(clip) && !still.has(clip))
    throw Error('Unknown F1 clip ' + clip);
  const key = [kind, clip, direction, phase, id, variant, ...holeOffset].join('/');
  let s = sessions.get(key);
  const ticks = Math.round(time / step);
  if (!s || ticks < s.ticks) {
    s = begin(kind, clip, direction, phase, id, variant, holeOffset);
    if (sessions.size > 96) sessions.clear();
    sessions.set(key, s);
  }
  if (clip in petFrames || still.has(clip)) {
    s.m.t = s.sim.time = time;
    if (clip in petFrames)
      Object.assign(s.m.data, {
        petMode: clip,
        petProgress: Math.min(1, (time * 24) / petFrames[clip]),
      });
  } else while (s.ticks < ticks) tick(s);
  return s;
}
