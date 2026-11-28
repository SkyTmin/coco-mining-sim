import {loadArtwork, NativePaintingSample} from '/viewer/native-sample.mjs';
import {createPetBehavior} from '/viewer/behavior.mjs';
import {act, bind, initial, restore} from '/exp/world.mjs';

const surface = await loadArtwork('pocket_magnet', 'atlas', () => 1, () => false);
const rule = bind(await (await fetch('/exp/rule.json')).json(), surface.data);
const seed = 7319;
if (surface.behavior.seed !== seed) throw Error('Unexpected original seed');
const pet = createPetBehavior(surface.behavior, surface.data.animations, seed);
let previous = pet.sample(), epoch = 0, hit, after, before;
for (let t = 0; t < 4800 && !after; ++t) {
  if (t % 360 === 0) pet.event('skill_ready');
  const sample = pet.advance(1 / 24);
  if (sample.anim !== previous.anim || sample.frame < previous.frame) epoch++;
  if (!hit && sample.anim === rule.clip && sample.frame === rule.frame) {
    hit = {sample, epoch};
    before = previous;
  }
  if (hit && sample.anim !== hit.sample.anim) after = sample;
  previous = sample;
}
if (!after) throw Error('Contact or subsequent clip missing');
const command = {rule: rule.id, instance: hit.epoch};
const states = {}, statuses = {};
for (const [branch, amount] of [['funded', 1], ['empty', 0]]) {
  const start = initial(rule, amount);
  const first = act(rule, start, command, hit.sample);
  const repeat = act(rule, first.world, command, hit.sample);
  states[branch] = {start, end: first.world, repeat: repeat.world};
  statuses[branch] = [first.status, repeat.status];
}

const native = document.createElement('canvas');
const painting = Object.assign(new NativePaintingSample(), {
  ctx: native.getContext('2d', {willReadFrequently: true}),
  surface, button: {dataset: {}}, entry: {runtime: 'atlas'}, selected: 'life', visible: true,
});
const canvas = document.querySelector('#picture');
const output = canvas.getContext('2d', {willReadFrequently: true});
const storageKey = 'b25-f307-worlds-v1';
const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  x => x.toString(16).padStart(2, '0')).join('');

async function nativeFrame(sample) {
  painting.heldSample = sample;
  painting.previous = null;
  const start = performance.now();
  while (true) {
    painting.draw();
    if (painting.failed) throw Error('Native drawing failed');
    if (!painting.heldSample) break;
    if (performance.now() - start > 30000) throw Error('Native decoder timeout');
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

const pixels = context => context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
window.experiment = {
  data: {seed, before, hit, after, rule, states, statuses},
  save() {
    const saved = Object.fromEntries(Object.entries(states).map(([name, group]) => [name, group.end]));
    localStorage.setItem(storageKey, JSON.stringify(saved));
  },
  async render({branch, moment, visible, sample = 'after'}) {
    const saved = moment === 'restored' ? JSON.parse(localStorage.getItem(storageKey)) : null;
    const world = saved ? restore(JSON.stringify(saved[branch]), rule) : states[branch][moment];
    await nativeFrame({before, hit: hit.sample, after}[sample]);
    if (native.width !== canvas.width || native.height !== canvas.height) throw Error('Unexpected canvas size');
    output.clearRect(0, 0, canvas.width, canvas.height);
    output.drawImage(native, 0, 0);
    if (visible) {
      output.fillStyle = world.charge > 0 ? '#03e5eb' : '#d0380f';
      output.fillRect(12, 12, 5, 4);
      if (world.changed.includes(rule.landmark)) {
        output.fillStyle = '#fc1bd9';
        output.fillRect(145, 118, 5, 3);
      }
    }
    return {world, nativeRGBA: await digest(pixels(painting.ctx)), outputRGBA: await digest(pixels(output))};
  },
};
