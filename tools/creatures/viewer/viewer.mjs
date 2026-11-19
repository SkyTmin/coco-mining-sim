import { paintSceneryRays } from './scenery.mjs';
import { createPetBehavior } from './behavior.mjs';

import { drawSprite, imagePage, json, material, sharedMaterial } from './material.mjs';

// Some boss atlases contain hundreds of MB of decoded pixels. A thumbnail needs
// only the pages for its current pose. Keep a small working set and prefetch the next pose.
function actorPages(root, atlas, priority) {
  const pages = new Map();
  function touch(id) {
    let page = pages.get(id);
    if (!page) {
      page = {};
      imagePage(root + atlas.pages[id], priority).then(
        (image) => {
          page.image = image;
        },
        (error) => {
          page.error = error;
        },
      );
    }
    pages.delete(id);
    pages.set(id, page);
    return page;
  }
  return {
    prepare(row, next) {
      const needed = new Set();
      let ready = true;
      for (const pose of [row, next]) {
        for (let i = 5; i < pose.length; i++) {
          if (!pose[i]) continue;
          const id = atlas.rects[pose[i][0]][0];
          if (needed.has(id)) continue;
          needed.add(id);
          const page = touch(id);
          if (pose === row && page.error) throw page.error;
          if (pose === row && !page.image) ready = false;
        }
      }
      for (const [id, page] of pages) {
        if (pages.size <= Math.max(needed.size, 5)) break;
        if (!needed.has(id) && (page.image || page.error)) pages.delete(id);
      }
      return ready;
    },
    stamp(ctx, id, x, y) {
      const rect = atlas.rects[id];
      drawSprite(ctx, pages.get(rect[0]).image, rect, x, y);
    },
  };
}

async function loadArtwork(id, runtime, priority) {
  if (runtime === 'f1') {
    const { loadKingPainting } = await import('./king-painting.mjs');
    return loadKingPainting();
  }
  const root = './atlases/' + id + '/';
  const data = await json(root + 'atlas.json');
  const [scene, border, actor, behavior] = await Promise.all([
    typeof data.scene === 'string'
      ? sharedMaterial(new URL(root + data.scene, document.baseURI).href, ...data.canvas)
      : material(root, data.scene, ...data.canvas, priority),
    sharedMaterial('./atlases/frames/' + data.rarity + '/atlas.json', ...(data.borderCanvas ?? data.canvas)),
    actorPages(root, data.actors, priority),
    data.behavior ? json(root + 'behavior.json') : null,
  ]);
  return { data, scene, border, actor, behavior };
}

const rarityNames = {
  common: 'Обычная',
  uncommon: 'Необычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
  mythic: 'Мифическая',
  secret: 'Секретная',
};
const sections = { ours: 'Наши существа', bosses: 'Боссы «Каторги»', pets: 'Питомцы «Каторги»', archive: 'Архив «Каторги»' };
const wallColors = { ours: '#525e52', bosses: '#504354', pets: '#475957', archive: '#504354' };
const moods = {
  idle: 'Отдыхает',
  life: 'Гуляет',
  happy: 'Радуется',
  trick: 'Показывает трюк',
  look: 'Присматривается',
  sleep_in: 'Укладывается',
  sleep: 'Спит',
  sleep_out: 'Просыпается',
  fidget_a: 'Занят своим делом',
  fidget_b: 'Занят своим делом',
  wake_startled: 'Вздрогнул',
  tired: 'Устал',
};
function homeClip(entry) {
  return ['life', 'idle'].find((id) => entry.clips.some((c) => c.id === id)) ?? entry.clips[0].id;
}
function buttonFor(label, fn) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', fn);
  return button;
}

