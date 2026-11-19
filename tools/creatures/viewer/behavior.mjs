// The PNG viewer and the offline painter advance this clock at the same 24 Hz.
// Coordinates denote the center of the planted feet, inside the unframed field.
export const petFPS = 24;
export const petDirections = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const ticks = seconds => Math.round(seconds * petFPS);
const length = (animations, clip) => ticks(animations[clip].seconds);

export function interruptFrames(frames, clip = '') {
  const marks = [];
  const spacing = clip === 'turn' || clip.startsWith('walk_') ? 1 : 6;
  for (let i = 0; i < frames; i += spacing) marks.push(i);
  if (marks.at(-1) !== frames - 1) marks.push(frames - 1);
  return marks;
}

const requiredEvents = {
  tap: ['happy'], tap_asleep: ['wake_startled', 'happy'], like: ['trick'],
  idle_owner: ['sleep_in', 'sleep'], owner_back: ['sleep_out'], skill_ready: ['attack'],
};
const requiredClips = ['idle', 'fidget_a', 'fidget_b', 'look', 'happy', 'trick',
  'sleep_in', 'sleep', 'sleep_out', 'wake_startled', 'hatch', 'turn', 'tired',
  ...petDirections.map(dir => 'walk_' + dir)];
const trickClips = { f1: ['trick', 'trick_b'], f2: ['trick-f2', 'trick_b-f2'] };
const ambientClips = ['idle', 'fidget_a', 'fidget_b', 'look'];
const pair = (v, check) => Array.isArray(v) && v.length === 2 && v.every(check);
const positive = v => Number.isFinite(v) && v > 0;
function interval(v, min, max) {
  return pair(v, n => Number.isFinite(n) && n >= min && n <= max) && v[1] >= v[0];
}


// A long effect can fit at the center of the field but cross the rail at a side stop.
function attackFits(bounds, at) {
  if (!bounds) return true;
  const [left, top, right, bottom] = bounds;
  return left <= at[0] && at[0] <= right && top <= at[1] && at[1] <= bottom;
}

