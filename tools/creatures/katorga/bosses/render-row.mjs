// Executed in the game's Vite page. The CLI supplies the three marked blocks from
// its own evaluate callback, including pose arguments, strike and body compositing.
export async function renderRow({ spec, row }) {
  const [R, P, D, W, engine, ai] = await Promise.all([
    import('/src/lib/dungeon-render.ts'),
    import('/src/lib/dungeon-paint.ts'),
    import('/src/lib/dungeon.ts'),
    import('/src/lib/dungeon-world.ts'),
    import('/src/lib/dungeon-sim.ts'),
    import('/src/lib/dungeon-ai.ts'),
  ]);
  if (spec.kind === 'f7boss') {
    const sprites = await import('/src/lib/dungeon-sprites.ts');
    await sprites.loadDungeonSprites();
    if (!sprites.spritesReady()) throw Error('reflection source sheets unavailable');
  }
  const def = D.MOBS[spec.kind];
  const paint = P.MOB_PAINTERS.get(def.art.id);
  const world = (window.galleryWorld ??= W.buildWorld(spec.floor));
  const anchor = world.objs.find((o) => o.kind === 'boss');
  const x = anchor.x + 0.5,
    y = anchor.y + 0.5;
  const sim = engine.createSim({
    world,
    dungeon: D.DUNGEON_START,
    stats: D.heroOf(D.DUNGEON_START),
    x: x + 2,
    y: y + 1,
    seed: 7,
    god: true,
    now: () => 0,
  });
  const lead = engine.spawnMob(sim, sim.boss.def.mob, x, y);
  sim.boss.state = 'fight';
  ai.BOSS_SCRIPTS.get(sim.boss.def.script)?.start?.(sim, sim.boss, lead, engine.API);
  const subject = lead.kind === spec.kind ? lead : engine.spawnMob(sim, spec.kind, x, y);
  sim.mobs = [subject];
  subject.id = 7;
  let companions = [];
  if (spec.kind === 'f9boss' && row.mode !== 'dying') {
    ai.BOSS_SCRIPTS.get(sim.boss.def.script).step(sim, sim.boss, 0, engine.API);
    companions = sim.mobs.filter((m) => m.kind === 'f9_head');
  } else if (spec.kind === 'f15b_echo_hydra' && row.mode !== 'dying') {
    subject.mode = 'chase';
    ai.BRAINS.get(def.brain).step(
      sim,
      subject,
      0,
      { def, dx: 2, dy: 1, dist: 2.24, smell: 0 },
      engine.API,
    );
    companions = sim.mobs.filter((m) => m.kind === 'f15b_echo_head');
  }
  if (spec.kind === 'f13boss') {
    const floor = await import('/src/lib/dungeon-floors/f13-brains.ts');
    const state = floor.f13Boss(sim);
    state.act =
      row.mode === 'f13_needle'
        ? 2
        : ['f13_cut1', 'f13_cut2', 'f13_snare', 'f13_grid', 'f13_spent'].includes(row.mode)
          ? 3
          : 0;
    floor.F13_FX.act = state.act;
  }
  const base = { x: subject.x, y: subject.y };
  const w =
    {
      f9boss: 440,
      f9_crown: 480,
      f6boss: 440,
      f8boss: 600,
      f7boss: 640,
      f14boss: 560,
      f13boss: 800,
      f10boss: 800,
      f11boss: 720,
      f12boss: 900,
      f15b_echo_king: 640,
      f15b_echo_mino: 640,
      f15b_echo_serpent: 720,
      f15b_echo_demon: 800,
      f15boss: 720,
    }[spec.kind] ?? 320;
  const h = spec.kind === 'f4_idol' ? 580 : w;
  const canvas = () => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const cell = canvas(),
    body = canvas();
  const rr = new R.DungeonRenderer(cell);
  const c = cell.getContext('2d', { willReadFrequently: true });
  const bodyCtx = body.getContext('2d', { willReadFrequently: true });
  const px = w / 2,
    py = spec.kind === 'f4_idol' ? 432 : Math.round(h * 0.56),
    TS = 16,
    part = row;
  const fps = spec.fps;
  const frames = [],
    fx = [...(row.zones || []), ...(row.strike ? [row.strike.art] : [])];
  let fxFrames = 0,
    clippedFrames = 0;
  const seen = new Set(fx);
  const clocks = engine;
  const live = {
    ...subject,
    mode: row.mode,
    t: 0,
    dir: row.face,
    face: row.face,
    data: {
      ...subject.data,
      lx: sim.hero.x,
      ly: sim.hero.y,
      sx: base.x,
      sy: base.y,
      bx: sim.hero.x,
      by: sim.hero.y,
      tx: sim.hero.x,
      ty: sim.hero.y,
      ...row.data,
    },
  };
  const controlled = ![
    'idle',
    'dying',
    'chase',
    'recover',
    'f15l_core',
    'f15l_nova',
    'f15l_sleep',
    'f15l_stir',
  ].includes(row.mode);
  let running = controlled;
  sim.zones = [];
  sim.strikes = [];
  sim.shots = [];
  sim.events = [];
  let lordTools;
  let fixedDuration = 0;
  if (spec.kind === 'f7boss') {
    const floor = await import('/src/lib/dungeon-floors/f7-brains.ts');
    floor.F7_VIEW.bossPhase = row.id.endsWith('_shards')
      ? 3
      : row.id.endsWith('_light')
        ? 2
        : row.mode === 'shift'
          ? 1
          : 0;
    sim.boss.phase = floor.F7_VIEW.bossPhase;
  }
  if (spec.kind === 'f8boss' && row.mode === 'phase') sim.boss.phase = row.data.phase;
  if (
    spec.kind === 'f8boss' &&
    ['roar', 'phase', 'aim', 'dash', 'volley', 'rings', 'dying'].includes(row.mode)
  ) {
    engine.API.vfx(sim, { x: base.x, y: base.y, r: 0.5, life: 30, art: 'f8v_dir' });
  }
  if (spec.kind === 'f8boss' && row.mode === 'fan') {
    const floor = await import('/src/lib/dungeon-floors/f8-brains.ts');
    floor.crescentFan(sim, engine.API, live, 5, floor.BOSS8.fanWarn);
    delete row.strike;
  }
  if (spec.kind === 'f15boss') {
    const floor = await import('/src/lib/dungeon-floors/f15-boss-brains.ts');
    lordTools = floor;
    const state = floor.f15bView(sim);
    const phases = { f15l_wake: 1, f15l_gather: 2, f15l_memory: 3, f15l_wrap: 4, f15l_nova: 5 };
    const phase = phases[row.mode];
    if (phase) floor.toPhase(sim, sim.boss, state, engine.API, live, phase);
    if (row.mode === 'dying') floor.finale(sim, sim.boss, state, engine.API);
    if (row.mode === 'f15l_conduct') {
      state.quads = floor.planQuads(sim, sim.boss, state);
      state.quads.forEach((q) => (q.on = true));
    }
    const start = {
      f15l_palm: floor.startPalm,
      f15l_sweep: floor.startSweep,
      f15l_repel: floor.startRepel,
      f15l_well: floor.startWell,
      f15l_orbit: floor.startOrbit,
      f15l_meteor: floor.startMeteor,
    }[row.mode];
    if (start) {
      if (row.mode === 'f15l_palm' || row.mode === 'f15l_sweep') start(sim, live, engine.API);
      else start(sim, live, state, engine.API);
      delete row.strike;
      for (const strike of sim.strikes)
        fixedDuration = Math.max(
          fixedDuration,
          strike.warn + (P.IMPACT_PAINTERS.get(strike.art)?.life ?? 0),
        );
    }
    if (row.mode === 'f15l_orbit')
      fixedDuration = Math.max(
        fixedDuration,
        floor.LORD.orbitWarn + floor.LORD.orbitFly + floor.LORD.orbitStay + floor.LORD.orbitBack + 0.3,
      );
    if (
      (row.mode === 'f15l_core' && !row.id.endsWith('_breath')) ||
      row.mode === 'f15l_orbit' ||
      row.mode === 'f15l_well'
    )
      engine.API.vfx(sim, {
        x: state.cx,
        y: state.cy,
        r: 0.1,
        life: 25,
        art: 'f15b_fxplanets',
        above: true,
      });
    if (row.mode === 'f15l_core' && row.id.endsWith('pulse')) {
      delete row.strike;
      floor.LORD.pulseRings.forEach((r, i) =>
        engine.API.strike(sim, {
          shape: 'ring',
          x: state.cx,
          y: state.cy,
          r,
          w: 0.6,
          ang: Math.PI,
          arc: Math.PI * 2 - floor.LORD.pulseGap,
          warn: floor.LORD.pulseWarn + i * floor.LORD.pulseStep,
          dmg: 1,
          art: 'f15b_pulse',
          from: 7,
          above: true,
        }),
      );
    }
  }
  if (row.strike) row.strike.id = 7;
  function nativeStep(t) {
    sim.mobs = [live, ...companions];
    sim.time = t;
    sim.boss.t = t;
    for (let n = 0; n < 2; n++) {
      const dt = 1 / (2 * fps);
      if (running) {
        live.t = t + n * dt;
        const dx = sim.hero.x - live.x,
          dy = sim.hero.y - live.y;
        ai.BRAINS.get(def.brain).step(
          sim,
          live,
          dt,
          { dx, dy, dist: Math.hypot(dx, dy), smell: 0, def },
          engine.API,
        );
        running = live.mode === row.mode;
        if (spec.kind === 'f3_maw' && row.mode === 'crawl') {
          live.x += live.vx * dt;
          live.y += live.vy * dt;
        }
      }
      if (lordTools) {
        const state = lordTools.f15bView(sim);
        lordTools.stepWells(sim, state, engine.API, dt);
        lordTools.stepPlanets(sim, state, live);
        state.dark += (state.darkTo - state.dark) * Math.min(1, dt * 1.6);
      }
      clocks.stepShots(sim, dt);
      clocks.stepStrikes(sim, dt);
      clocks.stepZones(sim, dt);
      // Indefinite arena-wide screen layers aren't part of the isolated portrait.
      sim.zones = sim.zones.filter(
        (z) => (z.life < 90 || z.art === 'f15b_fxeclipse') && Number.isFinite(z.x + z.y),
      );
      sim.strikes = sim.strikes.filter((z) => Number.isFinite(z.x + z.y + z.r));
      for (const z of [...sim.zones, ...sim.strikes, ...sim.shots]) if (z.art) seen.add(z.art);
      for (const event of sim.events) {
        const impact = event.t === 'strike' && P.IMPACT_PAINTERS.get(event.art);
        if (impact && Number.isFinite(event.x + event.y)) {
          seen.add(event.art);
          rr.impacts.push({
            rec: { ...event, ...event.s, vx: event.v?.[0], vy: event.v?.[1], seed: 7 },
            def: impact,
            age: 0,
          });
        }
      }
      sim.events.length = 0;
    }
    sim.mobs = [subject, ...companions];
  }
  const st = row.strike;
  if (st && !(P.ZONE_PAINTERS.has(st.art) || P.IMPACT_PAINTERS.has(st.art)))
    throw Error('No strike painter ' + st.art);
  const impact = st && P.IMPACT_PAINTERS.get(st.art);
  let duration = Math.max(fixedDuration, row.dur, st && impact ? st.warn + impact.life : 0);
  const echoSerpent = spec.kind === 'f15b_echo_serpent',
    serpent = spec.kind === 'f6boss';
  const finalFloor =
    spec.floor === 15
      ? (await import('/src/lib/dungeon-floors/f15-boss-brains.ts')).f15bView(sim)
      : null;
  if (echoSerpent) {
    for (let i = 1; i <= 24; i++)
      finalFloor.trail.push(base.x + Math.sin(i * 0.5) * 0.25, base.y - i * 0.17);
  }
  if (serpent)
    ai.BRAINS.get(def.brain).step(
      sim,
      subject,
      0,
      { def, dx: 2, dy: 1, dist: 2.24, smell: 0 },
      engine.API,
    );
  for (let i = 0; i < Math.max(2, Math.ceil(duration * fps)); i++) {
    const t = i / fps;
    nativeStep(t);
    /* MOB_INIT */
    Object.assign(subject, {
      ...m,
      id: 7,
      dir: row.dir,
      r: def.radius,
      x: base.x,
      y: base.y,
      data: { ...live.data, ...row.data },
      tele: live.tele,
    });
    if (spec.kind === 'f11boss' && row.mode === 'f11_spin')
      subject.data.sa = row.face + Math.max(0, t - 0.95) * 1.2;
    if (spec.kind === 'f11boss' && row.mode === 'f11_rockets')
      subject.data.fired = Math.min(5, Math.max(0, Math.floor((t - 0.7) / 0.13) + 1));
    if (spec.kind === 'f3_maw' && row.mode === 'leap')
      subject.data.z = 2.2 * Math.sin(Math.PI * Math.min(1, t / 0.75));
    if (spec.kind === 'f15boss') {
      if (row.mode === 'f15l_core') sim.boss.phase = 5;
      if (row.mode === 'f15l_core')
        finalFloor.nova = {
          at: 0,
          stage: row.id.endsWith('beam') ? 'beams' : row.id.endsWith('pulse') ? 'pulse' : 'exhale',
          spin: 0.55,
          n: 3,
          a: t * 0.55,
          gap: 0,
          hitCd: 0,
          cycle: 0,
          shardAt: 99,
        };
    }
    rr.time = t;
    sim.time = t;
    P.setPaintSim(sim);
    const pose = rr.mobPose(subject),
      f = { fr: paint(subject, pose), t };
    if (!f.fr) throw Error('empty painter ' + spec.kind + ' ' + row.id);
    if (i === 0 && row.mode === 'dying')
      duration = Math.max(
        f.fr.linger ?? row.dur,
        ...sim.zones.filter((z) => z.life < 10).map((z) => z.life),
      );
    function mobLayer(c) {
      /* DRAW_MOB */
    }
    function zone(art, context, extra = {}) {
      const painter = P.ZONE_PAINTERS.get(art);
      if (!painter) throw Error('No zone painter ' + art);
      const z = {
        art,
        x: base.x,
        y: base.y,
        t,
        life: duration,
        r: 2,
        id: 7,
        seed: 7,
        from: 7,
        mob: 7,
        ang: row.face,
        arc: 2.1,
        w: 0.55,
        vAng: row.face,
        vR: 1,
        dir: row.face,
        ax: base.x,
        ay: base.y,
        tx: base.x + 2,
        ty: base.y + 1,
        ex: base.x + 2,
        ey: base.y + 1,
        ...(art === 'f7_fxphase' ? { vP: sim.boss.phase } : {}),
        ...(art === 'f12_phase'
          ? { r: 12, dur: row.id === 'f12b_drop' ? 3 : row.id.endsWith('_ice') ? 2 : 1 }
          : {}),
        ...(art === 'f9_tailfx' ? { r: 8.5, warn: 1.15, arc: 1.25 } : {}),
        ...(art === 'f5_fxphase' ? { n: row.id.endsWith('rage') ? 2 : 1 } : {}),
        ...extra,
      };
      context.save();
      painter(context, z, px, py + 2, TS, t);
      context.restore();
    }
    bodyCtx.clearRect(0, 0, w, h);
    if (serpent || echoSerpent)
      zone(
        serpent ? 'f6_body' : 'f15b_echobody',
        bodyCtx,
        serpent && row.mode === 'dying' ? { vDie: 0 } : {},
      );
    if (spec.kind === 'f9boss' && companions.length) zone('f9_necks', bodyCtx);
    mobLayer(bodyCtx);
    for (const head of companions) {
      head.mode = row.mode === 'f15e_rise' ? 'f15e_rise' : 'idle';
      head.t = t;
      const painter = P.MOB_PAINTERS.get(D.MOBS[head.kind].art.id);
      const owner = f.fr;
      f.fr = painter(head, rr.mobPose(head));
      if (f.fr) {
        bodyCtx.save();
        bodyCtx.translate((head.x - base.x) * TS, (head.y - base.y) * TS);
        mobLayer(bodyCtx);
        bodyCtx.restore();
      }
      f.fr = owner;
    }
    c.clearRect(0, 0, w, h);
    const left = live.x * TS - px,
      top = live.y * TS - py - 2;
    rr.dt = 1 / fps;
    rr.drawTelegraphs(sim, left, top);
    rr.drawImpacts(false, left, top);
    /* DRAW_STRIKE */
    for (const art of row.zones || []) zone(art, c);
    c.drawImage(body, 0, 0);
    rr.drawTelegraphs(sim, left, top, true);
    for (const shot of sim.shots) rr.drawShot(shot, left, top);
    rr.drawImpacts(true, left, top);
    const final = new Uint32Array(c.getImageData(0, 0, w, h).data.buffer);
    if (subject.tele) seen.add('telegraph');
    const clean = new Uint32Array(bodyCtx.getImageData(0, 0, w, h).data.buffer);
    let visible = false,
      changed = false,
      clipped = false;
    for (let j = 0; j < final.length; j++) {
      if (final[j] >>> 24) {
        visible = true;
        const index = j;
        if (index < w || index >= w * (h - 1) || index % w === 0 || index % w === w - 1) clipped = true;
      }
      if (seen.size && final[j] !== clean[j]) changed = true;
    }
    // A fully vanished final death frame and the first invisible speck of an echo
    // assembly carry no pixels to store. Keep the original sampling times otherwise.
    if (!visible) continue;
    if (changed) fxFrames++;
    if (clipped) clippedFrames++;
    frames.push(cell.toDataURL('image/png'));
  }
  P.setPaintSim(null);
  if (!frames.length) throw Error('empty clip ' + spec.kind + ' ' + row.id);
  return { mode: row.mode, duration, frames, fx: [...seen], fxFrames, clippedFrames };
}
