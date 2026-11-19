export async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status + ' ' + url);
  return response.json();
}

// One queue for every sprite page: the painting the viewer opened goes first (priority 0), paintings on screen
// next (1), the rest last. Six downloads at a time, so a newly opened painting never waits behind a whole wall.
const pending = [];
let running = 0;
function pump() {
  while (running < 6 && pending.length) {
    let best = 0;
    for (let i = 1; i < pending.length; i++) if (pending[i].priority() < pending[best].priority()) best = i;
    const [job] = pending.splice(best, 1);
    running++;
    job.run().finally(() => {
      running--;
      pump();
    });
  }
}
export function imagePage(url, priority = () => 1) {
  return new Promise((resolve, reject) => {
    pending.push({
      priority,
      run: async () => {
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          resolve(image);
        } catch (error) {
          reject(error);
        }
      },
    });
    pump();
  });
}

export function drawSprite(ctx, image, rect, x, y) {
  const [, sx, sy, width, height] = rect;
  ctx.drawImage(image, sx, sy, width, height, x, y, width, height);
}

async function textures(root, atlas, priority) {
  const pages = await Promise.all(atlas.pages.map((name) => imagePage(root + name, priority)));
  return (ctx, index, x, y) => {
    if (index < 0) return;
    const rect = atlas.rects[index];
    drawSprite(ctx, pages[rect[0]], rect, x, y);
  };
}

function buffer(width, height) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  return surface.getContext('2d');
}

// Unchanged tiles are shared by all 72 phases. Keep only a base and the current composite in memory.
export async function material(root, atlas, width, height, priority) {
  const stamp = await textures(root, atlas, priority);
  const base = buffer(width, height),
    active = buffer(width, height);
  const tile = atlas.tile,
    columns = Math.ceil(width / tile);
  const x = (i) => (i % columns) * tile,
    y = (i) => Math.floor(i / columns) * tile;
  atlas.base.forEach((id, i) => stamp(base, id, x(i), y(i)));
  let last = -1;
  return {
    stamp,
    props: atlas.props,
    phases: atlas.phases.length,
    paint(ctx, phase, destWidth = width, destHeight = height) {
      phase %= atlas.phases.length;
      if (phase !== last) {
        active.clearRect(0, 0, width, height);
        active.drawImage(base.canvas, 0, 0);
        for (const [i, sprite] of atlas.phases[phase]) {
          const left = x(i),
            top = y(i);
          active.clearRect(left, top, tile, tile);
          stamp(active, sprite, left, top);
        }
        last = phase;
      }
      ctx.drawImage(active.canvas, 0, 0, destWidth, destHeight);
    },
  };
}

const sharedMaterials = new Map();
export function sharedMaterial(url, width, height) {
  if (!sharedMaterials.has(url)) {
    const root = url.slice(0, url.lastIndexOf('/') + 1);
    const loading = json(url).then((data) => material(root, data, ...(data.canvas ?? [width, height])));
    sharedMaterials.set(
      url,
      loading.catch((error) => {
        sharedMaterials.delete(url);
        throw error;
      }),
    );
  }
  return sharedMaterials.get(url);
}