export function validateBehavior(data, animations) {
  if (!data || typeof data !== 'object') return ['expected a behavior object'];
  const issues = [];
  if (!Number.isInteger(data.seed) || data.previewSeconds !== 30) issues.push('seed/previewSeconds');
  if (!pair(data.field, n => Number.isInteger(n) && n > 0) || !positive(data.stride) ||
      !Number.isFinite(data.yaw) || !positive(data.depthScale)) issues.push('field/stride/depthScale');
  if (!interval(data.walkShare, 0.35, 0.50)) issues.push('walkShare must be within 35–50%');
  const hasTricks = data.tricks !== undefined;
  if (!hasTricks && (!data.lifeAttacks || data.attackInterval !== undefined) && !interval(data.attackInterval, 30, 45))
    issues.push('attackInterval must be within 30–45 s');
  if (!Array.isArray(data.stops) || data.stops.length < 3 ||
      !data.stops.every(stop => pair(stop, n => Number.isFinite(n) && n >= 0 && n <= 1)) ||
      new Set(data.stops.map(String)).size !== data.stops.length) issues.push('distinct floor stops');
  const weights = data.weights ?? {};
  if (![...ambientClips, ...(hasTricks ? [] : ['trick'])].every(k => positive(weights[k])) ||
      Object.entries(weights).some(([k,v]) => !positive(v) || !animations?.[k]))
    issues.push('positive weights for ambient clips');
  const attacks = data.attacks;
  if (hasTricks) {
    if (['attacks', 'attackInterval', 'lifeAttacks', 'attackBounds'].some(key => data[key] !== undefined))
      issues.push('tricks cannot be combined with attack fields');
    if (Object.keys(animations ?? {}).some(name => name.startsWith('tech_')))
      issues.push('tricks cannot have tech_* clips');
    for (const [form, allowed] of Object.entries(trickClips)) {
      const list = data.tricks?.[form];
      if (!Array.isArray(list) || !list.includes(allowed[0]) || new Set(list).size !== list.length ||
          !list.every(name => allowed.includes(name) && animations?.[name]))
        issues.push('tricks.' + form + ' must name distinct authored tricks for that form');
    }
    for (const name of ['phase', 'idle-f2', 'happy-f2'])
      if (!animations?.[name]) issues.push('missing clip ' + name);
  } else if (!Array.isArray(attacks) || !attacks.length || new Set(attacks).size !== attacks.length ||
      !attacks.every(a => typeof a === 'string' && a.startsWith('tech_') && animations?.[a]) ||
      Object.keys(animations ?? {}).some(a => a.startsWith('tech_') && !attacks.includes(a)))
    issues.push('attacks must name all authored techniques');
  if (data.attackBounds !== undefined) {
    const bounds = data.attackBounds;
    const valid = bounds && typeof bounds === 'object' && !Array.isArray(bounds) && Array.isArray(attacks) &&
      Object.entries(bounds).every(([name, r]) => attacks.includes(name) && Array.isArray(r) && r.length === 4 &&
        r.every(v => Number.isFinite(v) && v >= 0 && v <= 1) && r[0] <= r[2] && r[1] <= r[3]);
    if (!valid) issues.push('invalid attackBounds');
    // A tap may come between two stops. One attack covering the entire route guarantees a response.
    else if (!Array.isArray(data.stops) || !attacks.some(name =>
      data.stops.every(at => Array.isArray(at) && attackFits(bounds[name], at))))
      issues.push('no attack fits the entire walking route');
    else if (attacks.some(name => !data.stops.some(at => attackFits(bounds[name], at))))
      issues.push('an attack cannot start at any floor stop');
  }
  if (data.lifeAttacks !== undefined) {
    const moves = data.lifeAttacks;
    if (!Array.isArray(moves) || moves.length < 3 || moves.length > 4 ||
        new Set(moves).size !== moves.length || !moves.every(name => Array.isArray(attacks) && attacks.includes(name)))
      issues.push('lifeAttacks must name three or four distinct authored attacks');
    for (const clip of ['phase', 'idle-f2']) if (!animations?.[clip]) issues.push('missing ' + clip);
  }
  for (const [event, expected] of Object.entries(requiredEvents)) {
    if (hasTricks && event === 'skill_ready') continue;
    if (JSON.stringify(data.events?.[event]) !== JSON.stringify(expected)) issues.push('event ' + event);
  }
  for (const [event, sequence] of Object.entries(data.events ?? {})) {
    if (!Array.isArray(sequence) || !sequence.length ||
        sequence.some(k => !(k === 'attack' && !hasTricks) && !animations?.[k])) issues.push('unknown clip in ' + event);
  }
  for (const clip of requiredClips) if (!animations?.[clip]) issues.push('missing clip ' + clip);
  for (const [clip, spec] of Object.entries(animations ?? {})) {
    if (!spec || !positive(spec.seconds)) { issues.push('invalid duration ' + clip); continue; }
    const end = ticks(spec.seconds) - 1;
    if (spec.bearings && (!Array.isArray(spec.bearings) || spec.bearings.length !== end + 1 ||
        !spec.bearings.every(Number.isFinite))) issues.push('invalid per-frame bearings ' + clip);
    const marks = spec.interrupt;
    if (!Array.isArray(marks) || marks[0] !== 0 || marks.at(-1) !== end ||
        marks.some((t,i) => !Number.isInteger(t) || (i && (t <= marks[i-1] || t - marks[i-1] > 7))))
      issues.push('invalid interrupt marks ' + clip);
  }
  if (!issues.length && data.lifeAttacks) {
    const score = performancePlan(data, animations);
    if (score.maxWalk < Math.round(ticks(data.previewSeconds) * data.walkShare[0]))
      issues.push('lifeAttacks, turns and phase leave too little time for the minimum walking share');
  }
  if (!issues.length && hasTricks && trickPlan(data, animations).maxWalk < Math.round(ticks(data.previewSeconds) * data.walkShare[0]))
    issues.push('tricks, turns and phase leave too little time for the minimum walking share');
  return issues;
}

