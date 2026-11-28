// An experimental sidecar. Its external inputs are an atlas descriptor and a native clip sample.
// Only the two explicit command properties and the unmodified native sample are trusted.
const integer = n => Number.isSafeInteger(n) && n >= 0;

export function bind(rule, atlas) {
  if (rule.version !== 1 || rule.painting !== atlas.id || typeof rule.id !== 'string' ||
      typeof rule.landmark !== 'string' || !integer(rule.initialCharge) || !integer(rule.cost) || !rule.cost ||
      !integer(rule.hitIndex)) throw Error('Invalid binding');
  const animation=atlas.animations[rule.clip];
  const frame=animation?.hit?.[rule.hitIndex];
  if (!integer(frame) || frame >= animation.frames || !atlas.clips[rule.clip]?.[frame])
    throw Error('Named contact has no native atlas row');
  return {...rule,frame};
}

export function initial(rule, available = rule.initialCharge) {
  if (!integer(available)) throw Error('Invalid initial charge');
  return {version:1,painting:rule.painting,charge:available,changed:[],applied:[]};
}

export function restore(serialized, rule) {
  const world=JSON.parse(serialized);
  if (world?.version!==1 || world.painting!==rule.painting || !integer(world.charge) ||
      !Array.isArray(world.changed) || !Array.isArray(world.applied) ||
      world.changed.length>1 || world.changed.some(x => x!==rule.landmark) ||
      world.applied.length!==world.changed.length || world.applied.some(x => !integer(x)))
    throw Error('Invalid world save');
  return world;
}

// Read-only admission check for optional interaction; the charge is committed at the native contact.
export function admission(rule, world) {
  if (world.charge<rule.cost) return 'insufficient';
  if (world.changed.includes(rule.landmark)) return 'already-changed';
  return 'eligible';
}

export function act(rule, world, command, sample) {
  if (!command || Object.keys(command).sort().join(',') !== 'instance,rule' ||
      command.rule!==rule.id || !integer(command.instance) ||
      sample?.anim!==rule.clip || sample.frame!==rule.frame) return {status:'invalid',world};
  if (world.applied.includes(command.instance)) return {status:'duplicate',world};
  const allowed=admission(rule,world);
  if (allowed!=='eligible') return {status:allowed,world};
  return {status:'applied',world:{...world,charge:world.charge-rule.cost,
    changed:[...world.changed,rule.landmark],applied:[...world.applied,command.instance]}};
}

export function describe(sample, world) {
  if (!world) return sample;
  return {...sample,world:{charge:world.charge,changed:world.changed.slice()}};
}
