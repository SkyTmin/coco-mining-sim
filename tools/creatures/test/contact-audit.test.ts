import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { Rig, type Mat, type V3 } from '../rig/f15-rig';
import { projectFigure } from '../rig/figure';
import { tn } from '../kit/f11-mobkit';
import { paintMaterial, traceMaterials } from '../technique-fx';
import { visibleEyePixels } from '../studio/visibility';
import { checkCreature, type Painting } from '../studio/checks';
import { allowedContact, birthDistance, extension } from '../studio/contact-audit';
import type { Creature } from '../types';

const coat: Mat = { T: tn('#112244', '#385577', '#8899aa', '#ccddee') };
function fixture(): Painting {
  const c: Creature = {
    id: 'contact-fixture',
    rarity: 'common',
    theme: 'test',
    animations: { idle: { seconds: 1 }, tech_test: { seconds: 8 / 24, hits: [3 / 24] } },
    techniques: {
      tech_test: {
        title: 'test',
        reference: '',
        weapon: 'handR',
        reachHand: 'R',
        contactKind: 'air',
        keys: [{ frame: 3, role: 'hit', pose: {} }],
      },
    },
    frame() {
      const rig = new Rig();
      rig.tag = 'torso';
      rig.ball([0, 0, 15], 7, coat);
      const start = rig.size;
      rig.dot([3, 7, 17], coat.T[3], 0, 2);
      rig.markEye(start, 1, true);
      return projectFigure(rig, 50, [22, 40], {
        shoulderR: [0, 0, 15],
        elbowR: [5, 0, 15],
        handR: [10, 0, 15],
      });
    },
    props(f) {
      if (f.anim !== 'tech_test' || f.t === 0) return;
      // A consulted future trajectory is not evidence of where an object first appeared.
      const held = f.t < 2 / 24 ? f.points.handR : ([f.feet[0] + 29, 12] as [number, number]);
      paintMaterial(f, 'above', 'held', held, (pen, x, y) => pen.lineS(x, y, x + 1, y, '#ffffff', 1));
      paintMaterial(f, 'above', 'floor', [20, f.feet[1] + 4], (pen, x, y) =>
        pen.lineS(x, y, x + 1, y, '#ffffff', 1),
      );
      // The first brush is transparent. The next painted dot is displaced from its claimed centre.
      paintMaterial(f, 'above', 'floating', f.points.handR, (pen) => {
        if (f.t >= 2 / 24) pen.lineS(31, 17, 32, 17, '#ffd955', 1);
      });
    },
  };
  return {
    c,
    s: (p) => p.rect(0, 0, p.w - 1, p.h - 1, [18, 30, 44, 255]),
    b: {
      wood: ['#262028', '#453644', '#645054', '#987664'],
      accent: '#b69a64',
    },
  };
}

test('first visible material uses deposited pixels, remembers a held object through release, accepts the floor', () => {
  const p = fixture();
  const normal = compose(p.c, p.s, p.b, 'tech_test', 2 / 24);
  const recorded = traceMaterials(new Set(), () => compose(p.c, p.s, p.b, 'tech_test', 2 / 24));
  assert.deepEqual(recorded.picture.data, normal.picture.data);
  const issues = checkCreature(p, ['tech_test'], {}, false).filter((f) =>
    ['from-nowhere', 'reach', 'face-at-contact'].includes(f.kind),
  );
  assert.deepEqual(
    issues.map((f) => [f.kind, f.frames]),
    [['from-nowhere', [2]]],
  );
  assert.match(issues[0].note, /floating/);
});

test('an opaque brush on the same FX layer delays a hidden item’s first visible frame', () => {
  const p = fixture();
  p.c.effects = (f) => {
    if (f.t === 2 / 24) f.above.lineS(30, 17, 34, 17, '#661112', 1);
  };
  const issues = checkCreature(p, ['tech_test'], {}, false).filter((f) => f.kind === 'from-nowhere');
  assert.deepEqual(
    issues.map((f) => f.frames),
    [[3]],
  );
});