class Painting {
  constructor(button, entry) {
    this.button = button;
    this.ctx = button.querySelector('canvas').getContext('2d');
    this.visible = false;
    this.assign(entry);
    button.addEventListener('click', () => this.tap());
    button.addEventListener('keydown', (event) => {
      if (event.key === '2' && this.trickClip) {
        event.preventDefault();
        this.interact('like');
      }
    });
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible') && !this.away && this.selected === 'life')
        this.pet?.event('approach');
    });
  }
  assign(entry, variant = entry.variants?.[0], clip = homeClip(entry)) {
    clearTimeout(this.releaseTimer);
    clearTimeout(this.sleepTimer);
    this.ticket = {};
    // A boss part (hydra head, echo) is a variant with its own clip list; a pet's gold skin shares the clips.
    this.entry = variant?.clips ? { ...entry, clips: variant.clips } : entry;
    this.variant = variant;
    this.atlasId = variant?.atlas ?? entry.id;
    if (!this.entry.clips.some((c) => c.id === clip)) clip = homeClip(this.entry);
    this.surface = this.pet = this.reaction = this.pending = this.heldSample = this.previous = null;
    this.away = false;
    this.direction = 0;
    this.manualStage = 1;
    this.sleepAt = null;
    this.lastTap = -Infinity;
    this.selected = clip;
    this.age = 0;
    this.busy = false;
    this.failed = false;
    this.button.dataset.id = entry.id;
    delete this.button.dataset.clip;
    this.button.setAttribute('aria-busy', 'true');
    this.button.setAttribute('aria-label', entry.name + ' — коснуться картины');
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.canvas.textContent = entry.name;
  }
  tap() {
    const now = performance.now(),
      double = now - this.lastTap < 350;
    this.lastTap = double ? -Infinity : now;
    this.interact(double ? 'like' : 'tap');
  }
  get trickClip() {
    if (this.has('trick')) return 'trick';
    if (this.entry.section === 'pets' && this.has('work')) return 'work';
  }
  has(id) {
    return this.entry.clips.some((clip) => clip.id === id);
  }
  /** Download order: the opened painting, then paintings on screen, then the rest. */
  get priority() {
    return this === featured ? 0 : this.visible ? 1 : 2;
  }
  async ensure() {
    if (this.surface || this.busy) return;
    this.busy = true;
    this.failed = false;
    const ticket = this.ticket;
    try {
      const art = await loadArtwork(this.atlasId, this.entry.runtime, () => this.priority);
      if (ticket !== this.ticket) return;
      this.surface = art;
      if (!this.pet && art.createBattle) this.pet = art.createBattle();
      if (!this.pet && art.behavior) this.pet = createPetBehavior(art.behavior, art.data.animations);
      this.button.setAttribute('aria-busy', 'false');
      if (this === featured) {
        hero.setAttribute('aria-busy', 'false');
        refreshControls();
      }
      if (this.pending) {
        const pending = this.pending;
        this.pending = null;
        this.interact(pending);
      }
      this.draw();
    } catch (error) {
      if (ticket !== this.ticket) return;
      this.failed = true;
      this.button.setAttribute('aria-busy', 'false');
      if (this === featured) {
        hero.setAttribute('aria-busy', 'false');
        refreshMood();
      }
      console.error('Не удалось загрузить картину', this.atlasId, error);
    } finally {
      if (ticket === this.ticket) this.busy = false;
    }
  }
  choose(id) {
    if (this.entry.runtime === 'f1') {
      if (this.selected === 'life') this.manualStage = this.pet?.stage ?? 1;
      else if (id === 'life' && this.pet && this.pet.stage !== this.manualStage) this.pet.setStage(this.manualStage);
      if (['swap', 'sweepAim', 'leapAim', 'leap'].includes(id)) this.manualStage = 4;
      if (id === 'summon') this.manualStage = Math.max(2, this.manualStage);
      if (['rollAim', 'roll', 'cleaveAim'].includes(id) && this.manualStage === 4) this.manualStage = 1;
    }
    this.selected = id;
    this.age = 0;
    this.reaction = this.heldSample = this.previous = null;
    if (this === featured) refreshControls();
    if (this.surface) this.draw();
    else this.ensure();
  }
  interact(event) {
    this.heldSample = null;
    if (!this.surface) {
      this.pending = event;
      this.ensure();
      return;
    }
    if (this.entry.runtime === 'f1' && this.selected !== 'life') this.choose('life');
    if (this.pet && this.selected === 'life') {
      if (this.away) setAway(false, false, this);
      this.pet.event(event);
      return;
    }
    const clip = event === 'like' && this.trickClip ? this.trickClip : 'happy';
    if (this.has(clip)) this.reaction = { anim: clip, age: 0 };
  }
  changeStage(stage) {
    if (!this.pet || this.entry.runtime !== 'f1') return;
    this.choose('life');
    if (stage) this.pet.setStage(stage);
    else this.pet.nextStage();
    this.previous = null;
    this.draw();
    if (this === featured) refreshControls();
  }
  face(direction) {
    this.direction = direction;
    if (this.selected === 'life') {
      // An isolated pose can face the camera freely. The walking battle always faces its target.
      const clip = this.button.dataset.clip;
      this.choose(this.has(clip) && clip !== 'life' ? clip : 'idle');
    }
    this.previous = null;
    this.draw();
    if (this === featured) refreshControls();
  }
  drawKing(dt) {
    const living = this.selected === 'life';
    this.age += dt;
    if (living) this.pet.advance(dt);
    const stage = living ? this.pet.stage : this.manualStage;
    const clip = this.selected;
    const tick = Math.floor(this.age * 24);
    const signature = [clip, this.direction, tick, stage].join('/');
    if (this.previous === signature) return;
    this.previous = signature;
    const duration = this.surface.clips.find((c) => c.id === clip)?.duration;
    const frame = duration ? tick % Math.ceil(duration * 24 - 1e-7) : tick;
    const time = frame / 24;
    this.surface.render(this.ctx, {
      clip, direction: this.direction, time, stage, battle: this.pet, tick,
    });
    const king = living ? this.pet.state.mobs.find((m) => m.kind === 'king') : undefined;
    const displayClip = king?.data?.petMode ?? king?.mode ?? clip;
    const button = this.button;
    const changed = Number(button.dataset.stage) !== stage || button.dataset.clip !== displayClip;
    button.dataset.clip = displayClip;
    button.dataset.frame = frame;
    button.dataset.stage = stage;
    button.dataset.direction = living && king ? (Math.round(king.face * 4 / Math.PI) + 8) % 8 : this.direction;
    if (this === featured) {
      if (changed) {
        refreshKingControls();
        refreshMood();
      }
      if (heroVisible) copyToHero();
    }
  }
  sample(dt) {
    const { data } = this.surface;
    const live = this.pet?.advance(dt);
    if (this.selected === 'life' && live) return live;
    const fps = (anim) => data.animations[anim]?.fps ?? data.fps;
    this.age = (this.age + dt) % (data.clips[this.selected].length / fps(this.selected));
    if (this.reaction) {
      const r = this.reaction;
      r.age += dt;
      const frame = Math.floor(r.age * fps(r.anim));
      if (frame < data.clips[r.anim].length) return { anim: r.anim, frame };
      this.reaction = null;
    }
    return { anim: this.selected, frame: Math.floor(this.age * fps(this.selected)) };
  }
  draw(dt = 0) {
    if (!this.surface || (!this.visible && !(this === featured && heroVisible))) {
      if (this.entry.runtime !== 'f1' || this.selected === 'life') this.pet?.advance(dt);
      return;
    }
    if (this.entry.runtime === 'f1') return this.drawKing(dt);
    const { data, scene, border, actor } = this.surface,
      ctx = this.ctx;
    const state = this.heldSample ?? this.sample(dt);
    const frames = data.clips[state.anim];
    const frame = Math.min(state.frame, frames.length - 1),
      row = frames[frame];
    try {
      if (!actor.prepare(row, frames[(frame + 1) % frames.length])) {
        this.heldSample = state;
        return;
      }
    } catch (error) {
      this.failed = true;
      this.surface = this.previous = null;
      if (this === featured) refreshMood();
      console.error('Не удалось загрузить кадр', this.atlasId, error);
      return;
    }
    this.heldSample = null;
    let [feetX, feetY, dx, dy, phase] = row;
    const view = data.views?.[state.anim] ?? data;
    const [width, height] = view.field,
      pad = view.thickness;
    const [fieldX, fieldY] = view.offset ?? [0, 0];
    let x = fieldX, y = fieldY;
    const living = state.at;
    if (living || (this.reaction && this.selected === 'life')) {
      const anchor = living
        ? [living[0] * width, living[1] * height]
        : data.clips.life[Math.min(data.clips.life.length - 1, Math.floor(this.age * data.fps))];
      const origin = living && !state.anim.startsWith('walk_') ? data.origin : row;
      const targetX = feetX + anchor[0] - origin[0],
        targetY = feetY + anchor[1] - origin[1];
      x += Math.round(targetX) - Math.round(feetX);
      y += Math.round(targetY) - Math.round(feetY);
      feetY = targetY;
    }
    if (living) phase = state.tick;
    else if (typeof data.scene === 'string')
      phase = Math.floor((performance.now() * 24) / 1000) % border.phases;
    const signature = [state.anim, frame, phase, x, y].join('/');
    if (this.previous === signature) return;
    this.previous = signature;
    const [cw, ch] = view.canvas;
    if (ctx.canvas.width !== cw || ctx.canvas.height !== ch) {
      ctx.canvas.width = cw;
      ctx.canvas.height = ch;
      ctx.imageSmoothingEnabled = false;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, width, height);
    ctx.clip();
    scene.paint(ctx, phase, cw, ch);
    if (dx || dy) {
      ctx.save();
      ctx.translate(dx, dy);
      scene.paint(ctx, phase, cw, ch);
      ctx.restore();
    }
    const props = (front) => {
      for (const [depth, sprite, px, py] of scene.props)
        if (depth > feetY === front) scene.stamp(ctx, sprite, px + dx, py + dy);
    };
    props(false);
    const backdrop = row[10];
    if (backdrop) actor.stamp(ctx, backdrop[0], backdrop[1] + fieldX, backdrop[2] + fieldY);
    paintSceneryRays(ctx, data.sceneryRays?.[state.anim]?.[frame],
      pad + dx + fieldX, pad + dy + fieldY, x - fieldX, y - fieldY);
    for (const sprite of row.slice(5, 9))
      if (sprite) actor.stamp(ctx, sprite[0], sprite[1] + x, sprite[2] + y);
    props(true);
    ctx.restore();
    border.paint(ctx, phase, cw, ch);
    // Show/peek may reach over the painting frame in the original export.
    if (row[9]) actor.stamp(ctx, row[9][0], row[9][1] + x, row[9][2] + y);
    if (this.button.dataset.clip !== state.anim) {
      this.button.dataset.clip = state.anim;
      if (this === featured) refreshMood();
    }
    this.button.dataset.frame = frame;
    if (this === featured && heroVisible) copyToHero();
  }
}

