import {createPetBehavior} from './behavior.mjs';

const initial = document.querySelector('.feature-painting').dataset.id;
const works = [
  [initial, 'Луговой исполин', 'Необычная', '#374638'],
  ['penguin_marshal', 'Пингвин-маршал', 'Обычная', '#435565'],
  ['bramble_warden', 'Ежевичный страж', 'Обычная', '#56644b'],
  ['gem_beetle', 'Самоцветный жук', 'Необычная', '#504b63'],
  ['storm_ram', 'Грозовой баран', 'Обычная', '#485c68'],
  ['silk_dragon', 'Шёлковый дракон', 'Редкая', '#866851'],
  ['frost_yeti', 'Йети Буран', 'Эпическая', '#526b73'],
  ['toad_shaman', 'Квакунья', 'Легендарная', '#4c614e'],
  ['crater_titan', 'Кратерный титан', 'Мифическая', '#68483c'],
  ['coin_dragon', 'Монетный дракон', 'Секретная', '#675a43'],
];
const moods = {
  idle: 'Отдыхает', fidget_a: 'Занят своим делом', fidget_b: 'Занят своим делом',
  look: 'Присматривается', happy: 'Радуется', trick: 'Показывает трюк', tired: 'Устал',
  sleep_in: 'Укладывается', sleep: 'Спит', sleep_out: 'Просыпается', wake_startled: 'Вздрогнул',
  hatch: 'Появляется', turn: 'Поворачивается',
};

function setCaption(work, id) {
  const [, name, rarity, color] = works.find(([key]) => key === id);
  work.style.setProperty('--wall', color);
  const select = work.querySelector('.select-work');
  select.textContent = name;
  select.setAttribute('aria-label', 'Выбрать главную картину «' + name + '»');
  work.querySelector('small').textContent = rarity;
}

function archive() {
  const gallery = document.querySelector('#paintings');
  document.querySelector('#work-count').textContent = (works.length - 1) + ' картин';
  for (const [id, name] of works) {
    if (id === initial) continue;
    const work = document.createElement('figure');
    work.className = 'work';
    work.innerHTML = '<div class="work-wall"><button type="button" class="painting" aria-busy="true">'
      + '<canvas width="180" height="148"></canvas></button></div><figcaption><h3><button type="button" class="select-work"></button></h3><small></small></figcaption>';
    const button = work.querySelector('button');
    button.dataset.id = id;
    button.setAttribute('aria-label', name + ' — коснуться картины');
    work.querySelector('canvas').textContent = name;
    setCaption(work, id);
    work.querySelector('.select-work').addEventListener('click', () => selectPainting(work));
    gallery.append(work);
  }
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status + ' ' + url);
  return response.json();
}

async function textures(root, atlas) {
  const pages = await Promise.all(atlas.pages.map(async filename => {
    const image = new Image();
    image.src = root + filename;
    await image.decode();
    return image;
  }));
  return (ctx, index, x, y) => {
    if (index < 0) return;
    const [page, sx, sy, width, height] = atlas.rects[index];
    ctx.drawImage(pages[page], sx, sy, width, height, x, y, width, height);
  };
}

function buffer(width, height) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  return surface.getContext('2d');
}

// Unchanged tiles are shared by all 72 phases. Keep only a base and the current composite in memory.
async function material(root, atlas, width, height) {
  const stamp = await textures(root, atlas);
  const base = buffer(width, height), active = buffer(width, height);
  const tile = atlas.tile, columns = Math.ceil(width / tile);
  const x = i => (i % columns) * tile, y = i => Math.floor(i / columns) * tile;
  atlas.base.forEach((id, i) => stamp(base, id, x(i), y(i)));
  let last = -1;
  return {
    stamp,
    paint(ctx, phase) {
      phase %= atlas.phases.length;
      if (phase !== last) {
        active.clearRect(0, 0, width, height);
        active.drawImage(base.canvas, 0, 0);
        for (const [i, sprite] of atlas.phases[phase]) {
          const left = x(i), top = y(i);
          active.clearRect(left, top, tile, tile);
          stamp(active, sprite, left, top);
        }
        last = phase;
      }
      ctx.drawImage(active.canvas, 0, 0);
    },
  };
}

const borders = new Map();
function borderFor(rarity, width, height) {
  if (!borders.has(rarity)) {
    const root = './atlases/frames/' + rarity + '/';
    borders.set(rarity, json(root + 'atlas.json').then(data => material(root, data, width, height))
      .catch(error => { borders.delete(rarity); throw error; }));
  }
  return borders.get(rarity);
}