test('missing material, a folded wrist, and an eye completely covered in the final painting are errors', () => {
  const p = fixture(),
    original = p.c.frame;
  p.c.frame = (...args) => {
    const b = original(...args);
    b.joints!.handR = [0, 0, 15];
    return b;
  };
  p.c.effects = (f) => {
    f.above.col('#000000');
    f.above.rect(0, 0, f.w, f.h);
  };
  p.c.techniques!.tech_test.contacts = [
    { frame: 3, socket: 'handR', kind: 'air' },
    { frame: 3, socket: 'handR', kind: 'projectile', projectile: 'undrawn' },
  ];
  const issues = checkCreature(p, ['tech_test'], {}, false);
  assert.ok(issues.some((f) => f.kind === 'face-at-contact' && f.frames[0] === 3));
  assert.ok(issues.some((f) => f.kind === 'reach' && f.frames[0] === 3));
  assert.ok(issues.some((f) => f.kind === 'from-nowhere' && f.note.includes('undrawn')));
});

test('boundaries are in native px and physical 3D; exceptions require one frame and object with a reason', () => {
  assert.equal(birthDistance([[7, 20]], { handR: [1, 20], handRGround: [7, 20] }, 80).distance, 6);
  assert.equal(birthDistance([[8, 20]], { handR: [1, 20], handRGround: [8, 20] }, 80).distance, 7);
  const joints: Record<string, V3> = { shoulderR: [0, 0, 0], elbowR: [4, 0, 3], handR: [8, 0, 0] };
  assert.equal(extension(joints, 'R'), 0.8);
  assert.equal(extension({ shoulderR: [0, 0, 0], elbowR: [0, 0, 5], handR: [0, 0, 10] }, 'R'), 1);
  assert.equal(extension(joints, 'L'), null);
  const rule = {
    kind: 'from-nowhere' as const,
    anim: 'tech_test',
    frame: 2,
    object: 'drop',
    reason: 'condenses below the cloud',
  };
  assert.equal(allowedContact([rule], 'from-nowhere', 'tech_test', 2, 'drop'), true);
  assert.equal(allowedContact([rule], 'from-nowhere', 'tech_test', 3, 'drop'), false);
  assert.equal(allowedContact([rule], 'from-nowhere', 'tech_test', 2, 'snow'), false);
  assert.equal(allowedContact([{ ...rule, reason: '  ' }], 'from-nowhere', 'tech_test', 2, 'drop'), false);
});

test('an ordinary eye tag is visible; an explicitly closed lid with that tag is not an eye', () => {
  const rig = new Rig();
  rig.tag = 'eyeL';
  rig.ball([0, 0, 10], 3, coat);
  assert.ok(visibleEyePixels(rig) > 0);
  rig.markEye(0, -1, false);
  assert.equal(visibleEyePixels(rig), 0);
});

test('a 3D prop shares its first birth with its FX flight and reports a second floating 3D item', () => {
  const p = fixture();
  p.c.frame = (_anim, t) => {
    const rig = new Rig();
    rig.tag = 'torso';
    rig.ball([0, 0, 12], 3, coat);
    if (t <= 1 / 24) {
      rig.tag = 'material:keeper';
      rig.ball([10, 0, 15], 2, coat);
    }
    if (t >= 2 / 24) {
      rig.tag = 'projectile:unsupported';
      rig.ball([-19, 0, 25], 1, coat);
    }
    return projectFigure(rig, 50, [23, 40], { handR: [10, 0, 15] });
  };
  p.c.props = (f) => {
    if (f.t > 1 / 24)
      paintMaterial(f, 'above', 'keeper', [26, 17], (pen, x, y) => pen.lineS(x, y, x + 1, y, '#ffffff', 1));
  };
  const issues = checkCreature(p, ['tech_test'], {}, false).filter((f) => f.kind === 'from-nowhere');
  assert.equal(issues.length, 1);
  assert.match(issues[0].note, /unsupported/);
  assert.deepEqual(issues[0].frames, [2]);
});

test('when the near end is under another stroke, measure the physical object in its first visible frame', () => {
  const p = fixture();
  p.c.props = (f) => {
    if (f.t === 0) return;
    const at = f.points.handR;
    paintMaterial(f, 'above', 'icicle', at, (pen, x, y) => pen.lineS(x, y, x + 12, y, '#4499cc', 1));
    f.above.lineS(at[0], at[1], at[0] + 9, at[1], '#663311', 1);
  };
  const issues = checkCreature(p, ['tech_test'], {}, false).filter((f) => f.kind === 'from-nowhere');
  assert.deepEqual(issues, []);
});