const $ = (selector) => document.querySelector(selector);
const hero = $('.feature-painting'),
  heroCanvas = hero.querySelector('canvas');
const heroContext = heroCanvas.getContext('2d');
const players = [];
let featured,
  heroVisible = false;
function copyToHero() {
  const source = featured.ctx.canvas;
  if (heroCanvas.width !== source.width || heroCanvas.height !== source.height) {
    heroCanvas.width = source.width;
    heroCanvas.height = source.height;
  }
  heroContext.clearRect(0, 0, source.width, source.height);
  heroContext.drawImage(source, 0, 0);
  if (featured.button.dataset.clip) {
    hero.dataset.clip = featured.button.dataset.clip;
    hero.dataset.frame = featured.button.dataset.frame;
    if (featured.entry.runtime === 'f1') {
      hero.dataset.stage = featured.button.dataset.stage;
      hero.dataset.direction = featured.button.dataset.direction;
    }
  }
}
function releaseLater(player) {
  clearTimeout(player.releaseTimer);
  player.releaseTimer = setTimeout(() => {
    if (player.visible || (player === featured && heroVisible)) return;
    player.ticket = {};
    player.busy = false;
    player.surface = null;
    player.previous = null;
  }, 6000);
}
function selectFeatured(player, open = true) {
  if (featured && featured !== player && !featured.visible) releaseLater(featured);
  featured = player;
  clearTimeout(player.releaseTimer);
  hero.dataset.id = player.entry.id;
  hero.setAttribute('aria-busy', String(!player.surface));
  hero.setAttribute('aria-label', player.entry.name + ' — коснуться картины');
  delete hero.dataset.clip;
  delete hero.dataset.frame;
  delete hero.dataset.stage;
  delete hero.dataset.direction;
  copyToHero();
  controls();
  markSelection();
  if (open || player.visible || heroVisible) player.ensure();
}
function refreshMood() {
  const id = featured.button.dataset.clip;
  const text = featured.failed
    ? 'Не удалось загрузить. Коснитесь картины для повтора.'
    : !id
      ? 'Загрузка картины…'
      : (moods[id] ?? featured.entry.clips.find((clip) => clip.id === id)?.name);
  if ($('#mood').textContent !== text) $('#mood').textContent = text ?? 'Гуляет';
}
const directions = ['Восток', 'Юго-восток', 'Юг', 'Юго-запад', 'Запад', 'Северо-запад', 'Север', 'Северо-восток'];
function refreshKingControls() {
  const king = featured.entry.runtime === 'f1';
  $('#battle-controls').hidden = !king;
  if (!king) return;
  const living = featured.selected === 'life';
  $('#stage').value = living ? featured.pet?.stage ?? 1 : featured.manualStage;
  $('#next-stage').disabled = $('#stage').disabled = !featured.pet;
  for (const btn of $('#directions').children) {
    btn.disabled = !featured.pet;
    btn.setAttribute('aria-pressed', !living && Number(btn.dataset.direction) === featured.direction);
  }
}
function refreshControls() {
  refreshKingControls();
  $('#feature-title').textContent = featured.entry.name;
  $('.feature .rarity').textContent = rarityNames[featured.entry.rarity] + ' картина';
  for (const button of $('#clips').children)
    button.setAttribute('aria-pressed', button.dataset.clip === featured.selected);
  for (const button of $('#variants').children)
    button.setAttribute('aria-pressed', button.dataset.variant === featured.variant?.id);
  const happy = featured.has('happy'),
    trick = featured.trickClip;
  $('#gestures').hidden = !happy && !trick;
  $('#touch-hint').textContent = trick ? 'Одно касание — радость, два — трюк.' : 'Касание — радость.';
  $('.keyboard-hint').textContent = trick
    ? 'С клавиатуры используйте Enter и клавишу 2.'
    : 'С клавиатуры используйте Enter.';
  $('.actions').hidden = !featured.pet;
  $('#leave').disabled = $('#skill').disabled = !featured.pet;
  $('#skill').hidden = featured.entry.runtime === 'f1';
  $('#leave').textContent = featured.away ? 'Вернуться' : 'Уйти';
  $('#presence').textContent = !featured.away
    ? ''
    : featured.sleepAt === null
      ? 'Вы отошли. Питомец отдыхает.'
      : 'Вы отошли. Через 5 секунд питомец начнёт укладываться.';
  refreshMood();
}
function controls() {
  const entry = featured.entry;
  $('#clips').replaceChildren(
    ...entry.clips.map((clip) => {
      const button = buttonFor(clip.name, () => {
        featured.choose(clip.id);
        hero.scrollIntoView({ block: 'nearest' });
      });
      button.dataset.clip = clip.id;
      return button;
    }),
  );
  $('#variants').replaceChildren(
    ...(entry.variants ?? []).map((variant) => {
      const button = buttonFor(variant.name, () => {
        if (featured.variant?.id === variant.id) return;
        featured.assign(entry, variant, featured.selected);
        selectFeatured(featured);
        hero.scrollIntoView({ block: 'nearest' });
      });
      button.dataset.variant = variant.id;
      return button;
    }),
  );
  $('#variants').hidden = !entry.variants?.length;
  $('#variants').setAttribute('aria-label', entry.section === 'pets' ? 'Облик' : 'Части босса');
  refreshControls();
}