async function loadPainting(player) {
  const root = './atlases/' + player.id + '/';
  const data = await json(root + 'atlas.json');
  const [width, height] = data.canvas;
  const [scene, border, actor, behavior] = await Promise.all([
    material(root, data.scene, width, height), borderFor(data.rarity, width, height),
    textures(root, data.actors), data.behavior ? json(root + 'behavior.json') : null,
  ]);
  const canvas = player.button.querySelector('canvas');
  canvas.width = width;
  canvas.height = height;
  if (behavior && !player.pet) player.pet = createPetBehavior(behavior, data.animations);
  player.surface = {data, scene, border, actor, ctx: canvas.getContext('2d')};
  player.button.setAttribute('aria-busy', 'false');
  if (player === featured) updateControls();
  if (player.pendingEvent) {
    player.interact(player.pendingEvent);
    player.pendingEvent = null;
  }
  player.draw();
}

function legacySample(player, dt) {
  const {data} = player.surface;
  if (player.happyAge !== null) {
    player.happyAge += dt;
    const frame = Math.floor(player.happyAge * data.fps);
    if (frame < data.clips.happy.length) return {anim: 'happy', frame};
    player.happyAge = null;
  }
  player.age = (player.age + dt) % (data.clips.life.length / data.fps);
  return {anim: 'life', frame: Math.floor(player.age * data.fps)};
}

class Painting {
  constructor(button) {
    this.button = button;
    this.id = button.dataset.id;
    this.age = 0;
    this.happyAge = null;
    this.visible = false;
    this.away = false;
    this.sleepAt = null;
    this.lastTap = -Infinity;
    button.addEventListener('click', () => {
      const now = performance.now();
      const double = now - this.lastTap < 350;
      this.lastTap = double ? -Infinity : now;
      const event = double ? 'like' : 'tap';
      if (!this.surface) {
        this.pendingEvent = event;
        this.ensure();
      } else this.interact(event);
    });
    button.addEventListener('focus', () => {
      if (this.pet && !this.away && button.matches(':focus-visible')) this.pet.event('approach');
    });
    button.addEventListener('keydown', event => {
      if (event.key === '2' && this.pet) {
        event.preventDefault();
        this.interact('like');
      }
    });
  }
  ensure() {
    if (this.surface || this.loading) return;
    this.loading = loadPainting(this).catch(error => {
      if (this === featured) setMood('Не удалось загрузить. Коснитесь картины для повтора.');
      console.error('Не удалось загрузить картину', this.id, error);
    }).finally(() => { this.loading = null; });
  }
  interact(name) {
    if (this.pet) {
      synchronize(performance.now());
      if (this.away) setAway(this, false, false);
      this.pet.event(name);
    } else if (this.surface?.data.clips.happy) {
      this.happyAge = 0;
    }
  }
  draw(dt = 0) {
    const live = this.pet?.advance(dt);
    if (!this.surface || !this.visible) return;
    const {data, ctx, scene, border, actor} = this.surface;
    const state = live || legacySample(this, dt);
    const frames = data.clips[state.anim];
    const frame = Math.min(state.frame, frames.length - 1), row = frames[frame];
    let [feetX, feetY, dx, dy, phase] = row;
    const [width, height] = data.field, pad = data.thickness;
    let offsetX = 0, offsetY = 0;
    if (live || state.anim === 'happy') {
      const anchor = live ? [live.at[0] * width, live.at[1] * height]
        : data.clips.life[Math.floor(this.age * data.fps)];
      // Non-walking clips already include their authored recoil or foot displacement.
      const origin = live && !state.anim.startsWith('walk_') ? data.origin : row;
      const targetX = feetX + anchor[0] - origin[0], targetY = feetY + anchor[1] - origin[1];
      // Round the displaced foot itself. Rounding its displacement first adds a pixel of jitter on recoil.
      offsetX = Math.round(targetX) - Math.round(feetX);
      offsetY = Math.round(targetY) - Math.round(feetY);
      feetY = targetY;
    }
    if (live) phase = live.tick % data.scene.phases.length;
    // Skip duplicate video frames between display refreshes.
    const signature = [state.anim, frame, phase, offsetX, offsetY].join('/');
    if (this.previous === signature) return;
    this.previous = signature;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, width, height);
    ctx.clip();
    scene.paint(ctx, phase);
    if (dx || dy) {
      ctx.save();
      ctx.translate(dx, dy);
      scene.paint(ctx, phase);
      ctx.restore();
    }
    const props = front => {
      for (const [depth, sprite, x, y] of data.scene.props)
        if ((depth > feetY) === front) scene.stamp(ctx, sprite, x + dx, y + dy);
    };
    props(false);
    for (let i = 5; i < row.length; i++) {
      const sprite = row[i];
      if (sprite) actor(ctx, sprite[0], sprite[1] + offsetX, sprite[2] + offsetY);
    }
    props(true);
    ctx.restore();
    border.paint(ctx, phase);
    if (this.button.dataset.clip !== state.anim) {
      this.button.dataset.clip = state.anim;
      if (this === featured) updateMood();
    }
  }
}

