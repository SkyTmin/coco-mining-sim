// The brain and boss registry own attacks, their timing, the summons, split and rail switch.
// The painting supplies an empty room, its invisible sparring partner, and the return to rest.
import { BRAINS, BOSS_SCRIPTS } from './source/dungeon-ai.ts';
import './source/dungeon-brains.ts';
import { KING_BARS } from './source/dungeon-floors/f1-brains.ts';
import { F1 } from './source/dungeon-floors/f1.ts';
import { IMPACT_PAINTERS } from './source/dungeon-paint.ts';
import { petFrames } from './poses.ts';
import behavior from './behavior.json' with { type: 'json' };

const definitions = new Map(F1.mobs.map(def => [def.id, def]));
const royal = m => m.kind === 'king' || m.kind === 'kinglet';
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
const stepSeconds = 1 / 60;
const script = BOSS_SCRIPTS.get('king');

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function setMode(m, mode) {
  m.mode = mode;
  m.t = 0;
}

function direction(m, x, y) {
  const dx = x - m.x, dy = y - m.y;
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

// Subset of dungeon-sim's SimApi exercised by the three native brains in an empty room.
export function createArena(config = behavior) {
  const [left, top, right, bottom] = config.walkLimits;
  const sim = {
    floor: 1, time: 0, nextId: 1, hitstop: 0, flashTime: 0, flashColor: '#fff0e6', rng: random(config.seed),
    boss: {id: 'king', state: 'fight', phase: 0, split: false, t: 0, data: {}},
    hero: {x: config.targetRoute[0][0], y: config.targetRoute[0][1], r: 0.29, inv: 0, mode: 'walk'},
    mobs: [], strikes: [], impacts: [], zones: [], events: [],
    burrows: config.burrows.map(([x, y, outX, outY]) => ({
      cd: 0, obj: {x: x - 0.5, y: y - 0.5, out: [outX - 0.5, outY - 0.5]},
    })),
  };

  function spawnMob(s, kind, x, y, opts = {}) {
    const d = definitions.get(kind);
    const m = {
      id: s.nextId++, kind, x, y, hx: x, hy: y, vx: 0, vy: 0, kx: 0, ky: 0,
      hp: d.hp, maxHp: d.hp, dmg: d.dmg, r: d.radius * (opts.elite ? 1.15 : 1),
      speed: d.speed * (0.92 + sim.rng() * 0.16),
      t: 0, cd: 0.4 + sim.rng() * 0.5, mode: opts.mode ?? 'chase', face: 0, dir: 0,
      level: opts.level ?? 1, elite: !!opts.elite, albino: false, affixes: [], flash: 0,
      burrow: opts.burrow ?? -1, rush: false, summonCd: 6, bounces: 0, tele: null,
      danger: 0, bounce: false, data: {},
    };
    s.mobs.push(m);
    return m;
  }

  function collide(_s, m) {
    m.x = clamp(m.x, left + m.r, right - m.r);
    m.y = clamp(m.y, top + m.r, bottom - m.r);
  }

  const api = {
    spawnMob, collide, setMode,
    // All points inside the gallery floor are mutually visible.
    inArena: (_s, x, y) => left <= x && x <= right && top <= y && y <= bottom,
    lineOfSight: () => true,
    chaseDir: (_s, m, x, y) => direction(m, x, y),
    steer(_s, m, dx, dy, speed, dt) {
      const k = Math.min(1, dt * 10);
      m.vx += (dx * speed - m.vx) * k;
      m.vy += (dy * speed - m.vy) * k;
      if (Math.abs(dx) + Math.abs(dy) > 0.1) m.face = Math.atan2(dy, dx);
    },
    hurtHero(s) { s.hero.inv = 0.4; },
    fromBurrow(s, b, kind, opts) {
      const [x, y] = b.obj.out;
      const m = spawnMob(s, kind, b.obj.x + 0.5, b.obj.y + 0.5, {
        ...opts, burrow: s.burrows.indexOf(b), mode: 'emerge',
      });
      m.hx = x + 0.5;
      m.hy = y + 0.5;
      b.cd = 3 + s.rng() * 3;
      return m;
    },
    zone(s, z) { s.zones.push({...z, id: s.nextId++, t: 0}); },
    strike(s, st) { s.strikes.push({...st, id: s.nextId++, t: 0}); },
  };

  const lead = spawnMob(sim, 'king', ...config.throne, {mode: 'roar'});
  script.start(sim, sim.boss, lead, api);

  function updateMob(m, dt) {
    m.t += dt;
    m.cd -= dt;
    if (m.t < 0 || m.mode === 'dying') return;
    if (m.mode === 'emerge') {
      const hole = sim.burrows[m.burrow].obj;
      const k = Math.min(1, m.t / 0.45);
      m.x = hole.x + 0.5 + (m.hx - hole.x - 0.5) * k;
      m.y = hole.y + 0.5 + (m.hy - hole.y - 0.5) * k;
      if (k >= 1) setMode(m, 'chase');
      return;
    }
    const def = definitions.get(m.kind), brain = BRAINS.get(def.brain);
    const dx = sim.hero.x - m.x, dy = sim.hero.y - m.y;
    const firstZone = sim.zones.length, firstStrike = sim.strikes.length;
    brain.step(sim, m, dt, {def, dx, dy, dist: Math.hypot(dx, dy), smell: 0}, api);
    for (const z of sim.zones.slice(firstZone)) z.ownerId = m.id;
    for (const st of sim.strikes.slice(firstStrike)) st.ownerId = m.id;
    m.x += (m.vx + m.kx) * dt;
    m.y += (m.vy + m.ky) * dt;
    m.kx *= Math.exp(-9 * dt);
    m.ky *= Math.exp(-9 * dt);
    const px = m.x, py = m.y;
    collide(sim, m);
    if (m.bounce && (m.x !== px || m.y !== py)) brain.onWall?.(sim, m, m.x - px, m.y - py, api);
  }

  function separate() {
    const live = sim.mobs.filter(m => m.mode !== 'emerge' && m.mode !== 'dying' && m.t >= 0);
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      for (const b of live.slice(i + 1)) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 0.000001 || d >= a.r + b.r) continue;
        const overlap = a.r + b.r - d;
        const ma = definitions.get(a.kind).mass, mb = definitions.get(b.kind).mass;
        const weight = mb / (ma + mb);
        a.x -= dx / d * overlap * weight;
        a.y -= dy / d * overlap * weight;
        b.x += dx / d * overlap * (1 - weight);
        b.y += dy / d * overlap * (1 - weight);
        collide(sim, a);
        collide(sim, b);
      }
      const dx = a.x - sim.hero.x, dy = a.y - sim.hero.y, d = Math.hypot(dx, dy);
      if (d > 0.000001 && d < a.r + sim.hero.r && a.mode !== 'leap') {
        const push = a.r + sim.hero.r - d;
        a.x += dx / d * push;
        a.y += dy / d * push;
        collide(sim, a);
      }
    }
  }

  function tick(dt) {
    sim.flashTime = Math.max(0, sim.flashTime - dt);
    sim.events.length = 0;
    if (sim.hitstop > 0) {
      sim.hitstop = Math.max(0, sim.hitstop - dt);
      return;
    }
    sim.time += dt;
    sim.boss.t += dt;
    sim.hero.inv = Math.max(0, sim.hero.inv - dt);
    const firstZone = sim.zones.length;
    script.step(sim, sim.boss, dt, api);
    for (const z of sim.zones.slice(firstZone)) z.ownerId = lead.id;
    for (const m of sim.mobs) updateMob(m, dt);
    separate();
    // Preserve each contact's own lifetime and both native painting layers.
    for (const z of sim.zones) z.t += dt;
    sim.zones = sim.zones.filter(z => z.t <= (z.warn ?? 0) + z.life);
    for (const rec of sim.impacts) rec.age += dt;
    sim.impacts = sim.impacts.filter(rec => rec.age < (IMPACT_PAINTERS.get(rec.art)?.life ?? 1.4));
    for (const s of sim.strikes) {
      s.t += dt;
      if (s.t >= s.warn) {
        sim.impacts.push({...s, age: 0, seed: s.id * 13 + 7});
        sim.hitstop = Math.max(sim.hitstop, 0.05);
      }
    }
    sim.strikes = sim.strikes.filter(s => s.t < s.warn);
    for (const event of sim.events) {
      if (event.t !== 'flash') continue;
      sim.flashTime = Math.max(sim.flashTime, Math.min(0.5, event.k * 0.35));
      sim.flashColor = event.color;
    }
    sim.mobs = sim.mobs.filter(m => m.mode !== 'dying' || m.t <= (m.kind === 'king' ? 1.5 : 1));
  }

  return {sim, api, lead, tick};
}

