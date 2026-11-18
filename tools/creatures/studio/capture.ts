// Records the rigs a creature builds while it draws one frame, so checks can read the 3D primitives
// instead of guessing from pixels. Patching the prototype keeps every creature file untouched.
import { Rig } from '../rig/f15-rig';

let active: Rig[] | null = null;
let patched = false;

function patch() {
  if (patched) return;
  patched = true;
  const proto = Rig.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  for (const name of ['ell', 'ball', 'cap', 'poly', 'spike', 'dot', 'line']) {
    const original = proto[name];
    if (typeof original !== 'function') continue;
    proto[name] = function (this: Rig, ...args: unknown[]) {
      if (active && !active.includes(this)) active.push(this);
      return original.apply(this, args);
    };
  }
}

/** Runs `draw` and returns the largest rig it built (the body), or null. */
export function captureRig<T>(draw: () => T): { result: T; rig: Rig | null; rigs: Rig[] } {
  patch();
  const seen: Rig[] = [];
  const outer = active;
  active = seen;
  try {
    const result = draw();
    const rig = seen.length ? [...seen].sort((a, b) => b.prims.length - a.prims.length)[0] : null;
    return { result, rig, rigs: seen };
  } finally {
    active = outer;
  }
}