function randomSource(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function weighted(options, random) {
  let pick = random() * options.reduce((n, [, weight]) => n + weight, 0);
  for (const [name, weight] of options) {
    pick -= weight;
    if (pick < 0) return name;
  }
  return options.at(-1)[0];
}

// The authored pivot may reverse its screen direction, linger in profile, or
// start at a nonzero bearing. Choose actual atlas frames along the shortest arc.
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnFramesFor(bearings, from, to) {
  const delta = angleDelta(from, to);
  const steps = Math.ceil(Math.abs(delta) / (Math.PI / 12));
  const frames = [];
  for (let step = 1; step <= steps; step++) {
    const want = from + delta * step / steps;
    let best = 0, error = Infinity;
    for (const [i, value] of bearings.entries()) {
      const distance = Math.abs(angleDelta(want, value));
      if (distance < error) { best = i; error = distance; }
    }
    frames.push(best);
  }
  return frames;
}

function turnBearings(config, animations) {
  const count = length(animations, 'turn');
  return animations.turn.bearings ?? Array.from({length: count},
    (_, frame) => config.yaw + 2 * Math.PI * frame / count);
}

function walkingLeg(config, from, to, bearings) {
  const dx = (to[0] - from[0]) * config.field[0];
  const dz = (to[1] - from[1]) * config.field[1] / config.depthScale;
  const index = (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8;
  const angle = index * Math.PI / 4;
  return {
    from, to, angle, distance: Math.hypot(dx, dz), direction: petDirections[index],
    departing: turnFramesFor(bearings, config.yaw, angle),
    entering: turnFramesFor(bearings, angle, config.yaw),
  };
}

// Each full attack starts at an eligible stop. Back at home, the pet holds
// its second form for a whole idle cycle, then reverses the transformation.
function performancePlan(config, animations) {
  const home = config.stops[0], stops = [{ at: home, actions: [] }];
  let previous = 0;
  for (const name of config.lifeAttacks) {
    for (let step = 1; step <= config.stops.length; step++) {
      const index = (previous + step) % config.stops.length, at = config.stops[index];
      if (!attackFits(config.attackBounds?.[name], at)) continue;
      if (index !== previous) stops.push({ at, actions: [] });
      stops.at(-1).actions.push(name);
      previous = index;
      break;
    }
  }
  if (stops.length === 1) stops.push({ at: config.stops[1], actions: [] });
  if (stops.at(-1).at !== home) stops.push({ at: home, actions: [] });
  const bearings = turnBearings(config, animations);
  const legs = stops.slice(1).map((next, i) => walkingLeg(config, stops[i].at, next.at, bearings));
  const actions = config.lifeAttacks.reduce((sum, name) => sum + length(animations, name), 0);
  const turns = legs.reduce((sum, leg) => sum + leg.departing.length + leg.entering.length, 0);
  // One regular idle frame at each seam, plus both directions of the actual phase clip.
  const fixed = 2 + actions + turns + 2 * length(animations, 'phase') + length(animations, 'idle-f2');
  return { stops, legs, maxWalk: ticks(config.previewSeconds) - fixed };
}

function trickPlan(config, animations, bearings = turnBearings(config, animations), cycle) {
  const home = config.stops[0];
  const stops = [home, ...config.stops.slice(1, 3), home].map(at => ({ at, actions: [] }));
  const legs = stops.slice(1).map((next, i) => walkingLeg(config, stops[i].at, next.at, bearings));
  // Keep facing along the route at intermediate waypoints. Only gestures and
  // performances at home use the portrait orientation.
  for (const [i, leg] of legs.entries()) {
    leg.departing = turnFramesFor(bearings, legs[i - 1]?.angle ?? config.yaw, leg.angle);
    leg.entering = i === legs.length - 1 ? turnFramesFor(bearings, leg.angle, config.yaw) : [];
  }
  const { f1, f2 } = config.tricks;
  const clipAt = (list, index) => list[index % list.length];
  const duration = index => length(animations, clipAt(f1, index)) + length(animations, clipAt(f2, index));
  const actions = cycle === undefined
    ? Math.max(...Array.from({ length: Math.max(f1.length, f2.length) }, (_, index) => duration(index)))
    : duration(cycle);
  const turns = legs.reduce((sum, leg) => sum + leg.departing.length + leg.entering.length, 0);
  const fixed = 2 + actions + turns +
    2 * length(animations, 'phase') + length(animations, 'idle-f2');
  if (cycle !== undefined) stops.at(-1).actions.push(clipAt(f1, cycle));
  return { stops, legs, maxWalk: ticks(config.previewSeconds) - fixed };
}

export function createPetBehavior(config, animations, seed = config.seed) {
  const random = randomSource(seed);
  const choose = list => list[Math.floor(random() * list.length)];
  const between = range => range[0] + random() * (range[1] - range[0]);
  const window = ticks(config.previewSeconds);
  const idleFrames = length(animations, 'idle');
  const bearings = turnBearings(config, animations);
  const ranked = config.lifeAttacks ? performancePlan(config, animations) : undefined;
  const tricks = config.tricks;
  const trickIndex = { f1: 0, f2: 0 };
  const home = config.stops[0];
  const canAttack = (name, at) => attackFits(config.attackBounds?.[name], at);
  const pickAttack = at => choose(at && config.attackBounds
    ? config.attacks.filter(name => canAttack(name, at)) : config.attacks);
  const longestAttack = Math.max(0, ...(config.attacks ?? []).map(name => length(animations, name)));
  // Reserve complete clips on either side of the preview seam while preserving
  // the data's interval between *starts*, even when the cooldown spans a cycle.
  function nextAttackAfter(start) {
    const earliest = start + ticks(config.attackInterval[0]);
    const latest = start + ticks(config.attackInterval[1]);
    const candidate = earliest + Math.floor(random() * (latest - earliest + 1));
    for (let n = 0; n <= latest - earliest; n++) {
      const tick = earliest + (candidate - earliest + n) % (latest - earliest + 1);
      const offset = tick % window;
      if (offset > 0 && offset + longestAttack < window) return tick;
    }
    return candidate;
  }
  let nextAttack = Math.round(window * (0.40 + 0.27 * random()));
  let absolute = 0, cycleStart = 0, cursor = 0, remainder = 0;
  let path = [], pending, reaction, held;
  const sampleAt = (anim, frame, at, direction = 'se') => ({anim, frame, at, direction, elapsed: frame / petFPS});

  function walk(rows, leg) {
    const name = 'walk_' + leg.direction;
    const strideFrames = length(animations, name);
    for (let f = 0; f < leg.count; f++) {
      const u = f / leg.count;
      const at = leg.from.map((v,j) => v + (leg.to[j] - v) * u);
      const frame = Math.floor(leg.distance * u / config.stride * strideFrames) % strideFrames;
      rows.push(sampleAt(name, frame, at, leg.direction));
    }
  }

  // Plan a closed excursion. Spend the walk budget in proportion to the actual
  // three floor distances. The planted-foot phase depends on distance travelled.
  function planCycle() {
    const cycle = cycleStart / window;
    const score = tricks ? trickPlan(config, animations, bearings, cycle) : ranked;
    const rows = [];
    const chosen = config.stops.slice(1);
    const take = () => chosen.splice(Math.floor(random() * chosen.length), 1)[0];
    const via = score ? score.stops.map(stop => stop.at) : [home, take(), take(), home];
    const legs = score?.legs ?? via.slice(1).map((to, i) => walkingLeg(config, via[i], to, bearings));
    const requested = Math.round(window * between(config.walkShare));
    const walks = score ? Math.min(requested, score.maxWalk) : requested;
    if (score && walks < Math.round(window * config.walkShare[0]))
      throw Error('Actions, turns and phase leave too little time for the minimum walking share');
    const distance = legs.reduce((sum, leg) => sum + leg.distance, 0);
    const attacks = [];
    while (!score && nextAttack < cycleStart + window) {
      const clip = pickAttack(), frames = length(animations, clip);
      attacks.push({tick: nextAttack - cycleStart, clip, frames});
      nextAttack = nextAttackAfter(nextAttack);
    }
    function rest(at, frames, first, last) {
      const fillIdle = (count, start = 0) => {
        for (let f = 0; f < count; f++) rows.push(sampleAt('idle', (start + f) % idleFrames, at));
      };
      while (frames) {
        const options = Object.entries(config.weights).filter(([name]) =>
          (!tricks || ambientClips.includes(name)) && length(animations, name) <= frames);
        if (!options.length || first) {
          const count = first ? Math.min(idleFrames, frames) : frames;
          fillIdle(count, last ? (idleFrames - count % idleFrames) % idleFrames : 0);
          frames -= count; first = false; continue;
        }
        const name = weighted(options, random), count = length(animations, name);
        for (let f = 0; f < count; f++) rows.push(sampleAt(name, f, at));
        frames -= count;
      }
    }
    let used = 0, walked = 0;
    for (const leg of legs) {
      walked += leg.distance;
      const end = Math.round(walks * walked / distance);
      leg.count = end - used;
      leg.movingTicks = leg.count + leg.departing.length + leg.entering.length;
      used = end;
    }
    if (score) {
      const play = (name, at, reverse = false, form = 'f1') => {
        const count = length(animations, name);
        for (let i = 0; i < count; i++) {
          const row = sampleAt(name, reverse ? count - i - 1 : i, at);
          rows.push(tricks ? { ...row, form } : row);
        }
      };
      const spare = score.maxWalk - walks;
      rows.push(sampleAt('idle', 0, home));
      for (const [i, stop] of score.stops.entries()) {
        if (tricks) {
          if (i === legs.length) rest(stop.at, spare, false, false);
        } else {
          const before = Math.floor(spare * i / score.stops.length);
          rest(stop.at, Math.floor(spare * (i + 1) / score.stops.length) - before, false, false);
        }
        for (const name of stop.actions) play(name, stop.at);
        const leg = legs[i];
        if (!leg) continue;
        for (const frame of leg.departing) rows.push(sampleAt('turn', frame, leg.from));
        walk(rows, leg);
        for (const frame of leg.entering) rows.push(sampleAt('turn', frame, leg.to));
      }
      play('phase', home);
      play('idle-f2', home, false, 'f2');
      if (tricks) play(tricks.f2[cycle % tricks.f2.length], home, false, 'f2');
      play('phase', home, true, 'f2');
      rows.push(sampleAt('idle', 0, home));
      return rows;
    }
    function excursion(first, end, budget) {
      const count = end - first;
      const movement = legs.slice(first,end).reduce((sum, leg) => sum + leg.movingTicks, 0);
      const spare = budget - movement;
      if (spare < 0) throw Error('Not enough time to walk and turn between stops');
      const weights = Array.from({length:count+1}, () => 0.6 + 0.8 * random());
      const total = weights.reduce((a,b) => a+b);
      let sum = 0, previous = 0;
      for (let i = first; i <= end; i++) {
        sum += weights[i-first];
        const allocated = Math.round(spare * sum / total);
        const pause = allocated - previous;
        previous = allocated;
        if (i > first)
          for (const f of legs[i-1].entering) rows.push(sampleAt('turn', f, via[i]));
        rest(via[i], pause, !rows.length, i === end);
        if (i < end)
          for (const f of legs[i].departing) rows.push(sampleAt('turn', f, via[i]));
        if (i < end) walk(rows, legs[i]);
      }
    }
    if (attacks.length) {
      const a = attacks[0];
      const reserved = config.attackBounds ? longestAttack : a.frames;
      const after = window - a.tick - reserved;
      // Partition the route at a floor stop, so an autonomous attack never
      // interrupts a step or an unfinished character gesture.
      const movement = legs.reduce((n, leg) => n + leg.movingTicks, 0);
      let split = 0, distanceToIdeal = Infinity, spent = 0;
      for (let i = 0; i <= legs.length; i++) {
        const balance = Math.abs(spent - movement * a.tick / (window - a.frames));
        if (spent <= a.tick && movement - spent <= after && balance < distanceToIdeal) {
          split = i;
          distanceToIdeal = balance;
        }
        if (i < legs.length) spent += legs[i].movingTicks;
      }
      excursion(0,split,a.tick);
      const at = via[split];
      const clip = canAttack(a.clip, at) ? a.clip : pickAttack(at);
      const frames = length(animations, clip);
      for (let f = 0; f < frames; f++) rows.push(sampleAt(clip, f, at));
      excursion(split,legs.length,window - a.tick - frames);
    } else {
      excursion(0,legs.length,window);
    }
    return rows;
  }
  path = planCycle();

  function current() {
    if (!reaction && held)
      return { ...sampleAt(held.anim, held.frame, held.at), form: held.form };
    if (!reaction) return path[cursor];
    if (reaction.approach?.length) return reaction.approach[reaction.approachFrame];
    const {anim, age, at, form, reverse} = reaction;
    const count = length(animations, anim);
    const row = sampleAt(anim, reverse ? count - age - 1 : age % count, at);
    return tricks ? { ...row, form } : row;
  }
  function begin(sequence, at, form) {
    const [first, ...rest] = sequence;
    reaction = {anim: first === 'attack' ? pickAttack(at) : first, age: 0, rest, at, form};
  }
  function stageAtHome(state) {
    if (state.at[0] === home[0] && state.at[1] === home[1]) return;
    const leg = walkingLeg(config, state.at, home, bearings);
    const from = state.anim.startsWith('walk_') ? petDirections.indexOf(state.direction) * Math.PI / 4
      : state.anim === 'turn' ? bearings[state.frame] : config.yaw;
    const rows = turnFramesFor(bearings, from, leg.angle).map(frame => sampleAt('turn', frame, state.at));
    leg.count = Math.max(1, Math.round(petFPS * leg.distance / (config.stride * 1.5)));
    walk(rows, leg);
    for (const frame of leg.entering) rows.push(sampleAt('turn', frame, home));
    reaction.at = home;
    reaction.approach = rows;
    reaction.approachFrame = 0;
    cursor = 0;
  }
  function sleeping() {
    return reaction && ['sleep_in', 'sleep'].includes(reaction.anim);
  }
  function dispatch() {
    if (!pending) return false;
    const state = current();
    if (tricks && (state.anim === 'phase' || reaction?.approach?.length)) return false;
    if (!animations[state.anim].interrupt.includes(state.frame)) return false;
    const event = pending;
    pending = undefined;
    if ((event === 'owner_back' && !sleeping()) || (event === 'idle_owner' && sleeping())) return false;
    const form = state.form ?? 'f1';
    if (tricks && form === 'f2' && ['approach', 'idle_owner'].includes(event)) return false;
    if (tricks && event === 'change_form') {
      reaction = { anim: 'phase', age: 0, at: state.at, rest: [], form,
        reverse: form === 'f2', toggle: true };
      stageAtHome(state);
    } else if (tricks && ['double_tap', 'skill_ready', 'like'].includes(event)) {
      const list = tricks[form];
      begin([list[trickIndex[form]++ % list.length]], state.at, form);
      stageAtHome(state);
    } else {
      const sequence = config.events[event === 'tap' && sleeping() ? 'tap_asleep' : event];
      begin(form === 'f2' ? sequence.map(name => name === 'happy' ? 'happy-f2' : name) : sequence, state.at, form);
    }
    return true;
  }
  function step() {
    absolute++;
    if (reaction) {
      if (reaction.approach?.length) {
        if (++reaction.approachFrame === reaction.approach.length) reaction.approach = undefined;
        return;
      }
      reaction.age++;
      if (reaction.age === length(animations, reaction.anim) && reaction.anim !== 'sleep') {
        if (reaction.rest.length) begin(reaction.rest, reaction.at, reaction.form);
        else {
          if (reaction.toggle) {
            held = reaction.reverse ? undefined : { form: 'f2', at: reaction.at, frame: 0, anim: 'idle-f2' };
            if (reaction.reverse) cursor = 0;
          }
          reaction = undefined;
        }
      }
    } else if (held) {
      held.frame = (held.frame + 1) % length(animations, held.anim);
    } else if (++cursor === path.length) {
      cursor = 0;
      cycleStart += window;
      path = planCycle();
    }
    dispatch();
  }
  function sample() {
    const state = current();
    return {...state, ...(tricks ? { form: state.form ?? 'f1' } : {}), at: [...state.at], tick: absolute};
  }
  return {
    sample,
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) throw Error('Invalid pet clock advance');
      remainder += seconds * petFPS;
      const frames = Math.floor(remainder + 1e-8);
      remainder -= frames;
      for (let i = 0; i < frames; i++) step();
      return sample();
    },
    event(name) {
      const trickEvent = tricks && ['double_tap', 'skill_ready', 'change_form'].includes(name);
      if (!tricks && name === 'double_tap' && !config.events.double_tap) name = 'like';
      if ((!trickEvent && !Object.hasOwn(config.events, name)) || name === 'tap_asleep') return false;
      pending = name;
      dispatch();
      return true;
    },
  };
}
