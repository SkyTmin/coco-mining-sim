import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reach,
  aim,
  look,
  goalAt,
  collisionShell,
  segmentClearance,
  solveReach,
  solveShaft,
  toLocal,
} from '../bodies/goals';
import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import { F3, Rig, proj, vadd, vlen, vmul, vsub, type V3 } from '../rig/f15-rig';
import { tn } from '../kit/f11-mobkit';
import { baselineOf, worstClip } from '../studio/clip';
import { loadPainting } from '../render';
import { sampleAnimation } from '../studio/checks';
import { techniquePoseAt, type Technique, type JointPose } from '../technique';
import book from '../c/frost_yeti-keys';

test('a two-link arm and a rigid shaft go around the body to their exact goals', () => {
  const basis = F3.yaw(0),
    rig = new Rig(),
    mat = { T: tn('#222222', '#666666', '#999999', '#eeeeee') };
  rig.tag = 'torso';
  rig.ell(basis, [0, 0, 0], [10, 10, 10], mat);
  const shell = collisionShell(rig),
    rest = baselineOf(rig);
  const shoulder: V3 = [0, -16, 0],
    target: V3 = [0, 16, 0];
  assert.ok(segmentClearance(shell, shoulder, target) < 0.01);
  const options = { basis, side: 1, upper: 26, lower: 25, shoulder, target, shell };
  const solved = solveReach(options);
  assert.deepEqual(solved.hand, target);
  assert.ok(Math.abs(vlen(vsub(solved.shoulder, solved.elbow)) - 26) < 1e-6);
  assert.ok(Math.abs(vlen(vsub(solved.hand, solved.elbow)) - 25) < 1e-6);
  rig.tag = 'armR';
  rig.cap(solved.shoulder, solved.elbow, 2, 2, mat);
  rig.cap(solved.elbow, solved.hand, 2, 2, mat);
  const dir = solveShaft(shell, target, [0, 1, 0], 32, basis);
  const butt = vsub(target, vmul(dir, 32));
  assert.ok(segmentClearance(shell, target, butt) >= 0.85);
  rig.tag = 'weapon';
  rig.cap(butt, target, 1.5, 1.5, mat);
  assert.equal(worstClip(rig, rest), null);
  assert.throws(() => solveReach({ ...options, target: [0, 0, 0] }), /inside the body/);
  assert.throws(() => solveReach({ ...options, target: [0, 999, 0] }), /workspace/);
  assert.throws(() => solveShaft(shell, [0, 0, 0], [0, 1, 0], 32, basis), /inside the body/);
});

test('aim drives both accepted club attacks, including when the author moves the contact', async () => {
  const painting = await loadPainting('frost_yeti');
  const card = readCreatureCard('frost_yeti');
  for (const move of ['tech_slam', 'tech_snowball'] as const) {
    const spec: Technique = book[move],
      key = spec.keys.find((k) => k.role === 'hit')!;
    const target = goalAt(key.pose, 'weaponTip')!;
    assert.ok(target && key.pose['goal.weaponTip.contactFrame'] === key.frame);
    for (const delta of [
      [0, 0, 0],
      [2, -0.7, 0.4],
    ] as V3[]) {
      const expected = vadd(target, delta);
      const changed = {
        ...spec,
        keys: spec.keys.map((k) =>
          k === key ? { ...k, pose: { ...k.pose, ...aim('weaponTip', expected, k.frame) } } : k,
        ),
      };
      const frame = armedFrame(card, card.life);
      const fr = frame(move, key.frame / 24, 0, 'normal', {
        gaitPhase: 0,
        headSide: 0,
        techniquePose: techniquePoseAt(changed, key.frame / 24),
      });
      const p = F3.yaw(card.life.yaw)
        .at(-3, 0, 0)
        .p(...expected);
      const projected = proj([p[0] * 1.23, p[1] * 1.23, p[2] * 1.275], ...fr.anchor);
      assert.ok(
        Math.hypot(fr.points!.clubTip[0] - projected[0], fr.points!.clubTip[1] - projected[1]) < 0.01,
      );
    }
    const clips = sampleAnimation(painting, move, {}).filter((f) => f.clip);
    assert.deepEqual(
      clips.map((f) => f.clip),
      [],
    );
  }
});

test('the armed family poses physical hands, head and weapon in unprojected local coordinates', () => {
  const card = readCreatureCard('frost_yeti');
  card.proportions.scale = 0.84;
  const hand: V3 = [25, 26, 53],
    tip: V3 = [36, -33, 0],
    eyeTarget: V3 = [22, 28, 68];
  const pose: JointPose = { ...reach('handR', hand), ...look('head', eyeTarget) };
  for (const side of [0, 5, 11]) {
    let seen = false;
    const frame = armedFrame(card, card.life, {
      decorate(r, F, sockets) {
        seen = true;
        assert.ok(vlen(vsub(toLocal(F, sockets.handR), hand)) < 1e-6);
        const head = r.prims.find((p) => p.k === 0 && p.t === 'head');
        assert.ok(head && head.k === 0);
        const forward = head.a[0],
          gaze = vsub(F.p(...eyeTarget), head.c);
        const cosine =
          (forward[0] * gaze[0] + forward[1] * gaze[1] + forward[2] * gaze[2]) / (vlen(forward) * vlen(gaze));
        assert.ok(cosine > 0.999999);
      },
    });
    frame('tech_pose', 0, side, 'normal', { gaitPhase: 0, headSide: side, techniquePose: pose });
    assert.ok(seen);
    const attack = armedFrame(card, card.life, {
      decorate(_r, F, sockets) {
        assert.ok(vlen(vsub(toLocal(F, sockets.weaponTip), tip)) < 1e-6);
        assert.ok(Math.abs(vlen(vsub(sockets.weaponTip, sockets.clubGrip)) - 53) < 1e-6);
      },
    });
    attack('tech_pose', 0, side, 'normal', {
      gaitPhase: 0,
      headSide: side,
      techniquePose: aim('weaponTip', tip, 0),
    });
  }
});
