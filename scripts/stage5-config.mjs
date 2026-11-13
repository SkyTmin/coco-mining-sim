// Validate the merged stage-5 config before emitting any files.
export function validateStage5(d) {
  const errors = [], positive = x => Number.isFinite(x) && x > 0;
  const increasing = xs => Array.isArray(xs) && xs.length > 0 && xs.every((x,i) => Number.isFinite(x) && (!i || x > xs[i-1]));
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const r = d.rebirth ?? {}, e = d.events ?? {}, q = d.fx?.quality ?? {};
  check(Array.isArray(r.cups) && r.cups.length === (d.worlds?.length ?? 0) && r.cups.every((x,i,a) => Number.isSafeInteger(x) && x >= 0 && (!i || x >= a[i-1])), 'rebirth.cups must contain ten nondecreasing integers');
  check(increasing(r.ranks?.map(x => x.cups)), 'rebirth.ranks thresholds must strictly increase');
  let lift = 1;
  for (const rank of r.ranks ?? []) {
    check(/^[a-z_]+$/.test(rank.id) && Number.isSafeInteger(rank.cups), 'rebirth.ranks require IDs and integer thresholds');
    if (rank.lift !== undefined) { check(Number.isInteger(rank.lift) && rank.lift >= lift && rank.lift <= (d.worlds?.length ?? 0), 'rebirth.rank lift must not decrease or exceed world count'); lift = rank.lift; }
  }
  check(increasing(e.streak?.tiers) && e.streak.tiers.length === 4 && e.streak.cap >= e.streak.tiers.at(-1), 'events.streak requires four increasing tiers within cap');
  check(increasing(e.streak?.multipliers) && e.streak.multipliers.length === 4 && e.streak.multipliers.every(x => x > 1), 'events.streak multipliers must increase above one');
  for (const name of ['vein','bomb']) check(positive(e[name]?.minSeconds) && e[name].minSeconds <= e[name].maxSeconds, `events.${name} interval must be positive min <= max`);
  for (const [key, xs] of Object.entries(q).filter(([key]) => !key.startsWith('_'))) check(Array.isArray(xs) && xs.length === 3 && xs.every((x,i) => (typeof x === 'boolean' || Number.isFinite(x) && x >= 0) && (!i || Number(x) >= Number(xs[i-1]))), `fx.quality.${key} must have three nondecreasing budgets`);
  for (const key of ['holdSeconds','hintSeconds','paceWindow','paceMinSeconds','giftStartSeconds','requestSeconds']) check(positive(r[key]), `rebirth.${key} must be positive`);
  check(r.paceMinSeconds <= r.paceWindow && positive(r.profitableRatio) && positive(r.profitableEtaSeconds), 'invalid rebirth pacing');
  for (const [key,value] of Object.entries(d.qualityRules ?? {}).filter(([key]) => !key.startsWith('_'))) check(positive(value), `qualityRules.${key} must be positive`);
  check(positive(d.income?.temporaryCap) && d.income.temporaryCap >= 1, 'income.temporaryCap must be >= 1');
  check(positive(d.music?.bpm) && positive(d.music?.loopSeconds) && Array.isArray(d.music?.worlds), 'music requires tempo, loop length and stems');
  const asset = value => value === '' || typeof value === 'string' && /^rbxassetid:\/\/[1-9][0-9]*$/.test(value);
  check(Array.isArray(d.music?.worlds) && d.music.worlds.every(world => world && ['base','full','fever'].every(stem => asset(world[stem]))), 'music stems must be empty or Roblox asset IDs');
  check(asset(d.sounds?.eventAtlasId), 'sounds.eventAtlasId must be empty or a Roblox asset ID');
  const storage = d.game?.storage;
  check(storage && ['livePrefix','studioPrefix'].every(key => typeof storage[key] === 'string' && /^[A-Za-z0-9_]+$/.test(storage[key])) && storage.livePrefix !== storage.studioPrefix, 'storage requires separate nonempty Studio/live prefixes');
  check(Array.isArray(storage?.isolatedPlaces) && storage.isolatedPlaces.every(id => Number.isSafeInteger(id) && id > 0) && new Set(storage.isolatedPlaces).size === storage.isolatedPlaces.length, 'storage.isolatedPlaces requires unique positive integer PlaceIds');
  return errors;
}