// Native AI advances in fixed steps even when the preview renderer drops frames.
export function createBattle(config = behavior) {
  let arena, sim, lead, route, stageTime, opening, returning, gesture;
  let elapsed = 0, cycle = 0, accumulator = 0;

  function reset() {
    arena = createArena(config);
    ({sim, lead} = arena);
    stageTime = 0;
    opening = config.openingSeconds;
    route = 1;
    returning = null;
    gesture = null;
    setMode(lead, 'idle');
  }
  reset();

  function stopCombatEffects() {
    sim.strikes.length = 0;
    sim.impacts.length = 0;
    sim.zones = sim.zones.filter(z => z.art.startsWith('f1_kingtele') || z.art === 'f1_cleaver');
    for (const m of sim.mobs) {
      m.tele = null;
      m.danger = 0;
    }
  }

  function clearGesture() {
    if (!gesture) return;
    gesture = null;
    for (const m of sim.mobs.filter(royal)) {
      delete m.data.petMode;
      delete m.data.petProgress;
    }
  }

  function startReturn() {
    clearGesture();
    stopCombatEffects();
    setMode(lead, 'recover');
    lead.vx = lead.vy = 0;
    const smalls = sim.mobs.filter(m => m.kind === 'kinglet');
    // f1-art's standing profile mirrors horizontally. The two crowned tufts at
    // the ends of kingTails lie about 29/34 native pixels behind his foot pivot.
    const facing = Math.cos(lead.face) < 0 ? -1 : 1;
    returning = {t: 0, members: smalls.map((m, i) => {
      const x = lead.x - facing * (i ? 34 : 29) / 16, y = lead.y + (i ? 0.1 : -0.4);
      m.face = Math.atan2(y - m.y, x - m.x);
      setMode(m, 'chase');
      return {m, startX: m.x, startY: m.y, x, y};
    })};
    for (const m of sim.mobs.filter(m => !royal(m))) setMode(m, 'dying');
  }

  function requestStage(number) {
    if (!Number.isInteger(number) || number < 1 || number > 4) return;
    clearGesture();
    if (returning || number < sim.boss.phase + 1) reset();
    if (number === sim.boss.phase + 1) return;
    opening = 0;
    while (sim.boss.phase < number - 1) {
      // Selector jumps are immediate. Each crossed notch still runs the real
      // transition (including both guards before the split, and guard #3 on IV).
      if (lead.mode === 'swap' || lead.mode === 'leap') setMode(lead, 'chase');
      lead.hp = lead.maxHp * KING_BARS[sim.boss.phase];
      const firstZone = sim.zones.length;
      script.step(sim, sim.boss, 0, arena.api);
      for (const z of sim.zones.slice(firstZone)) z.ownerId = lead.id;
    }
    assignVariants();
    stageTime = 0;
  }

  function nextStage() {
    if (returning) return;
    if (sim.boss.phase === 3) startReturn();
    else requestStage(sim.boss.phase + 2);
  }

  function assignVariants() {
    let variant = 0;
    for (const m of sim.mobs) {
      if (m.kind === 'kinglet') m.data.petVariant = variant++;
    }
  }

  function moveTarget(dt) {
    const [x, y] = config.targetRoute[route];
    const dx = x - sim.hero.x, dy = y - sim.hero.y, distance = Math.hypot(dx, dy);
    // The sparring partner dodges a committed roll instead of absorbing every
    // impact at its origin. The king still handles steering, dust and rebounds.
    const dodging = lead.mode === 'rollAim' && lead.t > 0.5 || lead.mode === 'roll' && lead.t < 0.36;
    sim.hero.mode = dodging ? 'dash' : 'walk';
    const step = (dodging ? config.dodgeSpeed : config.targetSpeed) * dt;
    if (step >= distance) {
      sim.hero.x = x;
      sim.hero.y = y;
      route = (route + 1) % config.targetRoute.length;
    } else {
      sim.hero.x += dx * step / distance;
      sim.hero.y += dy * step / distance;
    }
  }

  function stepReturn(dt) {
    // Reunion is the one gallery-only stage. No cuts between split and joined rigs.
    returning.t += dt;
    lead.t += dt;
    sim.time += dt;
    const u = Math.min(1, returning.t / (config.returnSeconds * 0.83));
    const eased = u * u * (3 - 2 * u);
    for (const {m, startX, startY, x, y} of returning.members) {
      m.x = startX + (x - startX) * eased;
      m.y = startY + (y - startY) * eased;
      m.t += dt;
      m.vx = (x - startX) * (1 - u);
      m.vy = (y - startY) * (1 - u);
    }
    for (const m of sim.mobs.filter(m => !royal(m))) m.t += dt;
    sim.mobs = sim.mobs.filter(m => m.mode !== 'dying' || m.t < 1);
    if (u === 1) {
      sim.mobs = sim.mobs.filter(m => m.kind !== 'kinglet');
      lead.data.f1split = lead.data.f1blade = 0;
      sim.zones = sim.zones.filter(z => z.art !== 'f1_cleaver');
    }
    if (returning.t >= config.returnSeconds) {
      const joined = {x: lead.x, y: lead.y, face: lead.face};
      cycle++;
      reset();
      Object.assign(lead, joined);
    }
  }

  function event(name) {
    if (name === 'skill_ready') {
      if (returning) return;
      clearGesture();
      // Shorten the wait for a demonstration; the game brain chooses the attack.
      if (opening > 0 || lead.mode === 'idle' || lead.mode === 'roar') {
        opening = 0;
        setMode(lead, 'chase');
      }
      if (lead.mode === 'chase') lead.t = Math.max(lead.t, 1.3);
      return;
    }
    let key = config.gestures[name === 'double_tap' ? 'like' : name];
    if (!key) return;
    const sleeping = gesture?.key === 'sleep' || gesture?.key === 'sleep_in';
    if (name === 'owner_back' && !sleeping) return;
    if (name === 'idle_owner' && sleeping) return;
    const wakingToTap = name === 'tap' && sleeping;
    if (wakingToTap) key = config.gestures.tap_asleep;
    gesture = {key, t: 0, after: wakingToTap ? config.gestures.tap : null};
    stopCombatEffects();
    // On resume the native brains choose their next target/attack afresh.
    for (const m of sim.mobs.filter(royal)) {
      setMode(m, 'chase');
      m.vx = m.vy = m.kx = m.ky = 0;
      m.data.petMode = key;
      m.data.petProgress = 0;
    }
  }

  function stepGesture(dt) {
    gesture.t += dt;
    const length = petFrames[gesture.key] / 24;
    if (gesture.t >= length) {
      if (gesture.key === 'sleep_in' || gesture.key === 'sleep') {
        gesture = {key: 'sleep', t: gesture.t - length};
      } else if (gesture.after) {
        gesture = {key: gesture.after, t: gesture.t - length};
      } else {
        clearGesture();
        return;
      }
    }
    for (const m of sim.mobs.filter(royal)) {
      m.data.petMode = gesture.key;
      m.data.petProgress = gesture.t / (petFrames[gesture.key] / 24);
    }
  }

  function step(dt) {
    elapsed += dt;
    if (gesture) { stepGesture(dt); return; }
    if (returning) { stepReturn(dt); return; }
    if (opening > 0) {
      opening -= dt;
      sim.time += dt;
      lead.t += dt;
      if (opening <= 0) setMode(lead, 'roar');
      return;
    }
    moveTarget(dt);
    stageTime += dt;
    const previousPhase = sim.boss.phase;
    // Damage to the lead is a clock for the invisible sparring partner.
    // Native scripts decide when it is legal to cross a bar (e.g. after landing).
    const stage = config.stages[previousPhase];
    const startHp = previousPhase === 0 ? 1 : KING_BARS[previousPhase - 1];
    const endHp = KING_BARS[previousPhase] ?? 0.045;
    const k = Math.min(1, stageTime / stage.seconds);
    lead.hp = lead.maxHp * (k === 1 ? endHp : startHp + (endHp - startHp) * k);
    arena.tick(dt);
    if (previousPhase !== sim.boss.phase) {
      stageTime = 0;
      assignVariants();
    } else if (previousPhase === 3 && k === 1 && lead.mode !== 'leap' && lead.mode !== 'swap') {
      startReturn();
    }
    // The sparring partner also clears ordinary reinforcements at close range.
    // Boss parts stay alive throughout the exhibition, as required for the reunion.
    for (const m of sim.mobs) {
      if (royal(m) || m.mode === 'dying' || m.mode === 'emerge') continue;
      if (Math.hypot(m.x - sim.hero.x, m.y - sim.hero.y) < 1.55) {
        m.hp -= m.maxHp * dt / (m.kind === 'rat' ? 2.2 : 4.2);
        if (m.hp <= 0) { setMode(m, 'dying'); m.tele = null; }
      }
    }
  }

  function advance(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return sim;
    accumulator += dt;
    while (accumulator + 1e-9 >= stepSeconds) {
      step(stepSeconds);
      accumulator -= stepSeconds;
    }
    return sim;
  }

  return {
    advance, event, setStage: requestStage, nextStage,
    get state() { return sim; }, get stage() { return sim.boss.phase + 1; },
    get returning() { return !!returning; }, get cycle() { return cycle; }, get elapsed() { return elapsed; },
  };
}