function archive(catalog) {
  for (const [section, title] of Object.entries(sections)) {
    const entries = catalog.filter((entry) => entry.section === section);
    const block = document.createElement('section');
    block.id = section;
    block.setAttribute('aria-labelledby', section + '-title');
    const collection = document.createElement('div');
    collection.className = 'collection';
    const isArchive = section === 'archive';
    const header = document.createElement(isArchive ? 'summary' : 'div');
    header.className = 'section-title';
    header.innerHTML = '<h2></h2><span></span>';
    if (isArchive) {
      const disclosure = document.createElement('details');
      disclosure.append(header, collection);
      block.append(disclosure);
    } else block.append(header, collection);
    const heading = block.querySelector('h2');
    heading.id = section + '-title';
    heading.textContent = title;
    block.querySelector('span').textContent = String(entries.length);
    for (const entry of entries) {
      const work = document.createElement('figure');
      work.className = 'work';
      work.style.setProperty('--wall', entry.color ?? wallColors[section]);
      work.innerHTML =
        '<div class="work-wall"><button type="button" class="painting" aria-busy="true">' +
        '<canvas width="180" height="148"></canvas></button></div><figcaption><h3></h3><small></small></figcaption>';
      const painting = new Painting(work.querySelector('button'), entry);
      players.push(painting);
      const select = buttonFor(entry.name, () => {
        selectFeatured(painting);
        hero.focus({ preventScroll: true });
        $('.feature').scrollIntoView({ block: 'start' });
      });
      select.className = 'select-work';
      select.dataset.select = entry.id;
      select.setAttribute('aria-label', 'Выбрать главную картину «' + entry.name + '»');
      work.querySelector('h3').append(select);
      work.querySelector('small').textContent = rarityNames[entry.rarity];
      collection.append(work);
    }
    $('#collection').append(block);
  }
}
function markSelection() {
  for (const button of document.querySelectorAll('.select-work')) {
    const current = button.dataset.select === featured.entry.id;
    button.closest('.work').classList.toggle('selected', current);
    if (current) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
}
function setAway(leaving, notify = true, player = featured) {
  synchronize(performance.now());
  if (player.selected !== 'life') player.choose('life');
  player.away = leaving;
  clearTimeout(player.sleepTimer);
  player.sleepAt = leaving ? performance.now() + 5000 : null;
  if (leaving) player.sleepTimer = setTimeout(() => synchronize(performance.now()), 5000);
  else if (notify) player.pet.event('owner_back');
  if (player === featured) refreshControls();
}
let previousTime;
function synchronize(now) {
  const start = previousTime ?? now;
  if (now < start) return;
  previousTime = now;
  for (const player of players) {
    if (!player.surface && !player.pet) continue;
    let from = start;
    if (player.sleepAt !== null && now >= player.sleepAt) {
      from = Math.max(start, player.sleepAt);
      player.draw(Math.min((from - start) / 1000, 60));
      player.pet.event('idle_owner');
      player.sleepAt = null;
      if (player === featured) refreshControls();
    }
    player.draw(Math.min((now - from) / 1000, player.pet ? 60 : 0.5));
  }
}
async function start() {
  const catalog = await json('./catalog.json');
  archive(catalog);
  selectFeatured(players.find((player) => player.entry.id === hero.dataset.id) ?? players[0], false);
  hero.addEventListener('click', () => featured.tap());
  hero.addEventListener('keydown', (event) => {
    if (event.key === '2' && featured.trickClip) {
      event.preventDefault();
      featured.interact('like');
    }
  });
  hero.addEventListener('focus', () => {
    if (hero.matches(':focus-visible') && !featured.away && featured.selected === 'life')
      featured.pet?.event('approach');
  });
  const byButton = new Map(players.map((p) => [p.button, p]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const isHero = entry.target === hero;
        const player = isHero ? featured : byButton.get(entry.target);
        if (isHero) heroVisible = entry.isIntersecting;
        else player.visible = entry.isIntersecting;
        clearTimeout(player.releaseTimer);
        if (player.visible || (player === featured && heroVisible)) {
          if (isHero && heroVisible && player.surface) copyToHero();
          player.ensure();
        } else releaseLater(player);
      }
    },
    { rootMargin: '64px' },
  );
  observer.observe(hero);
  players.forEach((player) => observer.observe(player.button));
  for (const [index, name] of directions.entries()) {
    const button = buttonFor('', () => featured.face(index));
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.style.transform = 'rotate(' + index * 45 + 'deg)';
    button.append(arrow);
    button.dataset.direction = index;
    button.title = name;
    button.setAttribute('aria-label', name);
    $('#directions').append(button);
  }
  $('#stage').addEventListener('change', (event) => featured.changeStage(Number(event.target.value)));
  $('#next-stage').addEventListener('click', () => featured.changeStage());
  $('#leave').addEventListener('click', () => setAway(!featured.away));
  $('#skill').addEventListener('click', () => {
    if (featured.selected !== 'life') featured.choose('life');
    if (featured.away) setAway(false);
    featured.pet.event('skill_ready');
  });
  document.addEventListener('visibilitychange', () => synchronize(performance.now()));
  function animate(now) {
    synchronize(now);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
start().catch((error) => {
  $('#mood').textContent = 'Не удалось загрузить каталог. Обновите страницу.';
  console.error(error);
});