const mood = document.querySelector('#mood');
function setMood(text) { if (mood.textContent !== text) mood.textContent = text; }

function updateMood() {
  const clip = featured.button.dataset.clip;
  setMood(clip ? moods[clip] ?? (clip === 'life' || clip.startsWith('walk_') ? 'Гуляет' : 'Показывает приём')
    : 'Загрузка картины…');
}

function updateControls() {
  const legacy = featured.surface && !featured.pet;
  document.querySelector('#touch-hint').textContent = legacy ? 'Касание — радость.' : 'Одно касание — радость, два — трюк.';
  document.querySelector('.keyboard-hint').textContent = legacy ? 'С клавиатуры используйте Enter.' : 'С клавиатуры используйте Enter и клавишу 2.';
  const leave = document.querySelector('#leave');
  leave.disabled = !featured.pet;
  document.querySelector('#skill').disabled = !featured.pet;
  leave.textContent = featured.away ? 'Вернуться' : 'Уйти';
  document.querySelector('#presence').textContent = !featured.away ? ''
    : featured.sleepAt === null ? 'Вы отошли. Питомец отдыхает.' : 'Вы отошли. Через 5 секунд питомец начнёт укладываться.';
  updateMood();
}

function setAway(player, leaving, notify = true) {
  const now = performance.now();
  synchronize(now);
  player.away = leaving;
  clearTimeout(player.sleepTimer);
  player.sleepAt = leaving ? now + 5000 : null;
  if (leaving) player.sleepTimer = setTimeout(() => synchronize(performance.now()), 5000);
  else if (notify) player.pet.event('owner_back');
  if (player === featured) updateControls();
}

archive();
const players = new Map([...document.querySelectorAll('.painting')].map(button => [button, new Painting(button)]));
let featured = players.get(document.querySelector('.feature-painting'));

function selectPainting(work) {
  const button = work.querySelector('.painting'), previous = featured;
  const wall = document.querySelector('.feature .wall');
  featured = players.get(button);
  previous.button.classList.remove('feature-painting');
  previous.button.removeAttribute('aria-describedby');
  work.querySelector('.work-wall').append(previous.button);
  button.classList.add('feature-painting');
  button.setAttribute('aria-describedby', 'gestures');
  wall.append(button);
  setCaption(work, previous.id);
  const [, name, rarity] = works.find(([id]) => id === featured.id);
  document.querySelector('#feature-title').textContent = name;
  document.querySelector('.feature .rarity').textContent = rarity + ' картина';
  updateControls();
  clearTimeout(featured.releaseTimer);
  featured.ensure();
  button.focus({preventScroll: true});
  document.querySelector('.feature').scrollIntoView({block: 'start'});
}

document.querySelector('#leave').addEventListener('click', () => setAway(featured, !featured.away));
document.querySelector('#skill').addEventListener('click', () => {
  if (featured.away) setAway(featured, false);
  featured.pet.event('skill_ready');
});

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const player = players.get(entry.target);
    player.visible = entry.isIntersecting;
    clearTimeout(player.releaseTimer);
    if (player.visible) {
      if (player.pet && !player.away) player.pet.event('approach');
      player.ensure();
    } else if (player !== featured) {
      // The last frame stays on canvas. Release decoded sprite sheets after scrolling away.
      player.releaseTimer = setTimeout(() => { player.surface = null; player.previous = null; }, 6000);
    }
  }
}, {rootMargin: '64px'});
players.forEach(player => observer.observe(player.button));

let previousTime;
function synchronize(now) {
  const start = previousTime ?? now;
  if (now < start) return;
  previousTime = now;
  for (const player of players.values()) {
    if (!player.surface && !player.pet) continue;
    let from = start;
    if (player.sleepAt !== null && now >= player.sleepAt) {
      from = Math.max(start, player.sleepAt);
      player.draw(Math.min((from - start) / 1000, 60));
      player.pet.event('idle_owner');
      player.sleepAt = null;
      if (player === featured) updateControls();
    }
    // After a suspended tab, a minute covers every sleep/return transition.
    player.draw(Math.min((now - from) / 1000, player.pet ? 60 : .5));
  }
}
document.addEventListener('visibilitychange', () => synchronize(performance.now()));
function animate(now) {
  synchronize(now);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
