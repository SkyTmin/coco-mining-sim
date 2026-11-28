// The gallery and release recordings use the very same painting and clock.
import { sharedMaterial } from './material.mjs';
import { createBattle, drawBattle, drawPreview, F1_CLIPS, F1_POSES } from './f1-native.mjs';

const clips = Object.entries({ ...F1_CLIPS, ...F1_POSES }).map(([id, clip]) => ({
  id, name: clip.label, duration: clip.duration,
}));
const durations = new Map(clips.map(({ id, duration }) => [id, duration]));
const original = [292, 244];
const sceneZoom = 2.3125;
const size = original.map((n) => Math.round(n * sceneZoom));
const center = size.map((n) => Math.round(n / 2));
const scale = 2;
const pad = 18 * sceneZoom;
// The complete four-stage fight occupies 508 × 468 pixels including its native telegraphs.
const camera = { scale, originX: center[0] - 128, originY: Math.round(pad + 254) - 104 };

function startingPoint(clip, direction) {
  // Start the southward roll and leap further up the carpet. Their warning, landing and dust
  // then fit the SAME fixed field as the full fight; the camera never tracks the moving actor.
  const runway = clip === 'leap' ? 134 : (clip === 'leapAim' || clip === 'rollAim') ? 96 : 0;
  const south = Math.max(0, Math.sin(direction * Math.PI / 4));
  return { x: center[0], y: Math.round(pad + 306 - runway * south) };
}
const materialAt = (path) => sharedMaterial(new URL(path, import.meta.url).href, ...original);

export function kingCatalogClips() {
  return [
    { id: 'life', name: 'Жизнь' },
    ...clips.map(({ id, name, duration }) => ({ id, name, frames: Math.ceil(duration * 24 - 1e-7) })),
  ];
}

export async function loadKingPainting() {
  const [scene, border] = await Promise.all([
    materialAt('./atlases/rat_king/scene.json'),
    materialAt('./atlases/frames/secret/atlas.json'),
  ]);
  let ensemble;
  function companions(clip, stage, time, progress, direction, anchor) {
    if (!ensemble || ensemble.stage !== stage || ensemble.clip !== clip || time < ensemble.time) {
      const battle = createBattle();
      battle.setStage(stage);
      // Let the guards and detached kinglets leave their spawn points.
      battle.advance(1.75);
      ensemble = { battle, stage, clip, time: 0 };
    }
    const { battle } = ensemble;
    if (!(clip in F1_POSES)) battle.advance(time - ensemble.time);
    ensemble.time = time;
    if (!(clip in F1_POSES)) return battle.state;
    // A reviewed gesture is a family portrait. Leave each little king room for its own pose
    // and end the combat telegraph that happened to be active when the preview was selected.
    const tile = 16 * scale;
    const mobs = battle.state.mobs.filter((m) => m.kind === 'kinglet').map((m, i) => ({
      ...m,
      mode: 'idle', t: time, vx: 0, vy: 0, tele: null, danger: 0,
      x: (anchor.x - camera.originX) / tile + (i === 0 ? -3.0 : 2.8),
      y: (anchor.y - camera.originY) / tile + (i === 0 ? 0.62 : -0.48),
      face: direction * Math.PI / 4, dir: direction * Math.PI / 4,
      data: { ...m.data, petMode: clip, petProgress: progress },
    }));
    return { ...battle.state, mobs, strikes: [], zones: [], impacts: [], time: battle.state.time + time };
  }
  function render(ctx, { clip, direction = 0, time = 0, stage = 1, battle, tick = Math.floor(time * 24) }) {
    const [width, height] = size;
    const anchor = startingPoint(clip, direction);
    if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
      ctx.canvas.width = width;
      ctx.canvas.height = height;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, width - 2 * pad, height - 2 * pad);
    ctx.clip();
    scene.paint(ctx, tick, width, height);
    const paintProps = (front) => {
      ctx.save();
      ctx.scale(width / original[0], height / original[1]);
      for (const [depth, sprite, x, y] of scene.props) {
        if ((depth * sceneZoom > anchor.y) === front) scene.stamp(ctx, sprite, x, y);
      }
      ctx.restore();
    };
    paintProps(false);
    if (clip === 'life') {
      drawBattle(ctx, battle.state, camera);
    } else {
      const duration = durations.get(clip);
      if (!duration) throw new Error('Неизвестный клип Крысиного короля ' + clip);
      const progress = Math.min(1, Math.max(time / duration, 0));
      const cast = stage >= 2 ? companions(clip, stage, time, progress, direction, anchor) : undefined;
      drawPreview(ctx, { kind: 'king', clip, direction, progress, phase: stage, ...anchor, scale, id: 7, travel: true },
        cast, camera);
    }
    paintProps(true);
    ctx.restore();
    border.paint(ctx, tick, width, height);
  }
  return { size, clips, render, createBattle };
}
